import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { FacilitiesModule } from '../facilities/facilities.module';
import { PaymentsModule } from '../payments/payments.module';
import { BookingsModule } from '../bookings/bookings.module';
import { RedisModule } from '../../common/redis/redis.module';

@Module({
  imports: [FacilitiesModule, PaymentsModule, BookingsModule, RedisModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
