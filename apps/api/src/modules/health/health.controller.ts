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

    // Timeout wrapper — prevents infinite hang if port is blocked
    const withTimeout = <T>(promise: Promise<T>, ms: number, label: string) =>
      Promise.race([
        promise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
        ),
      ]);

    try {
      await withTimeout(this.prisma.$queryRaw`SELECT 1`, 7000, 'DB query');
      checks['database'] = 'ok';
    } catch (e: any) {
      checks['database'] = `error: ${e?.message ?? 'unknown'}`;
    }

    try {
      await withTimeout(this.redis.set('health:ping', 'pong', 5), 3000, 'Redis');
      checks['redis'] = 'ok';
    } catch (e: any) {
      checks['redis'] = `error: ${e?.message ?? 'unknown'}`;
    }

    const allOk = Object.values(checks).every((v) => v === 'ok');
    return {
      status: allOk ? 'ok' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('netcheck')
  @ApiOperation({ summary: 'Raw TCP connectivity test to Supabase' })
  async netcheck() {
    const net = await import('net');
    const dbUrl = process.env.DATABASE_URL ?? '';
    let host = 'unknown', originalPort = 'unknown';
    try {
      const u = new URL(dbUrl);
      host = u.hostname;
      originalPort = u.port;
    } catch { /**/ }

    const testPort = async (port: number): Promise<string> => {
      return new Promise((resolve) => {
        const socket = new net.Socket();
        const timer = setTimeout(() => {
          socket.destroy();
          resolve(`port ${port}: TIMEOUT (likely blocked by firewall)`);
        }, 5000);
        socket.connect(port, host, () => {
          clearTimeout(timer);
          socket.destroy();
          resolve(`port ${port}: OPEN ✅`);
        });
        socket.on('error', (e) => {
          clearTimeout(timer);
          resolve(`port ${port}: ERROR — ${e.message}`);
        });
      });
    };

    const [p5432, p6543] = await Promise.all([testPort(5432), testPort(6543)]);
    return {
      supabase_host: host,
      database_url_port: originalPort,
      connectivity: { p5432, p6543 },
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
