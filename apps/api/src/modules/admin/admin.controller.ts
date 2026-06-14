import { Controller, Get, Patch, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { PaymentsService } from '../payments/payments.service';
import { BookingsService } from '../bookings/bookings.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller({ path: 'admin', version: '1' })
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly paymentsService: PaymentsService,
    private readonly bookingsService: BookingsService,
  ) {}

  @Get('users')
  async getUsers(@Query('page') page = 1, @Query('limit') limit = 20, @Query('search') search?: string) {
    return this.adminService.getUsers(+page, +limit, search);
  }

  @Get('bookings')
  async getBookings(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return { data: await this.adminService.getBookings(+page, +limit, search, status) };
  }

  @Patch('users/:id')
  async updateUser(@Param('id') id: string, @Body() body: { status?: string; role?: string }) {
    return { data: await this.adminService.updateUser(id, body) };
  }

  @Get('facilities')
  async getFacilities() {
    return { data: await this.adminService.getFacilities() };
  }

  @Post('facilities/:id/approve')
  async approveFacility(@Param('id') id: string) {
    return { data: await this.adminService.approveFacility(id) };
  }

  @Post('facilities/:id/reject')
  async rejectFacility(@Param('id') id: string, @Body() body: { reason: string }) {
    return { data: await this.adminService.rejectFacility(id, body.reason) };
  }

  @Post('bookings/:id/refund')
  async refund(@Param('id') reservationId: string, @Body() body: { amountCents?: number }) {
    return { data: await this.paymentsService.createRefund(reservationId, body.amountCents) };
  }

  @Post('bookings/:id/cancel')
  async cancelBooking(@Param('id') id: string) {
    return { data: await this.bookingsService.cancelReservation(id, '', true) };
  }

  @Get('analytics/overview')
  async getAnalytics() {
    return { data: await this.adminService.getAnalyticsOverview() };
  }
}
