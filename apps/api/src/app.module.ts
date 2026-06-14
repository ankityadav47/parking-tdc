import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bullmq';

import { DatabaseModule } from './db/database.module';
import { RedisModule } from './common/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { FacilitiesModule } from './modules/facilities/facilities.module';
import { SearchModule } from './modules/search/search.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AdminModule } from './modules/admin/admin.module';
import { OperatorModule } from './modules/operator/operator.module';
import { HealthModule } from './modules/health/health.module';
import { appConfig, authConfig, razorpayConfig, mapsConfig, storageConfig } from './config/configuration';

import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    // ─── Config ──────────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, authConfig, razorpayConfig, mapsConfig, storageConfig],
      envFilePath: ['.env.local', '.env'],
    }),

    // ─── Rate limiting (global, Redis-backed) ─────────────────────────────────
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 20 },    // 20/s burst
      { name: 'medium', ttl: 60000, limit: 100 },  // 100/min
    ]),

    // ─── Scheduler (hold expiry, payout jobs) ────────────────────────────────
    ScheduleModule.forRoot(),

    // ─── BullMQ ──────────────────────────────────────────────────────────────
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          url: configService.get<string>('REDIS_URL') || 'redis://localhost:6379',
        },
      }),
    }),

    // ─── Events ───────────────────────────────────────────────────────────────
    EventEmitterModule.forRoot({ wildcard: false, maxListeners: 20 }),

    // ─── Infrastructure ───────────────────────────────────────────────────────
    DatabaseModule,
    RedisModule,

    // ─── Domain Modules ───────────────────────────────────────────────────────
    AuthModule,
    UsersModule,
    FacilitiesModule,
    SearchModule,
    BookingsModule,
    PaymentsModule,
    ReviewsModule,
    NotificationsModule,
    AdminModule,
    OperatorModule,
    HealthModule,
  ],
})
export class AppModule {}
