import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { BookingsProcessor } from './bookings.processor';
import { FacilitiesModule } from '../facilities/facilities.module';

@Module({
  imports: [
    FacilitiesModule,
    BullModule.registerQueue({
      name: 'bookings',
    }),
  ],
  controllers: [BookingsController],
  providers: [BookingsService, BookingsProcessor],
  exports: [BookingsService],
})
export class BookingsModule {}
