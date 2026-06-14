import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { FacilitiesService } from '../facilities/facilities.service';
import { BookingsService } from '../bookings/bookings.service';
import { PaymentsService } from '../payments/payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { PrismaService } from '../../db/prisma.service';

@ApiTags('operator')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('operator', 'admin')
@Controller({ path: 'operator', version: '1' })
export class OperatorController {
  constructor(
    private readonly facilitiesService: FacilitiesService,
    private readonly bookingsService: BookingsService,
    private readonly paymentsService: PaymentsService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Facilities ──────────────────────────────────────────────────────────

  @Get('facilities')
  async getMyFacilities(@Req() req: Request) {
    const user = req.user as { id: string };
    const op = await this.getOperatorProfile(user.id);
    return { data: await this.facilitiesService.getOperatorFacilities(op.id) };
  }

  @Post('facilities')
  async createFacility(@Req() req: Request, @Body() body: Record<string, unknown>) {
    const user = req.user as { id: string };
    const op = await this.getOperatorProfile(user.id);
    return { data: await this.facilitiesService.createFacility(op.id, body as Parameters<FacilitiesService['createFacility']>[1]) };
  }

  @Get('facilities/:id')
  async getFacility(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { id: string };
    await this.getOperatorProfile(user.id);
    const facility = await this.facilitiesService.getFacility(id, true);
    return { data: facility };
  }

  @Patch('facilities/:id')
  async updateFacility(@Req() req: Request, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    const user = req.user as { id: string };
    const op = await this.getOperatorProfile(user.id);
    return { data: await this.facilitiesService.updateFacility(id, op.id, body) };
  }

  @Post('facilities/:id/submit')
  async submitForReview(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { id: string };
    const op = await this.getOperatorProfile(user.id);
    return { data: await this.facilitiesService.submitForReview(id, op.id) };
  }

  @Post('facilities/:id/amenities')
  async updateAmenities(@Req() req: Request, @Param('id') id: string, @Body() body: Record<string, boolean>) {
    const user = req.user as { id: string };
    const op = await this.getOperatorProfile(user.id);
    return { data: await this.facilitiesService.updateAmenities(id, op.id, body) };
  }

  @Post('facilities/:id/rate-rules')
  async addRateRule(@Req() req: Request, @Param('id') facilityId: string, @Body() body: Record<string, unknown>) {
    const user = req.user as { id: string };
    const op = await this.getOperatorProfile(user.id);
    return { data: await this.facilitiesService.addRateRule(facilityId, op.id, body) };
  }

  @Patch('rate-rules/:id')
  async updateRateRule(@Req() req: Request, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    const user = req.user as { id: string };
    const op = await this.getOperatorProfile(user.id);
    return { data: await this.facilitiesService.updateRateRule(id, op.id, body) };
  }

  @Delete('rate-rules/:id')
  async deleteRateRule(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { id: string };
    const op = await this.getOperatorProfile(user.id);
    return { data: await this.facilitiesService.deleteRateRule(id, op.id) };
  }

  // ─── Reservations ────────────────────────────────────────────────────────

  @Get('reservations')
  async getReservations(@Req() req: Request) {
    const user = req.user as { id: string };
    return { data: await this.bookingsService.getOperatorReservations(user.id) };
  }

  @Post('reservations/:code/validate')
  async validatePass(@Req() req: Request, @Param('code') code: string) {
    const user = req.user as { id: string };
    const op = await this.getOperatorProfile(user.id);
    return { data: await this.bookingsService.validatePass(code, op.id) };
  }

  // ─── Earnings ────────────────────────────────────────────────────────────

  @Get('earnings')
  async getEarnings(@Req() req: Request) {
    const user = req.user as { id: string };
    return { data: await this.paymentsService.getEarnings(user.id) };
  }

  // ─── Helper ──────────────────────────────────────────────────────────────

  private async getOperatorProfile(userId: string) {
    const op = await this.prisma.operatorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!op) throw new Error('Operator profile not found');
    return op;
  }
}
