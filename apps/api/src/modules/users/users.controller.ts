import { Controller, Get, Patch, Post, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getProfile(@Req() req: Request) {
    const user = req.user as { id: string };
    return { data: await this.usersService.findById(user.id) };
  }

  @Patch('me')
  async updateProfile(@Req() req: Request, @Body() body: { fullName?: string; phone?: string }) {
    const user = req.user as { id: string };
    return { data: await this.usersService.updateProfile(user.id, body) };
  }

  @Get('me/vehicles')
  async getVehicles(@Req() req: Request) {
    const user = req.user as { id: string };
    return { data: await this.usersService.getVehicles(user.id) };
  }

  @Post('me/vehicles')
  async addVehicle(
    @Req() req: Request,
    @Body() body: { licensePlate: string; state: string; make?: string; model?: string; color?: string; isDefault?: boolean },
  ) {
    const user = req.user as { id: string };
    return { data: await this.usersService.addVehicle(user.id, body) };
  }

  @Patch('me/vehicles/:id')
  async updateVehicle(@Req() req: Request, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    const user = req.user as { id: string };
    return { data: await this.usersService.updateVehicle(id, user.id, body as Parameters<UsersService['updateVehicle']>[2]) };
  }

  @Delete('me/vehicles/:id')
  async removeVehicle(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { id: string };
    await this.usersService.removeVehicle(id, user.id);
    return { data: { deleted: true } };
  }

  @Get('me/business-profile')
  async getBusinessProfile(@Req() req: Request) {
    const user = req.user as { id: string };
    return { data: await this.usersService.getBusinessProfile(user.id) };
  }

  @Post('me/business-profile')
  async upsertBusinessProfile(
    @Req() req: Request,
    @Body() body: { companyName: string; taxId?: string; billingEmail: string },
  ) {
    const user = req.user as { id: string };
    return { data: await this.usersService.upsertBusinessProfile(user.id, body) };
  }
}
