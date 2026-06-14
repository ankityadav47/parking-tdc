import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        status: true,
        emailVerifiedAt: true,
        createdAt: true,
        operatorProfile: {
          select: { id: true, companyName: true, payoutStatus: true, verifiedAt: true },
        },
        businessProfile: {
          select: { id: true, companyName: true, billingEmail: true },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(id: string, data: { fullName?: string; phone?: string }) {
    return this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, fullName: true, phone: true, role: true, status: true },
    });
  }

  // ─── Vehicles ─────────────────────────────────────────────────────────────

  async getVehicles(userId: string) {
    return this.prisma.vehicle.findMany({ where: { userId } });
  }

  async addVehicle(
    userId: string,
    data: { licensePlate: string; state: string; make?: string; model?: string; color?: string; isDefault?: boolean },
  ) {
    if (data.isDefault) {
      // Unset other defaults
      await this.prisma.vehicle.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }
    return this.prisma.vehicle.create({ data: { ...data, userId } });
  }

  async updateVehicle(id: string, userId: string, data: Partial<{ licensePlate: string; state: string; make: string; model: string; color: string; isDefault: boolean }>) {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id, userId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    if (data.isDefault) {
      await this.prisma.vehicle.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }
    return this.prisma.vehicle.update({ where: { id }, data });
  }

  async removeVehicle(id: string, userId: string) {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id, userId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    await this.prisma.vehicle.delete({ where: { id } });
  }

  // ─── Business Profile ─────────────────────────────────────────────────────

  async getBusinessProfile(userId: string) {
    return this.prisma.businessProfile.findUnique({ where: { userId } });
  }

  async upsertBusinessProfile(
    userId: string,
    data: { companyName: string; taxId?: string; billingEmail: string },
  ) {
    return this.prisma.businessProfile.upsert({
      where: { userId },
      create: { ...data, userId },
      update: data,
    });
  }
}
