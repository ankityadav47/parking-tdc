import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);

    super({
      adapter,
      log: process.env.NODE_ENV === 'development'
        ? [{ emit: 'event', level: 'query' }, 'error', 'warn']
        : ['error'],
      errorFormat: 'minimal',
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected');
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
