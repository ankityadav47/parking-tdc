import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getUsers(page = 1, limit = 20, search?: string) {
    const where = search
      ? { OR: [{ email: { contains: search } }, { fullName: { contains: search, mode: 'insensitive' as const } }] }
      : {};
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        select: { id: true, email: true, fullName: true, role: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { users, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async updateUser(id: string, data: { status?: string; role?: string }) {
    return this.prisma.user.update({
      where: { id },
      data: data as import('@prisma/client').Prisma.UserUpdateInput,
      select: { id: true, email: true, role: true, status: true },
    });
  }

  async getFacilities() {
    return this.prisma.facility.findMany({
      include: {
        operator: { include: { user: { select: { email: true, fullName: true } } } },
        photos: { where: { isCover: true }, take: 1 },
        amenities: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveFacility(id: string) {
    return this.prisma.facility.update({
      where: { id },
      data: { status: 'active' },
    });
  }

  async rejectFacility(id: string, reason: string) {
    // Could store rejection reason in a note field or audit log
    await this.prisma.auditLog.create({
      data: {
        action: 'facility.rejected',
        entityType: 'Facility',
        entityId: id,
        metadata: { reason },
      },
    });
    return this.prisma.facility.update({
      where: { id },
      data: { status: 'rejected' },
    });
  }

  async getAnalyticsOverview() {
    const [
      totalBookings,
      confirmedBookings,
      totalGmv,
      totalFacilities,
      totalUsers,
    ] = await Promise.all([
      this.prisma.reservation.count(),
      this.prisma.reservation.count({ where: { status: { in: ['confirmed', 'completed'] } } }),
      this.prisma.reservation.aggregate({
        where: { status: { in: ['confirmed', 'completed'] } },
        _sum: { totalCents: true },
      }),
      this.prisma.facility.count({ where: { status: 'active' } }),
      this.prisma.user.count(),
    ]);

    return {
      totalBookings,
      confirmedBookings,
      gmvCents: totalGmv._sum.totalCents || 0,
      activeFacilities: totalFacilities,
      totalUsers,
      conversionRate: totalBookings > 0 ? (confirmedBookings / totalBookings * 100).toFixed(1) : '0',
    };
  }

  async getBookings(page = 1, limit = 20, search?: string, status?: string) {
    const where: any = {};
    if (status && status !== 'all') where.status = status;
    if (search) {
      where.OR = [
        { id: { contains: search } },
        { driver: { fullName: { contains: search, mode: 'insensitive' } } },
      ];
    }
    const [reservations, total] = await Promise.all([
      this.prisma.reservation.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          driver: { select: { fullName: true, email: true } },
          facility: { select: { name: true, city: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.reservation.count({ where }),
    ]);
    return { reservations, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getMapProvider() {
    const val = await this.redis.get('app:settings:map_provider');
    return val || 'google';
  }

  async updateMapProvider(provider: 'google' | 'openfreemap') {
    await this.redis.set('app:settings:map_provider', provider);
  }
}
