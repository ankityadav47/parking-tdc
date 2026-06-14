import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const Roles = (...roles: string[]) => {
  const SetMetadata = require('@nestjs/common').SetMetadata;
  return SetMetadata('roles', roles);
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<{ user: { role: string } }>();
    if (!user) throw new ForbiddenException('Access denied');

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(`Role '${user.role}' is not authorized for this resource`);
    }

    return true;
  }
}
