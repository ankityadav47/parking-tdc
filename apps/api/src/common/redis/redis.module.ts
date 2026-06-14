import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: async (configService: ConfigService) => {
        const { default: Redis } = await import('ioredis');
        const client = new Redis(
          configService.get<string>('REDIS_URL') || 'redis://localhost:6379',
          {
            maxRetriesPerRequest: 3,
            enableReadyCheck: false,
            lazyConnect: false,
          },
        );
        client.on('error', (err) => console.error('Redis error:', err.message));
        client.on('connect', () => console.log('Redis connected'));
        return client;
      },
      inject: [ConfigService],
    },
    RedisService,
  ],
  exports: ['REDIS_CLIENT', RedisService],
})
export class RedisModule {}
