import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../db/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { FacilitiesService } from '../facilities/facilities.service';

interface SearchOptions {
  lat?: number;
  lng?: number;
  address?: string;
  start: Date;
  end: Date;
  radiusMeters?: number;
  sort?: 'distance' | 'price' | 'rating';
  page?: number;
  limit?: number;
  filters?: {
    evCharging?: boolean;
    covered?: boolean;
    adaAccessible?: boolean;
    valet?: boolean;
    type?: string;
  };
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly CACHE_TTL = 60; // 60 seconds for search results

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
    private readonly facilitiesService: FacilitiesService,
  ) {}

  async search(options: SearchOptions) {
    let { lat, lng } = options;
    const {
      address,
      start,
      end,
      radiusMeters = 50000,
      sort = 'distance',
      page = 1,
      limit = 20,
      filters = {},
    } = options;

    // Geocode address if no coordinates
    if (!lat || !lng) {
      if (!address) throw new BadRequestException('Provide lat/lng or address');
      const coords = await this.geocodeAddress(address);
      lat = coords.lat;
      lng = coords.lng;
    }

    // Build cache key (grid-snapped to ~110m + time bucket + filters)
    const cacheKey = this.buildCacheKey(lat, lng, start, end, radiusMeters, filters, sort);
    // NOTE: Cache disabled to prevent stale results during development
    // const cached = await this.redis.getJson<{ results: unknown[]; meta: unknown }>(cacheKey);
    // if (cached) {
    //   this.logger.debug(`Cache hit: ${cacheKey}`);
    //   return cached;
    // }

    // PostGIS radius query
    const candidates = await this.prisma.findFacilitiesInRadius(
      lat,
      lng,
      radiusMeters,
      limit * 5, // fetch more to filter
      0,
    );

    // Get bookings overlap for each candidate
    const candidateIds = candidates.map((c: any) => c.id);

    const overlappingReservations = candidateIds.length > 0
      ? await this.prisma.reservation.findMany({
          where: {
            facilityId: { in: candidateIds },
            status: { in: ['pending', 'confirmed'] },
            startAt: { lt: end },
            endAt: { gt: start }
          },
          select: { facilityId: true, startAt: true, endAt: true }
        })
      : [];

    const overlapMap = new Map<string, number>();

    if (overlappingReservations.length > 0) {
      // Group reservations by facility
      const resByFacility = new Map<string, Array<{start: number, end: number}>>();
      for (const res of overlappingReservations) {
        if (!resByFacility.has(res.facilityId)) {
          resByFacility.set(res.facilityId, []);
        }
        resByFacility.get(res.facilityId)!.push({
          start: Math.max(start.getTime(), res.startAt.getTime()),
          end: Math.min(end.getTime(), res.endAt.getTime())
        });
      }

      // Calculate max concurrent reservations for each facility
      for (const [facilityId, reservations] of resByFacility.entries()) {
        const events: { time: number; type: number }[] = [];
        for (const r of reservations) {
          if (r.start < r.end) {
            events.push({ time: r.start, type: 1 });
            events.push({ time: r.end, type: -1 });
          }
        }
        
        // Sort events: chronologically, then process departures (-1) before arrivals (1) to accurately calculate peak
        events.sort((a, b) => {
          if (a.time === b.time) return a.type - b.type;
          return a.time - b.time;
        });

        let maxOverlap = 0;
        let currentOverlap = 0;
        for (const e of events) {
          currentOverlap += e.type;
          if (currentOverlap > maxOverlap) maxOverlap = currentOverlap;
        }
        overlapMap.set(facilityId, maxOverlap);
      }
    }

    // Get amenities + photos for candidates
    const amenitiesMap = await this.loadAmenities(candidateIds);
    const photosMap = await this.loadCoverPhotos(candidateIds);
    const rateRulesMap = await this.loadRateRules(candidateIds);

    // Build results
    let results = candidates
      .map((c: any) => {
        // If total_capacity is 0, treat as unlimited (facility not configured yet)
        const capacity = c.total_capacity || 999;
        const spotsLeft = capacity - (overlapMap.get(c.id) || 0);
        if (spotsLeft <= 0) return null;

        const amenities = amenitiesMap.get(c.id);
        if (filters.evCharging && !amenities?.evCharging) return null;
        if (filters.covered && !amenities?.covered) return null;
        if (filters.adaAccessible && !amenities?.adaAccessible) return null;
        if (filters.valet && !amenities?.valet) return null;

        const rateRules = rateRulesMap.get(c.id) || [];
        const priceCents = this.facilitiesService.resolvePrice(rateRules, start, end);

        const walkMinutes = Math.ceil((c.distance_m / 80) / 60); // ~80m/min walking

        return {
          id: c.id,
          facilityId: c.id,
          name: c.name,
          type: c.type,
          distanceMeters: Math.round(c.distance_m),
          walkMinutes,
          lat: Number(c.lat),
          lng: Number(c.lng),
          coordinates: { lat: Number(c.lat), lng: Number(c.lng) },
          addressLine1: c.address_line1,
          city: c.city,
          state: c.state,
          address: `${c.address_line1}, ${c.city}, ${c.state}`,
          priceCents: priceCents || 0,
          rateRules: rateRules.map((r: any) => ({ priceCents: r.priceCents, rateType: r.rateType })),
          currency: 'INR',
          available: true,
          spotsLeft,
          totalCapacity: c.total_capacity,
          avgRating: c.avg_rating ? Number(c.avg_rating) : null,
          reviewCount: c.review_count,
          amenities: amenities ? this.formatAmenities(amenities) : [],
          coverPhotoUrl: photosMap.get(c.id) || null,
        };
      })
      .filter(Boolean);

    // Sort
    if (sort === 'price') {
      results.sort((a: any, b: any) => (a!.priceCents || 0) - (b!.priceCents || 0));
    } else if (sort === 'rating') {
      results.sort((a: any, b: any) => (b!.avgRating || 0) - (a!.avgRating || 0));
    }
    // distance is already sorted by PostGIS

    const total = results.length;
    const startIdx = (page - 1) * limit;
    results = results.slice(startIdx, startIdx + limit);

    const response = {
      results,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        searchCenter: { lat, lng },
      },
    };

    // Cache results
    await this.redis.setJson(cacheKey, response, this.CACHE_TTL);
    return response;
  }

  async autocomplete(q: string) {
    const serverKey = this.configService.get<string>('maps.serverKey');
    if (!serverKey) return { predictions: [] };

    // Check cache
    const cacheKey = `autocomplete:${q.toLowerCase().trim()}`;
    const cached = await this.redis.getJson(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(
        'https://maps.googleapis.com/maps/api/place/autocomplete/json',
        {
          params: { input: q, key: serverKey, types: 'geocode|establishment', language: 'en' },
        },
      );
      const result = { predictions: response.data.predictions };
      await this.redis.setJson(cacheKey, result, 300); // 5-min cache
      return result;
    } catch (error) {
      this.logger.error('Places autocomplete failed', error);
      return { predictions: [] };
    }
  }

  async geocodeAddress(address: string): Promise<{ lat: number; lng: number }> {
    // Check geocoding cache
    const cacheKey = `geo:${address.toLowerCase().trim()}`;
    const cached = await this.redis.getJson<{ lat: number; lng: number }>(cacheKey);
    if (cached) return cached;

    const serverKey = this.configService.get<string>('maps.serverKey');

    // Try Google Maps first (if key available)
    if (serverKey) {
      try {
        const response = await axios.get(
          'https://maps.googleapis.com/maps/api/geocode/json',
          { params: { address, key: serverKey } },
        );

        if (response.data.status === 'OK' && response.data.results.length) {
          const { lat, lng } = response.data.results[0].geometry.location;
          const result = { lat, lng };
          await this.redis.setJson(cacheKey, result, 7 * 24 * 3600);
          return result;
        }
      } catch (error) {
        this.logger.warn('Google geocoding failed, falling back to Nominatim');
      }
    }

    // Fallback: OpenStreetMap Nominatim (completely free, no key needed)
    try {
      this.logger.log(`Geocoding via Nominatim: ${address}`);
      const response = await axios.get(
        'https://nominatim.openstreetmap.org/search',
        {
          params: { q: address, format: 'json', limit: 1 },
          headers: { 'User-Agent': 'ParkSpot/1.0 (parking-app)' },
        },
      );

      if (!response.data || response.data.length === 0) {
        throw new BadRequestException('Could not geocode address: ' + address);
      }

      const result = {
        lat: parseFloat(response.data[0].lat),
        lng: parseFloat(response.data[0].lon),
      };

      // Cache geocoding results for a long time
      await this.redis.setJson(cacheKey, result, 7 * 24 * 3600);
      return result;
    } catch (error: unknown) {
      if ((error as { status?: number }).status === 400) throw error;
      this.logger.error('Geocoding failed completely', error);
      throw new BadRequestException('Geocoding service unavailable');
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private buildCacheKey(
    lat: number,
    lng: number,
    start: Date,
    end: Date,
    radius: number,
    filters: Record<string, unknown>,
    sort: string,
  ): string {
    // Grid-snap coordinates to ~110m
    const snapLat = Math.round(lat * 1000) / 1000;
    const snapLng = Math.round(lng * 1000) / 1000;
    // Bucket time to 15-min slots
    const startBucket = Math.floor(start.getTime() / (15 * 60 * 1000));
    const endBucket = Math.floor(end.getTime() / (15 * 60 * 1000));
    const filterStr = JSON.stringify(filters);
    return `search:${snapLat},${snapLng}:${startBucket}-${endBucket}:r${radius}:s${sort}:f${filterStr}`;
  }

  private async loadAmenities(facilityIds: string[]) {
    if (!facilityIds.length) return new Map();
    const rows = await this.prisma.facilityAmenity.findMany({
      where: { facilityId: { in: facilityIds } },
    });
    const map = new Map<string, typeof rows[0]>();
    rows.forEach((r: any) => map.set(r.facilityId, r));
    return map;
  }

  private async loadCoverPhotos(facilityIds: string[]) {
    if (!facilityIds.length) return new Map();
    const rows = await this.prisma.facilityPhoto.findMany({
      where: { facilityId: { in: facilityIds }, isCover: true },
    });
    const map = new Map<string, string>();
    rows.forEach((r: any) => map.set(r.facilityId, r.url));
    return map;
  }

  private async loadRateRules(facilityIds: string[]) {
    if (!facilityIds.length) return new Map();
    const rows = await this.prisma.rateRule.findMany({
      where: { facilityId: { in: facilityIds }, active: true },
      orderBy: { priority: 'desc' },
    });
    const map = new Map<string, typeof rows>();
    rows.forEach((r: any) => {
      if (!map.has(r.facilityId)) map.set(r.facilityId, []);
      map.get(r.facilityId)!.push(r);
    });
    return map;
  }

  private formatAmenities(a: Record<string, unknown>): string[] {
    const result: string[] = [];
    if (a['covered']) result.push('covered');
    if (a['evCharging']) result.push('ev_charging');
    if (a['adaAccessible']) result.push('ada_accessible');
    if (a['valet']) result.push('valet');
    if (a['inOutPrivileges']) result.push('in_out_privileges');
    if (a['gated']) result.push('gated');
    return result;
  }
}
