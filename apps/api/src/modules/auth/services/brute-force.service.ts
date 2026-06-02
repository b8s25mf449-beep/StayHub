import { Injectable, UnauthorizedException } from '@nestjs/common';

const MAX_ATTEMPTS = 5;
const BASE_LOCKOUT_SECONDS = 60;
const MAX_LOCKOUT_SECONDS = 900;

@Injectable()
export class BruteForceService {
  private readonly attempts = new Map<string, { count: number; lockedUntil?: Date }>();

  async checkAndIncrement(key: string): Promise<void> {
    const record = this.attempts.get(key) ?? { count: 0 };

    if (record.lockedUntil && record.lockedUntil > new Date()) {
      const secondsLeft = Math.ceil((record.lockedUntil.getTime() - Date.now()) / 1000);
      throw new UnauthorizedException(
        `Account locked. Try again in ${secondsLeft} seconds.`,
      );
    }

    record.count += 1;

    if (record.count >= MAX_ATTEMPTS) {
      const lockoutSeconds = Math.min(
        BASE_LOCKOUT_SECONDS * Math.pow(2, record.count - MAX_ATTEMPTS),
        MAX_LOCKOUT_SECONDS,
      );
      record.lockedUntil = new Date(Date.now() + lockoutSeconds * 1000);
    }

    this.attempts.set(key, record);
  }

  async reset(key: string): Promise<void> {
    this.attempts.delete(key);
  }

  async isLocked(key: string): Promise<boolean> {
    const record = this.attempts.get(key);
    if (!record?.lockedUntil) return false;
    return record.lockedUntil > new Date();
  }
}
