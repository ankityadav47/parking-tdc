import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';

@Processor('bookings')
export class BookingsProcessor extends WorkerHost {
  private readonly logger = new Logger(BookingsProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case 'expireHold':
        return this.handleExpireHold(job.data);
      case 'generatePass':
        return this.handleGeneratePass(job.data);
      case 'sendConfirmation':
        return this.handleSendConfirmation(job.data);
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  private async handleExpireHold(data: { reservationId: string }) {
    this.logger.log(`Processing hold expiry for reservation: ${data.reservationId}`);
    
    // We only expire if the status is still 'pending' and the hold time has passed
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: data.reservationId },
      select: { id: true, status: true, holdExpiresAt: true },
    });

    if (!reservation) return;
    
    if (reservation.status === 'pending') {
      if (reservation.holdExpiresAt && reservation.holdExpiresAt <= new Date()) {
        await this.prisma.reservation.update({
          where: { id: reservation.id },
          data: { status: 'expired' },
        });
        this.logger.log(`Expired hold for reservation ${reservation.id}`);
      } else {
        this.logger.log(`Hold for reservation ${reservation.id} is not yet expired or has been extended.`);
      }
    } else {
      this.logger.log(`Reservation ${reservation.id} is no longer pending (status: ${reservation.status}). No expiry needed.`);
    }
  }

  private async handleGeneratePass(data: { reservationId: string }) {
    // Already handled inline for now, but this is a placeholder for async pass generation
    this.logger.log(`Generating pass for ${data.reservationId}...`);
  }

  private async handleSendConfirmation(data: { reservationId: string }) {
    // Stub for email sending
    this.logger.log(`Sending confirmation email for reservation ${data.reservationId}...`);
  }
}
