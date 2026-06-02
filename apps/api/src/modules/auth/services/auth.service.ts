import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { User, UserStatus } from '../../users/entities/user.entity';
import { LoginDto } from '../dto/login.dto';
import { PasswordService } from './password.service';
import { TotpService } from './totp.service';
import { BruteForceService } from './brute-force.service';
import { RefreshTokenService } from './refresh-token.service';

export interface JwtPayload {
  sub: string;
  tenantId: string;
  email: string;
  roles: string[];
  permissions: string[];
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

@Injectable()
export class AuthService {
  private readonly privateKey: string;
  private readonly publicKey: string;
  private readonly accessTtl: number;
  private readonly refreshTtlDays: number;

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly passwordService: PasswordService,
    private readonly totpService: TotpService,
    private readonly bruteForceService: BruteForceService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly configService: ConfigService,
  ) {
    this.privateKey = configService.get<string>('jwt.privateKey')!;
    this.publicKey = configService.get<string>('jwt.publicKey')!;
    this.accessTtl = configService.get<number>('jwt.accessTtl', 900);
    this.refreshTtlDays = configService.get<number>('jwt.refreshTtlDays', 7);
  }

  async login(
    dto: LoginDto,
    meta: { ipAddress: string; userAgent: string },
  ): Promise<AuthTokens> {
    const bruteKey = `login:${meta.ipAddress}:${dto.email}`;
    await this.bruteForceService.checkAndIncrement(bruteKey);

    const user = await this.userRepo.findOne({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Account suspended');
    }

    const passwordValid = await this.passwordService.verify(user.passwordHash, dto.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.totpEnabled) {
      if (!dto.totpCode) {
        throw new UnauthorizedException('TOTP code required');
      }
      const totpValid = this.totpService.verify(dto.totpCode, user.totpSecret!);
      if (!totpValid) {
        throw new UnauthorizedException('Invalid TOTP code');
      }
    }

    await this.bruteForceService.reset(bruteKey);
    await this.userRepo.update(user.id, { lastLoginAt: new Date() });

    return this.generateTokens(user, meta);
  }

  async refresh(
    rawToken: string,
    meta: { ipAddress: string; userAgent: string; deviceId?: string },
  ): Promise<AuthTokens> {
    const { record } = await this.refreshTokenService.rotate(rawToken, meta);

    const user = await this.userRepo.findOne({ where: { id: record.userId } });
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return this.generateTokens(user, meta);
  }

  async logout(rawToken: string): Promise<void> {
    await this.refreshTokenService.revoke(rawToken);
  }

  async setupTotp(userId: string, tenantId: string): Promise<{ secret: string; qrCode: string }> {
    const user = await this.findUserInTenant(userId, tenantId);
    if (user.totpEnabled) {
      throw new ConflictException('TOTP is already enabled');
    }

    const secret = this.totpService.generateSecret();
    const qrCode = await this.totpService.generateQrCode(user.email, secret);

    await this.userRepo.update(user.id, { totpSecret: secret });

    return { secret, qrCode };
  }

  async verifyAndEnableTotp(userId: string, tenantId: string, code: string): Promise<string[]> {
    const user = await this.findUserInTenant(userId, tenantId);
    if (!user.totpSecret) {
      throw new NotFoundException('TOTP setup not initiated');
    }

    if (!this.totpService.verify(code, user.totpSecret)) {
      throw new UnauthorizedException('Invalid TOTP code');
    }

    const backupCodes = this.totpService.generateBackupCodes();
    await this.userRepo.update(user.id, {
      totpEnabled: true,
      backupCodes,
    });

    return backupCodes;
  }

  async disableTotp(userId: string, tenantId: string, code: string): Promise<void> {
    const user = await this.findUserInTenant(userId, tenantId);
    if (!user.totpEnabled) {
      throw new ConflictException('TOTP is not enabled');
    }

    if (!this.totpService.verify(code, user.totpSecret!)) {
      throw new UnauthorizedException('Invalid TOTP code');
    }

    await this.userRepo.update(user.id, {
      totpEnabled: false,
      totpSecret: undefined,
      backupCodes: undefined,
    });
  }

  signAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, this.privateKey, {
      algorithm: 'RS256',
      expiresIn: this.accessTtl,
    });
  }

  verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, this.publicKey, { algorithms: ['RS256'] }) as JwtPayload;
  }

  private async generateTokens(
    user: User,
    meta: { ipAddress: string; userAgent: string; deviceId?: string },
  ): Promise<AuthTokens> {
    const permissions = user.roles.flatMap((r) => r.permissions.map((p) => p.name));

    const payload: JwtPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      email: user.email,
      roles: user.roles.map((r) => r.name),
      permissions: [...new Set(permissions)],
    };

    const accessToken = this.signAccessToken(payload);
    const refreshToken = await this.refreshTokenService.create(
      user.id,
      user.tenantId,
      this.refreshTtlDays,
      meta,
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTtl,
      tokenType: 'Bearer',
    };
  }

  private async findUserInTenant(userId: string, tenantId: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id: userId, tenantId } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
