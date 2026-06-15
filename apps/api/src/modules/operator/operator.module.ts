import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { OperatorController } from './operator.controller';
import { FacilitiesModule } from '../facilities/facilities.module';
import { BookingsModule } from '../bookings/bookings.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    MulterModule.register({ storage: memoryStorage() }),
    FacilitiesModule,
    BookingsModule,
    PaymentsModule,
  ],
  controllers: [OperatorController],
})
export class OperatorModule { }
