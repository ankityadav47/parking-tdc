import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { RedisService } from '../../common/redis/redis.service';
import { PrismaService } from '../../db/prisma.service';
import { RegisterDto } from '@parkspot/types';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Registration ────────────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone,
        role: dto.role || 'driver',
      },
    });

    // If registering as operator, create operator profile
    if (dto.role === 'operator') {
      await this.prisma.operatorProfile.create({
        data: {
          userId: user.id,
          companyName: dto.fullName, // updated later
        },
      });
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    this.logger.log(`User registered: ${user.email} (${user.role})`);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  // ─── Login ────────────────────────────────────────────────────────────────

  async login(user: { id: string; email: string; role: string }) {
    const tokens = await this.generateTokens(user.id, user.email, user.role);
    this.logger.log(`User logged in: ${user.email}`);
    return {
      user: await this.usersService.findById(user.id),
      ...tokens,
    };
  }

  // ─── Validate credentials (used by LocalStrategy) ────────────────────────

  async validateCredentials(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === 'suspended') {
      throw new UnauthorizedException('Account suspended');
    }

    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return { id: user.id, email: user.email, role: user.role };
  }

  // ─── Refresh tokens ───────────────────────────────────────────────────────

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('auth.jwtRefreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const tokenHash = this.hashToken(refreshToken);
    const valid = await this.redisService.validateRefreshToken(payload.sub, tokenHash);
    if (!valid) {
      // Possible token reuse — revoke all
      await this.redisService.revokeAllUserTokens(payload.sub);
      throw new UnauthorizedException('Refresh token already used (reuse detected)');
    }

    // Rotate: revoke old, issue new
    await this.redisService.revokeRefreshToken(payload.sub, tokenHash);
    const tokens = await this.generateTokens(payload.sub, payload.email, payload.role);
    return tokens;
  }

  // ─── Logout ───────────────────────────────────────────────────────────────

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      await this.redisService.revokeRefreshToken(userId, tokenHash);
    } else {
      await this.redisService.revokeAllUserTokens(userId);
    }
  }

  // ─── Email verification ───────────────────────────────────────────────────

  async sendVerificationEmail(userId: string) {
    const token = crypto.randomBytes(32).toString('hex');
    await this.redisService.set(`verify:${token}`, userId, 24 * 3600); // 24h
    // TODO: enqueue email job
    this.logger.log(`Verification token generated for user ${userId}`);
    return { message: 'Verification email sent' };
  }

  async verifyEmail(token: string) {
    const userId = await this.redisService.get(`verify:${token}`);
    if (!userId) throw new BadRequestException('Invalid or expired verification token');

    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    });
    await this.redisService.del(`verify:${token}`);
    return { message: 'Email verified' };
  }

  // ─── Forgot / Reset password ──────────────────────────────────────────────

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user) return { message: 'If the email exists, a reset link has been sent' };

    const token = crypto.randomBytes(32).toString('hex');
    await this.redisService.set(`reset:${token}`, user.id, 3600); // 1h
    // TODO: enqueue email job with reset link
    this.logger.log(`Password reset token generated for ${email}`);
    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    const userId = await this.redisService.get(`reset:${token}`);
    if (!userId) throw new BadRequestException('Invalid or expired reset token');

    const passwordHash = await argon2.hash(newPassword);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await this.redisService.del(`reset:${token}`);
    await this.redisService.revokeAllUserTokens(userId);

    return { message: 'Password updated successfully' };
  }

  // ─── Change Password ──────────────────────────────────────────────────────

  async changePassword(userId: string, currentPass: string, newPass: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) throw new UnauthorizedException();
    
    const valid = await argon2.verify(user.passwordHash, currentPass);
    if (!valid) throw new BadRequestException('Incorrect current password');

    const passwordHash = await argon2.hash(newPass);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    
    // Invalidate tokens so other sessions are logged out (optional but good security)
    await this.redisService.revokeAllUserTokens(userId);

    return { message: 'Password changed successfully. You may need to log in again on other devices.' };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private async generateTokens(
    userId: string,
    email: string,
    role: string,
  ): Promise<AuthTokens> {
    const payload: JwtPayload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('auth.jwtRefreshSecret'),
        expiresIn: this.configService.get<string>('auth.jwtRefreshTtl') || '30d',
      }),
    ]);

    // Store hashed refresh token in Redis
    const refreshHash = this.hashToken(refreshToken);
    const ttlSeconds = 30 * 24 * 3600; // 30 days
    await this.redisService.storeRefreshToken(userId, refreshHash, ttlSeconds);

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private sanitizeUser(user: { id: string; email: string; fullName: string; role: string; status: string }) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
    };
  }
}
