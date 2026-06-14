import { Injectable, Inject } from '@nestjs/common';
import type { Redis } from 'ioredis';

@Injectable()
export class RedisService {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.redis.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.redis.set(key, value);
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length > 0) await this.redis.del(...keys);
  }

  async exists(key: string): Promise<boolean> {
    const count = await this.redis.exists(key);
    return count > 0;
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.redis.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  async incr(key: string): Promise<number> {
    return this.redis.incr(key);
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.redis.expire(key, seconds);
  }

  /** Store a hashed refresh token for a user */
  async storeRefreshToken(userId: string, tokenHash: string, ttlSeconds: number): Promise<void> {
    const key = `refresh:${userId}:${tokenHash}`;
    await this.set(key, '1', ttlSeconds);
  }

  async validateRefreshToken(userId: string, tokenHash: string): Promise<boolean> {
    return this.exists(`refresh:${userId}:${tokenHash}`);
  }

  async revokeRefreshToken(userId: string, tokenHash: string): Promise<void> {
    await this.del(`refresh:${userId}:${tokenHash}`);
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    const keys = await this.redis.keys(`refresh:${userId}:*`);
    if (keys.length > 0) await this.redis.del(...keys);
  }
}
