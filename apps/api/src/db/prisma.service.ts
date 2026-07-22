import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // Strip Prisma-only URL params that native pg driver doesn't understand
    const rawUrl = process.env.DATABASE_URL!;
    const url = new URL(rawUrl);
    ['pgbouncer', 'connection_limit', 'pool_timeout', 'schema'].forEach(p =>
      url.searchParams.delete(p),
    );

    // Hostinger blocks port 6543 (Supabase PgBouncer transaction mode).
    // Auto-switch to port 5432 (session mode, same pooler host) — standard
    // PostgreSQL port that is not blocked by Hostinger's firewall.
    if (url.port === '6543' && url.hostname.includes('pooler.supabase.com')) {
      url.port = '5432';
    }

    // Prisma 6.7+ API: PrismaPg is a factory, takes config directly (not a pg.Pool)
    const adapter = new PrismaPg({ connectionString: url.toString() });

    super({
      adapter,
      log: process.env.NODE_ENV === 'development'
        ? [{ emit: 'event', level: 'query' }, 'error', 'warn']
        : ['error'],
      errorFormat: 'minimal',
    });
  }

  async onModuleInit() {
    // Non-blocking: connect in background so app.listen() is not delayed.
    // Hostinger kills startup if listen() isn't called within 3 seconds.
    this.$connect()
      .then(() => this.logger.log('Database connected'))
      .catch((err) => this.logger.error('Database connection failed', err));
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  /**
   * Geospatial: find facilities within radius, ordered by distance.
   * Returns raw rows with distance_m, lat, lng added.
   */
  async findFacilitiesInRadius(
    lat: number,
    lng: number,
    radiusMeters: number,
    limit = 50,
    offset = 0,
  ) {
    return this.$queryRaw<Array<{
      id: string;
      name: string;
      type: string;
      total_capacity: number;
      timezone: string;
      address_line1: string;
      city: string;
      state: string;
      avg_rating: number | null;
      review_count: number;
      distance_m: number;
      lat: number;
      lng: number;
    }>>`
      SELECT
        f.id,
        f.name,
        f.type,
        f."totalCapacity" AS total_capacity,
        f.timezone,
        f."addressLine1" AS address_line1,
        f.city,
        f.state,
        f."avgRating" AS avg_rating,
        f."reviewCount" AS review_count,
        ST_Y(f.location::geometry)                                     AS lat,
        ST_X(f.location::geometry)                                     AS lng,
        ST_Distance(f.location, ST_MakePoint(${lng}, ${lat})::geography) AS distance_m
      FROM facilities f
      WHERE f.status = 'active'
        AND ST_DWithin(
              f.location,
              ST_MakePoint(${lng}, ${lat})::geography,
              ${radiusMeters}
            )
      ORDER BY distance_m ASC
      LIMIT ${limit}
      OFFSET ${offset}
    `;
  }

  /**
   * Count overlapping active/pending reservations for a facility window.
   */
  async countOverlappingReservations(
    facilityId: string,
    start: Date,
    end: Date,
  ): Promise<number> {
    const result = await this.$queryRaw<[{ count: bigint }]>`
      SELECT count(*) AS count
      FROM reservations
      WHERE "facilityId" = ${facilityId}
        AND status IN ('pending', 'confirmed')
        AND tstzrange("startAt", "endAt") && tstzrange(${start}::timestamptz, ${end}::timestamptz)
    `;
    return Number(result[0].count);
  }

  /**
   * Set facility location (geography point).
   */
  async setFacilityLocation(facilityId: string, lat: number, lng: number) {
    await this.$executeRaw`
      UPDATE facilities
      SET location = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
          lat = ${lat},
          lng = ${lng}
      WHERE id = ${facilityId}
    `;
  }

}
