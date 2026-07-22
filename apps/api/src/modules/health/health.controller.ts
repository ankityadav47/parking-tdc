import { Controller, Get, Patch, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../db/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { Pool } from 'pg';

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
    return { status: 'ok', timestamp: new Date().toISOString(), service: 'parkspot-api', version: '2' };
  }

  @Get('debug-prisma')
  @ApiOperation({ summary: 'Check Prisma Version and Test Live Connection' })
  async debugPrisma() {
    const { Prisma, PrismaClient } = require('@prisma/client');
    
    const results: any = {
      prismaVersion: Prisma.prismaVersion,
      envDATABASE_URL: process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':***@'),
    };

    try {
      let url = process.env.DATABASE_URL || '';
      if (url.includes(':6543') && url.includes('pooler.supabase.com')) {
        url = url.replace(':6543', ':5432');
      }

      const testPrisma = new PrismaClient({
        datasources: { db: { url } },
      });
      
      const start = Date.now();
      const res = await Promise.race([
        testPrisma.$queryRaw`SELECT 1 as val`,
        new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT_5S')), 5000))
      ]);
      results.testQuery = `Success in ${Date.now() - start}ms: ` + JSON.stringify(res);
      await testPrisma.$disconnect();
    } catch (err: any) {
      results.testQuery = `Error: ${err.message}`;
    }

    return results;
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

  @Get('dbtest')
  @ApiOperation({ summary: 'Raw pg.Pool connection test to find exact error' })
  async dbtest() {
    const rawUrl = process.env.DATABASE_URL ?? '';
    const results: Record<string, string> = {};

    const testPool = async (label: string, port: string, ssl: boolean) => {
      try {
        const u = new URL(rawUrl);
        u.port = port;
        const config: any = {
          connectionString: u.toString(),
          connectionTimeoutMillis: 5000,
        };
        if (ssl) {
          config.ssl = { rejectUnauthorized: false };
        }
        
        const pool = new Pool(config);
        const start = Date.now();
        const client = await pool.connect();
        const res = await client.query('SELECT 1 as val');
        client.release();
        await pool.end();
        results[label] = `✅ SUCCESS in ${Date.now() - start}ms (val=${res.rows[0]?.val})`;
      } catch (err: any) {
        results[label] = `❌ ERROR: ${err.message} (code: ${err.code})`;
      }
    };

    await testPool('port_5432_ssl_true', '5432', true);
    await testPool('port_6543_ssl_true', '6543', true);
    await testPool('port_5432_ssl_false', '5432', false);
    await testPool('port_6543_ssl_false', '6543', false);

    return {
      timestamp: new Date().toISOString(),
      raw_url_port: new URL(rawUrl).port,
      results,
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
