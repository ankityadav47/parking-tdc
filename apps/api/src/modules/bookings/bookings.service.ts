import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';
import { PrismaService } from '../../db/prisma.service';
import { FacilitiesService } from '../facilities/facilities.service';
import { ReservationStatus } from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface CreateBookingData {
  facilityId: string;
  start: Date;
  end: Date;
  vehicleId?: string;
  businessProfileId?: string;
  promoCode?: string;
  idempotencyKey: string;
  driverId: string;
}

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly facilitiesService: FacilitiesService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    @InjectQueue('bookings') private readonly bookingsQueue: Queue,
  ) { }

  // ─── Create Booking (with no-oversell logic) ─────────────────────────────

  async createBooking(data: CreateBookingData) {
    const { facilityId, start, end, vehicleId, businessProfileId, promoCode, idempotencyKey, driverId } = data;

    // Validate window
    if (start >= end) throw new BadRequestException('end must be after start');
    if (start < new Date()) throw new BadRequestException('start must be in the future');

    // Idempotency check
    const existing = await this.prisma.reservation.findUnique({
      where: { idempotencyKey },
      include: { payment: true },
    });
    if (existing) return existing; // Return existing reservation for duplicate request

    // Fetch facility with rate rules
    const facility = await this.prisma.facility.findUnique({
      where: { id: facilityId },
      include: {
        rateRules: { where: { active: true }, orderBy: { priority: 'desc' } },
        amenities: true,
      },
    });

    if (!facility || facility.status !== 'active') {
      throw new NotFoundException('Facility not found or not available for booking');
    }

    // Compute price
    const basePriceCents = this.facilitiesService.resolvePrice(
      facility.rateRules,
      start,
      end,
    );
    if (basePriceCents === null) {
      throw new BadRequestException('No pricing available for this time window');
    }

    const platformFeePct = this.configService.get<number>('app.platformFeePct') || 0.15;
    const taxRate = this.configService.get<number>('app.taxRate') || 0.08;

    let discount = 0;
    if (promoCode) {
      discount = await this.applyPromoCode(promoCode, basePriceCents);
    }

    const serviceFeeCents = Math.round(basePriceCents * platformFeePct);
    const taxCents = Math.round((basePriceCents - discount) * taxRate);
    const totalCents = basePriceCents - discount + serviceFeeCents + taxCents;

    const holdExpiryMinutes = this.configService.get<number>('app.holdExpiryMinutes') || 10;
    const holdExpiresAt = new Date(Date.now() + holdExpiryMinutes * 60 * 1000);

    // ─── Critical Section: Capacity check + reserve ──────────────────────
    // We use a Prisma transaction with a raw SQL capacity check.
    // Postgres row-level lock on the facility ensures serialized access.

    const reservation = await this.prisma.$transaction(async (tx: any) => {
      // Lock the facility row
      await tx.$executeRaw`
        SELECT id FROM facilities WHERE id = ${facilityId} FOR UPDATE
      `;

      // Count overlapping active/pending reservations
      const overlappingReservations = await tx.reservation.findMany({
        where: {
          facilityId,
          status: { in: ['pending', 'confirmed'] },
          startAt: { lt: end },
          endAt: { gt: start },
        },
        select: { startAt: true, endAt: true }
      });

      let overlapping = 0;
      const events: { time: number; type: number }[] = [];
      for (const r of overlappingReservations) {
        const s = Math.max(r.startAt.getTime(), start.getTime());
        const e = Math.min(r.endAt.getTime(), end.getTime());
        if (s < e) {
          events.push({ time: s, type: 1 });
          events.push({ time: e, type: -1 });
        }
      }
      events.sort((a, b) => (a.time === b.time ? a.type - b.type : a.time - b.time));
      let current = 0;
      for (const ev of events) {
        current += ev.type;
        if (current > overlapping) overlapping = current;
      }

      // Check availability_blocks capacity overrides
      const blockResult = await tx.$queryRaw<[{ min_capacity: number | null }]>`
        SELECT MIN(COALESCE("capacityOverride", 0)) AS min_capacity
        FROM availability_blocks
        WHERE "facilityId" = ${facilityId}
          AND tstzrange("startAt", "endAt") && tstzrange(${start}::timestamptz, ${end}::timestamptz)
      `;
      const effectiveCapacity =
        blockResult[0].min_capacity !== null
          ? blockResult[0].min_capacity
          : facility.totalCapacity;

      if (overlapping >= effectiveCapacity) {
        throw new ConflictException({
          code: 'NO_CAPACITY',
          message: 'Sold out for selected window',
        });
      }

      // INSERT reservation
      return tx.reservation.create({
        data: {
          code: this.generateCode(),
          driverId,
          facilityId,
          vehicleId,
          businessProfileId,
          startAt: start,
          endAt: end,
          status: 'pending',
          holdExpiresAt,
          basePriceCents,
          serviceFeeCents,
          taxCents,
          totalCents,
          currency: 'USD',
          cancellationPolicy: this.buildCancellationPolicy(facility),
          idempotencyKey,
        },
      });
    });

    this.logger.log(`Reservation created: ${reservation.code} (${reservation.id})`);

    // Emit event for payment creation
    this.eventEmitter.emit('reservation.created', { reservation, facility });

    // Enqueue hold expiry job
    await this.bookingsQueue.add(
      'expireHold',
      { reservationId: reservation.id },
      { delay: holdExpiryMinutes * 60 * 1000 }
    );

    return reservation;
  }

  // ─── Confirm reservation (after payment webhook) ─────────────────────────

  async confirmReservation(reservationId: string, razorpayPaymentId: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { facility: true, vehicle: true, driver: true },
    });

    if (!reservation) throw new NotFoundException('Reservation not found');
    if (reservation.status === 'confirmed') return reservation; // Already confirmed (idempotent)

    const [updated] = await this.prisma.$transaction([
      this.prisma.reservation.update({
        where: { id: reservationId },
        data: { status: 'confirmed', holdExpiresAt: null },
      }),
      this.prisma.payment.update({
        where: { reservationId },
        data: { status: 'succeeded', razorpayPaymentId },
      }),
    ]);

    // Generate pass
    await this.generatePass(reservationId);

    this.eventEmitter.emit('reservation.confirmed', { reservation: updated });
    this.logger.log(`Reservation confirmed: ${reservation.code}`);

    // Enqueue background jobs for confirmation
    await this.bookingsQueue.add('sendConfirmation', { reservationId: updated.id });
    await this.bookingsQueue.add('generatePass', { reservationId: updated.id });

    return updated;
  }

  // ─── Cancel reservation ───────────────────────────────────────────────────

  async cancelReservation(reservationId: string, userId: string, isAdmin = false) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { payment: true },
    });

    if (!reservation) throw new NotFoundException('Reservation not found');

    if (!isAdmin && reservation.driverId !== userId) {
      throw new ForbiddenException('Not authorized to cancel this reservation');
    }

    if (!['pending', 'confirmed'].includes(reservation.status)) {
      throw new BadRequestException(`Cannot cancel reservation in status: ${reservation.status}`);
    }

    // Determine refund amount per cancellation policy
    const refundCents = this.calculateRefund(reservation);

    await this.prisma.reservation.update({
      where: { id: reservationId },
      data: { status: 'cancelled' },
    });

    this.eventEmitter.emit('reservation.cancelled', { reservation, refundCents });
    this.logger.log(`Reservation cancelled: ${reservation.code}, refund: ${refundCents} cents`);

    return { reservation, refundCents };
  }

  // ─── Get driver reservations ──────────────────────────────────────────────

  async getDriverReservations(driverId: string, status?: string) {
    return this.prisma.reservation.findMany({
      where: {
        driverId,
        ...(status && { status: status as ReservationStatus }),
      },
      include: {
        facility: { select: { name: true, city: true, state: true, addressLine1: true } },
        vehicle: { select: { licensePlate: true, state: true } },
        payment: { select: { status: true } },
        pass: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getReservation(id: string, userId: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        facility: true,
        vehicle: true,
        payment: true,
        pass: true,
      },
    });

    if (!reservation) throw new NotFoundException('Reservation not found');
    if (reservation.driverId !== userId) throw new ForbiddenException('Access denied');

    return reservation;
  }

  async getPass(reservationId: string, userId: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        facility: { select: { name: true, addressLine1: true, city: true, state: true, accessInstructions: true } },
        vehicle: { select: { licensePlate: true, state: true } },
        pass: true,
      },
    });

    if (!reservation) throw new NotFoundException('Reservation not found');
    if (reservation.driverId !== userId) throw new ForbiddenException('Access denied');
    if (reservation.status !== 'confirmed') throw new BadRequestException('No pass available yet');

    return {
      code: reservation.code,
      qrData: reservation.pass?.qrData,
      facility: {
        name: reservation.facility.name,
        address: `${reservation.facility.addressLine1}, ${reservation.facility.city}, ${reservation.facility.state}`,
        accessInstructions: reservation.facility.accessInstructions,
      },
      vehicle: reservation.vehicle
        ? { plate: reservation.vehicle.licensePlate, state: reservation.vehicle.state }
        : null,
      window: { start: reservation.startAt, end: reservation.endAt },
    };
  }

  // ─── Operator: validate a scanned pass ───────────────────────────────────

  async validatePass(code: string, operatorId: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { code },
      include: {
        facility: { select: { operatorId: true } },
        vehicle: true,
        driver: { select: { fullName: true, email: true } },
      },
    });

    if (!reservation) throw new NotFoundException('Pass not found');
    if (reservation.facility.operatorId !== operatorId) {
      throw new ForbiddenException('Not your facility');
    }

    const now = new Date();
    const valid =
      reservation.status === 'confirmed' &&
      reservation.startAt <= now &&
      reservation.endAt >= now;

    return {
      valid,
      reservation: {
        code: reservation.code,
        status: reservation.status,
        window: { start: reservation.startAt, end: reservation.endAt },
        vehicle: reservation.vehicle,
        driver: reservation.driver,
      },
    };
  }

  // ─── Background: expire stale holds ──────────────────────────────────────

  @Cron(CronExpression.EVERY_MINUTE)
  async expireStaleHolds() {
    const result = await this.prisma.reservation.updateMany({
      where: {
        status: 'pending',
        holdExpiresAt: { lt: new Date() },
      },
      data: { status: 'expired' },
    });

    if (result.count > 0) {
      this.logger.log(`Expired ${result.count} stale holds`);
    }
  }

  // ─── Background: auto-complete ended reservations ────────────────────────

  @Cron(CronExpression.EVERY_MINUTE)
  async completeEndedReservations() {
    const result = await this.prisma.reservation.updateMany({
      where: {
        status: 'confirmed',
        endAt: { lt: new Date() },
      },
      data: { status: 'completed' },
    });

    if (result.count > 0) {
      this.logger.log(`Auto-completed ${result.count} ended reservations`);
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private generateCode(): string {
    return 'PS-' + crypto.randomBytes(3).toString('hex').toUpperCase();
  }

  private buildCancellationPolicy(_facility: { name: string }) {
    return {
      freeCancelMinutes: 60 * 24, // 24h free cancel
      refundPct: 0.5,              // 50% refund after that
      noRefundMinutes: 60,         // no refund within 1h of start
    };
  }

  private calculateRefund(reservation: {
    basePriceCents: number;
    serviceFeeCents: number;
    taxCents: number;
    startAt: Date;
    cancellationPolicy: unknown;
  }): number {
    const policy = reservation.cancellationPolicy as {
      freeCancelMinutes: number;
      refundPct: number;
      noRefundMinutes: number;
    } | null;

    if (!policy) return 0;

    const minutesToStart = (reservation.startAt.getTime() - Date.now()) / 60000;

    if (minutesToStart >= policy.freeCancelMinutes) {
      // Full refund (base + fee + tax)
      return reservation.basePriceCents + reservation.serviceFeeCents + reservation.taxCents;
    }
    if (minutesToStart >= policy.noRefundMinutes) {
      // Partial refund
      return Math.round(reservation.basePriceCents * policy.refundPct);
    }
    return 0; // No refund
  }

  private async applyPromoCode(code: string, basePriceCents: number): Promise<number> {
    const promo = await this.prisma.promoCode.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!promo || !promo.active) return 0;
    if (promo.validFrom && promo.validFrom > new Date()) return 0;
    if (promo.validTo && promo.validTo < new Date()) return 0;
    if (promo.maxRedemptions && promo.usedCount >= promo.maxRedemptions) return 0;
    if (promo.minAmountCents && basePriceCents < promo.minAmountCents) return 0;

    // Atomically increment usage
    await this.prisma.promoCode.update({
      where: { code: code.toUpperCase() },
      data: { usedCount: { increment: 1 } },
    });

    if (promo.type === 'percent') {
      return Math.round(basePriceCents * (promo.value / 100));
    }
    return Math.min(promo.value, basePriceCents);
  }

  private async generatePass(reservationId: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      select: { code: true, facilityId: true, startAt: true },
    });
    if (!reservation) return;

    const qrData = `${reservation.code}|${reservation.facilityId}|${reservation.startAt.toISOString()}`;
    const qrCodeUrl = await QRCode.toDataURL(qrData);

    await this.prisma.pass.upsert({
      where: { reservationId },
      create: { reservationId, qrData, qrCodeUrl },
      update: { qrData, qrCodeUrl },
    });
  }

  async getOperatorReservations(operatorId: string) {
    const operatorProfile = await this.prisma.operatorProfile.findUnique({
      where: { userId: operatorId },
      select: { id: true },
    });
    if (!operatorProfile) throw new NotFoundException('Operator profile not found');

    return this.prisma.reservation.findMany({
      where: {
        facility: { operatorId: operatorProfile.id },
      },
      include: {
        facility: { select: { name: true } },
        driver: { select: { fullName: true, email: true } },
        vehicle: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
