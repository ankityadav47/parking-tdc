import { Module } from '@nestjs/common';
import { OperatorController } from './operator.controller';
import { FacilitiesModule } from '../facilities/facilities.module';
import { BookingsModule } from '../bookings/bookings.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [FacilitiesModule, BookingsModule, PaymentsModule],
  controllers: [OperatorController],
})
export class OperatorModule {}
