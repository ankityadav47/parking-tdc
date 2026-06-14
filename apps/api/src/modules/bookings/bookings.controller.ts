import {
  Controller, Get, Post, Body, Param, Query, Req, UseGuards, Headers, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'bookings', version: '1' })
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createBooking(
    @Req() req: Request,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() body: {
      facilityId: string;
      start: string;
      end: string;
      vehicleId?: string;
      businessProfileId?: string;
      promoCode?: string;
    },
  ) {
    const user = req.user as { id: string };
    const reservation = await this.bookingsService.createBooking({
      facilityId: body.facilityId,
      start: new Date(body.start),
      end: new Date(body.end),
      vehicleId: body.vehicleId,
      businessProfileId: body.businessProfileId,
      promoCode: body.promoCode,
      idempotencyKey: idempotencyKey || uuidv4(),
      driverId: user.id,
    });

    return { data: reservation };
  }

  @Get()
  async getMyBookings(@Req() req: Request, @Query('status') status?: string) {
    const user = req.user as { id: string };
    return { data: await this.bookingsService.getDriverReservations(user.id, status) };
  }

  @Get(':id')
  async getBooking(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { id: string };
    return { data: await this.bookingsService.getReservation(id, user.id) };
  }

  @Get(':id/pass')
  async getPass(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { id: string };
    return { data: await this.bookingsService.getPass(id, user.id) };
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelBooking(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { id: string };
    return { data: await this.bookingsService.cancelReservation(id, user.id) };
  }
}
