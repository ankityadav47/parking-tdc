import { Controller, Get, Patch, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../db/prisma.service';
import { RedisService } from '../../common/redis/redis.service';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Liveness check' })
  health() {
    return { status: 'ok', timestamp: new Date().toISOString(), service: 'parkspot-api' };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check (DB + Redis)' })
  async ready() {
    const checks: Record<string, string> = {};

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks['database'] = 'ok';
    } catch {
      checks['database'] = 'error';
    }

    try {
      await this.redis.set('health:ping', 'pong', 5);
      checks['redis'] = 'ok';
    } catch {
      checks['redis'] = 'error';
    }

    const allOk = Object.values(checks).every((v) => v === 'ok');
    return {
      status: allOk ? 'ok' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('config')
  @ApiOperation({ summary: 'Public application configuration' })
  async config() {
    const mapProvider = await this.redis.get('app:settings:map_provider');
    return {
      data: {
        mapProvider: mapProvider || 'google', // Default to google
      }
    };
  }

  @Patch('config')
  @ApiOperation({ summary: 'Update public application configuration' })
  async updateConfig(@Body() body: { mapProvider?: 'google' | 'openfreemap' }) {
    if (body.mapProvider) {
      await this.redis.set('app:settings:map_provider', body.mapProvider);
    }
    return { data: { success: true } };
  }
}
