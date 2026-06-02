import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { RefreshToken } from '../entities/refresh-token.entity';

const MAX_DEVICES_PER_USER = 5;

@Injectable()
export class RefreshTokenService {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
  ) {}

  async create(
    userId: string,
    tenantId: string,
    ttlDays: number,
    meta: { deviceId?: string; ipAddress?: string; userAgent?: string },
  ): Promise<string> {
    const rawToken = randomBytes(48).toString('hex');
    const tokenHash = this.hash(rawToken);

    await this.enforceDeviceLimit(userId, tenantId);

    await this.refreshTokenRepo.save(
      this.refreshTokenRepo.create({
        userId,
        tenantId,
        tokenHash,
        expiresAt: new Date(Date.now() + ttlDays * 86400 * 1000),
        deviceId: meta.deviceId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      }),
    );

    return rawToken;
  }

  async rotate(
    rawToken: string,
    meta: { deviceId?: string; ipAddress?: string; userAgent?: string },
  ): Promise<{ newRawToken: string; record: RefreshToken }> {
    const tokenHash = this.hash(rawToken);
    const record = await this.refreshTokenRepo.findOne({ where: { tokenHash } });

    if (!record || record.revokedAt) {
      if (record) {
        await this.revokeFamily(record.userId, record.tenantId);
      }
      throw new UnauthorizedException('Invalid or reused refresh token');
    }

    if (record.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const newRawToken = randomBytes(48).toString('hex');
    const newHash = this.hash(newRawToken);

    await this.refreshTokenRepo.update(record.id, {
      revokedAt: new Date(),
      replacedBy: newHash,
    });

    await this.refreshTokenRepo.save(
      this.refreshTokenRepo.create({
        userId: record.userId,
        tenantId: record.tenantId,
        tokenHash: newHash,
        expiresAt: record.expiresAt,
        deviceId: meta.deviceId ?? record.deviceId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      }),
    );

    return { newRawToken, record };
  }

  async revoke(rawToken: string): Promise<void> {
    const tokenHash = this.hash(rawToken);
    await this.refreshTokenRepo.update({ tokenHash }, { revokedAt: new Date() });
  }

  async revokeFamily(userId: string, tenantId: string): Promise<void> {
    await this.refreshTokenRepo.update(
      { userId, tenantId, revokedAt: undefined },
      { revokedAt: new Date() },
    );
  }

  private async enforceDeviceLimit(userId: string, tenantId: string): Promise<void> {
    const active = await this.refreshTokenRepo.find({
      where: { userId, tenantId, revokedAt: undefined },
      order: { createdAt: 'ASC' },
    });

    if (active.length >= MAX_DEVICES_PER_USER) {
      const toRevoke = active.slice(0, active.length - MAX_DEVICES_PER_USER + 1);
      await this.refreshTokenRepo.update(
        toRevoke.map((t) => t.id),
        { revokedAt: new Date() },
      );
    }
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
