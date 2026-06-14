import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SearchService } from './search.service';

@ApiTags('search')
@Controller({ path: 'search', version: '1' })
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Geospatial + temporal availability search' })
  async search(
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('address') address?: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('radius') radius?: string,
    @Query('sort') sort?: 'distance' | 'price' | 'rating',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('filter[ev_charging]') evCharging?: string,
    @Query('filter[covered]') covered?: string,
    @Query('filter[ada_accessible]') adaAccessible?: string,
    @Query('filter[valet]') valet?: string,
    @Query('filter[type]') type?: string,
  ) {
    const result = await this.searchService.search({
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      address,
      start: new Date(start || ''),
      end: new Date(end || ''),
      radiusMeters: radius ? parseInt(radius) : 2000,
      sort: sort || 'distance',
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      filters: {
        evCharging: evCharging === 'true',
        covered: covered === 'true',
        adaAccessible: adaAccessible === 'true',
        valet: valet === 'true',
        type,
      },
    });

    return { data: result.results, meta: result.meta };
  }

  @Get('autocomplete')
  @ApiOperation({ summary: 'Address/venue suggestions (Google Places)' })
  async autocomplete(@Query('q') q: string) {
    return { data: await this.searchService.autocomplete(q) };
  }
}
