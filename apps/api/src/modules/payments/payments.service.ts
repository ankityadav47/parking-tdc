import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';
import Razorpay from 'razorpay';
import { PrismaService } from '../../db/prisma.service';
import { BookingsService } from '../bookings/bookings.service';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly razorpay: Razorpay;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly bookingsService: BookingsService,
    private readonly redis: RedisService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.razorpay = new Razorpay({
      key_id: this.configService.get<string>('razorpay.keyId') || '',
      key_secret: this.configService.get<string>('razorpay.keySecret') || '',
    });
  }

  // ─── Create Razorpay Order for a reservation ─────────────────────────────

  async createOrder(reservationId: string, driverId: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) throw new NotFoundException('Reservation not found');
    if (reservation.driverId !== driverId) throw new BadRequestException('Not your reservation');
    if (reservation.status !== 'pending') {
      throw new BadRequestException(`Reservation is in status: ${reservation.status}`);
    }

    // Convert USD cents to paise (INR). For production: handle multi-currency properly.
    // For now, treating cents as paise for demo.
    const amountInSmallestUnit = reservation.totalCents;

    try {
      const order = await this.razorpay.orders.create({
        amount: amountInSmallestUnit,
        currency: 'INR', // Razorpay supports INR, USD (for international)
        receipt: reservation.code,
        notes: {
          reservationId: reservation.id,
          driverId,
          facilityId: reservation.facilityId,
        },
      });

      // Persist payment record
      await this.prisma.payment.upsert({
        where: { reservationId },
        create: {
          reservationId,
          razorpayOrderId: order.id,
          amountCents: amountInSmallestUnit,
          currency: 'INR',
          status: 'requires_payment',
        },
        update: {
          razorpayOrderId: order.id,
          status: 'requires_payment',
        },
      });

      this.logger.log(`Razorpay order created: ${order.id} for reservation ${reservation.code}`);

      return {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        reservationId,
        reservationCode: reservation.code,
        keyId: this.configService.get<string>('razorpay.keyId'),
      };
    } catch (error) {
      this.logger.error('Failed to create Razorpay order', error);
      throw new InternalServerErrorException('Payment initialization failed');
    }
  }

  // ─── Verify payment signature (client-side confirmation) ─────────────────

  async verifyPayment(data: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = data;
    const keySecret = this.configService.get<string>('razorpay.keySecret') || '';

    // Verify signature
    const body = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      throw new BadRequestException('Invalid payment signature');
    }

    // Find and confirm reservation
    const payment = await this.prisma.payment.findUnique({
      where: { razorpayOrderId },
    });

    if (!payment) throw new NotFoundException('Payment record not found');
    if (payment.status === 'succeeded') return { message: 'Already confirmed' }; // Idempotent

    await this.bookingsService.confirmReservation(payment.reservationId, razorpayPaymentId);
    this.logger.log(`Payment verified: ${razorpayPaymentId} → reservation confirmed`);

    return { message: 'Payment confirmed, reservation is active' };
  }

  // ─── Webhook handler (Razorpay → server) ─────────────────────────────────

  async handleWebhook(rawBody: Buffer, signature: string) {
    const webhookSecret = this.configService.get<string>('razorpay.webhookSecret') || '';

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = JSON.parse(rawBody.toString()) as {
      event: string;
      payload: {
        payment?: { entity: { id: string; order_id: string; status: string } };
        refund?: { entity: { id: string; payment_id: string; amount: number; status: string } };
      };
    };

    // Idempotency: skip if already processed
    const eventId = `webhook:${event.event}:${event.payload.payment?.entity.id || event.payload.refund?.entity.id}`;
    const processed = await this.redis.exists(eventId);
    if (processed) {
      this.logger.log(`Webhook already processed: ${eventId}`);
      return;
    }
    await this.redis.set(eventId, '1', 86400); // 24h dedup

    this.logger.log(`Webhook received: ${event.event}`);

    switch (event.event) {
      case 'payment.captured': {
        const payment = event.payload.payment?.entity;
        if (!payment) break;

        const dbPayment = await this.prisma.payment.findUnique({
          where: { razorpayOrderId: payment.order_id },
        });

        if (dbPayment && dbPayment.status !== 'succeeded') {
          await this.bookingsService.confirmReservation(dbPayment.reservationId, payment.id);
        }
        break;
      }

      case 'payment.failed': {
        const payment = event.payload.payment?.entity;
        if (!payment) break;

        const dbPayment = await this.prisma.payment.findUnique({
          where: { razorpayOrderId: payment.order_id },
        });

        if (dbPayment) {
          await this.prisma.$transaction([
            this.prisma.payment.update({
              where: { id: dbPayment.id },
              data: { status: 'failed' },
            }),
            this.prisma.reservation.updateMany({
              where: { id: dbPayment.reservationId, status: 'pending' },
              data: { status: 'cancelled' },
            }),
          ]);
        }

        this.eventEmitter.emit('payment.failed', { orderId: payment.order_id });
        break;
      }

      case 'refund.created': {
        const refund = event.payload.refund?.entity;
        if (!refund) break;

        const dbPayment = await this.prisma.payment.findFirst({
          where: { razorpayPaymentId: refund.payment_id },
        });

        if (dbPayment) {
          await this.prisma.refund.upsert({
            where: { razorpayRefundId: refund.id },
            create: {
              paymentId: dbPayment.id,
              razorpayRefundId: refund.id,
              amountCents: refund.amount,
              status: refund.status,
            },
            update: { status: refund.status },
          });

          await this.prisma.payment.update({
            where: { id: dbPayment.id },
            data: { status: 'refunded' },
          });
        }
        break;
      }

      default:
        this.logger.log(`Unhandled webhook event: ${event.event}`);
    }
  }

  // ─── Refund ───────────────────────────────────────────────────────────────

  async createRefund(reservationId: string, amountCents?: number) {
    const payment = await this.prisma.payment.findUnique({
      where: { reservationId },
    });

    if (!payment || !payment.razorpayPaymentId) {
      throw new NotFoundException('Payment not found or not captured');
    }

    try {
      const refund = await this.razorpay.payments.refund(payment.razorpayPaymentId, {
        amount: amountCents || payment.amountCents,
        speed: 'normal',
        notes: { reason: 'Customer requested refund' },
      });

      await this.prisma.refund.create({
        data: {
          paymentId: payment.id,
          razorpayRefundId: refund.id,
          amountCents: typeof refund.amount === 'number' ? refund.amount : amountCents || payment.amountCents,
          status: 'pending',
        },
      });

      this.logger.log(`Refund created: ${refund.id} for reservation ${reservationId}`);
      return refund;
    } catch (error) {
      this.logger.error('Refund failed', error);
      throw new InternalServerErrorException('Refund failed');
    }
  }

  // ─── Operator earnings ────────────────────────────────────────────────────

  async getEarnings(operatorId: string) {
    const operatorProfile = await this.prisma.operatorProfile.findUnique({
      where: { userId: operatorId },
      select: { id: true },
    });
    if (!operatorProfile) throw new NotFoundException('Operator profile not found');

    const result = await this.prisma.$queryRaw<Array<{
      total_revenue: bigint;
      platform_fee: bigint;
      net_earnings: bigint;
      booking_count: bigint;
    }>>`
      SELECT
        SUM(r."basePriceCents")    AS total_revenue,
        SUM(r."serviceFeeCents")   AS platform_fee,
        SUM(r."basePriceCents" - r."serviceFeeCents") AS net_earnings,
        COUNT(r.id)                AS booking_count
      FROM reservations r
      JOIN facilities f ON f.id = r."facilityId"
      WHERE f."operatorId" = ${operatorProfile.id}
        AND r.status IN ('confirmed', 'completed')
    `;

    return {
      totalRevenueCents: Number(result[0]?.total_revenue || 0),
      platformFeeCents: Number(result[0]?.platform_fee || 0),
      netEarningsCents: Number(result[0]?.net_earnings || 0),
      bookingCount: Number(result[0]?.booking_count || 0),
    };
  }
}
