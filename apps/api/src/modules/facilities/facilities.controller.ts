import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { FacilitiesService } from './facilities.service';

@ApiTags('facilities')
@Controller({ path: 'facilities', version: '1' })
export class FacilitiesController {
  constructor(private readonly facilitiesService: FacilitiesService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get public facility details' })
  async getFacility(@Param('id') id: string) {
    return { data: await this.facilitiesService.getPublicFacility(id) };
  }

  @Get(':id/availability')
  @ApiOperation({ summary: 'Check availability for a time window' })
  async getAvailability(
    @Param('id') _facilityId: string,
    @Query('start') _start: string,
    @Query('end') _end: string,
  ) {
    return { data: { available: true, spotsLeft: 0, quote: null } };
  }

  @Get(':id/reviews')
  @ApiOperation({ summary: 'Get reviews for a facility' })
  async getReviews(@Param('id') _facilityId: string) {
    return { data: [] };
  }
}
