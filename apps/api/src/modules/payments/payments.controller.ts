import {
  Controller, Post, Body, Param, Req, UseGuards, HttpCode, HttpStatus, Headers, RawBodyRequest,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('payments')
@Controller({ path: 'payments', version: '1' })
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /** Create a Razorpay order for a pending reservation */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('reservations/:id/order')
  @HttpCode(HttpStatus.CREATED)
  async createOrder(@Req() req: Request, @Param('id') reservationId: string) {
    const user = req.user as { id: string };
    return { data: await this.paymentsService.createOrder(reservationId, user.id) };
  }

  /** Verify payment signature after client-side Razorpay checkout */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifyPayment(
    @Body() body: {
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    },
  ) {
    return { data: await this.paymentsService.verifyPayment(body) };
  }

  /** Razorpay webhook endpoint — raw body required for signature verification */
  @Post('webhooks/razorpay')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody) return { received: false };
    await this.paymentsService.handleWebhook(rawBody, signature);
    return { received: true };
  }
}
