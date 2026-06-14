import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class FacilitiesService {
  private readonly logger = new Logger(FacilitiesService.name);
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async createFacility(operatorId: string, data: {
    name: string;
    description?: string;
    type: 'garage' | 'lot' | 'valet';
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
    timezone: string;
    totalCapacity: number;
    heightClearanceCm?: number;
    accessInstructions?: string;
    lat: number;
    lng: number;
  }) {
    const { lat, lng, ...rest } = data;

    const facility = await this.prisma.facility.create({
      data: {
        ...rest,
        country: rest.country || 'US',
        operatorId,
        amenities: { create: {} }, // default all false
      },
      include: { amenities: true },
    });

    // Set PostGIS location
    await this.prisma.setFacilityLocation(facility.id, lat, lng);
    this.logger.log(`Facility created: ${facility.id} by operator ${operatorId}`);
    return facility;
  }

  async getFacility(id: string, includePrivate = false) {
    const cacheKey = `facility:${id}`;
    if (!includePrivate) {
      const cached = await this.redis.getJson(cacheKey);
      if (cached) return cached;
    }

    const facility = await this.prisma.facility.findUnique({
      where: { id },
      include: {
        amenities: true,
        photos: { orderBy: { sortOrder: 'asc' } },
        rateRules: { where: { active: true }, orderBy: { priority: 'desc' } },
        operator: { select: { companyName: true } },
      },
    });

    if (!facility) throw new NotFoundException('Facility not found');

    if (!includePrivate) {
      await this.redis.setJson(cacheKey, facility, this.CACHE_TTL);
    }

    return facility;
  }

  async getOperatorFacilities(operatorId: string) {
    return this.prisma.facility.findMany({
      where: { operatorId },
      include: { 
        amenities: true, 
        photos: { where: { isCover: true }, take: 1 },
        _count: {
          select: {
            reservations: {
              where: {
                status: { in: ['pending', 'confirmed', 'completed'] }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateFacility(id: string, operatorId: string, data: Record<string, unknown>) {
    await this.assertOwnership(id, operatorId);
    const { lat, lng, ...rest } = data as { lat?: number; lng?: number } & Record<string, unknown>;

    const facility = await this.prisma.facility.update({ where: { id }, data: rest });

    if (typeof lat === 'number' && typeof lng === 'number') {
      await this.prisma.setFacilityLocation(id, lat, lng);
    }

    await this.redis.del(`facility:${id}`);
    return facility;
  }

  async submitForReview(id: string, operatorId: string) {
    await this.assertOwnership(id, operatorId);
    return this.prisma.facility.update({
      where: { id },
      data: { status: 'pending_review' },
    });
  }

  async updateAmenities(facilityId: string, operatorId: string, data: Record<string, boolean>) {
    await this.assertOwnership(facilityId, operatorId);
    await this.redis.del(`facility:${facilityId}`);
    return this.prisma.facilityAmenity.upsert({
      where: { facilityId },
      create: { facilityId, ...data },
      update: data,
    });
  }

  async addRateRule(facilityId: string, operatorId: string, data: Record<string, unknown>) {
    await this.assertOwnership(facilityId, operatorId);
    await this.redis.del(`facility:${facilityId}`);
    return this.prisma.rateRule.create({
      data: { facilityId, ...data } as unknown as import('@prisma/client').Prisma.RateRuleCreateInput,
    });
  }

  async updateRateRule(id: string, operatorId: string, data: Record<string, unknown>) {
    const rule = await this.prisma.rateRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('Rate rule not found');
    await this.assertOwnership(rule.facilityId, operatorId);
    await this.redis.del(`facility:${rule.facilityId}`);
    return this.prisma.rateRule.update({ where: { id }, data });
  }

  async deleteRateRule(id: string, operatorId: string) {
    const rule = await this.prisma.rateRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('Rate rule not found');
    await this.assertOwnership(rule.facilityId, operatorId);
    await this.redis.del(`facility:${rule.facilityId}`);
    return this.prisma.rateRule.delete({ where: { id } });
  }

  async addAvailabilityBlock(facilityId: string, operatorId: string, data: {
    startAt: Date; endAt: Date; capacityOverride?: number; reason?: string;
  }) {
    await this.assertOwnership(facilityId, operatorId);
    return this.prisma.availabilityBlock.create({ data: { facilityId, ...data } });
  }

  async getPublicFacility(id: string) {
    const facility = await this.getFacility(id);
    // getFacility may return cached JSON; access status safely
    const status = (facility as { status?: string }).status;
    if (status !== 'active') throw new NotFoundException('Facility not found');
    return facility;
  }

  /**
   * Resolve the price for a given window using rate_rules.
   * Returns priceCents for the window, or null if no matching rule.
   */
  resolvePrice(
    rateRules: Array<{
      rateType: string;
      priceCents: number;
      minMinutes: number | null;
      maxMinutes: number | null;
      priority: number;
    }>,
    start: Date,
    end: Date,
  ): number | null {
    const durationMinutes = (end.getTime() - start.getTime()) / 60000;

    const matching = rateRules
      .filter((r) => {
        if (r.minMinutes && durationMinutes < r.minMinutes) return false;
        if (r.maxMinutes && durationMinutes > r.maxMinutes) return false;
        return true;
      })
      .sort((a, b) => b.priority - a.priority);

    if (!matching.length) return null;
    const rule = matching[0];

    if (rule.rateType === 'hourly') {
      return Math.ceil((durationMinutes / 60) * rule.priceCents);
    }
    if (rule.rateType === 'daily') {
      return Math.ceil((durationMinutes / (60 * 24)) * rule.priceCents);
    }
    return rule.priceCents; // flat / event
  }

  private async assertOwnership(facilityId: string, operatorId: string) {
    const facility = await this.prisma.facility.findUnique({
      where: { id: facilityId },
      select: { operatorId: true },
    });
    if (!facility) throw new NotFoundException('Facility not found');
    if (facility.operatorId !== operatorId) {
      throw new ForbiddenException('You do not own this facility');
    }
  }
}
