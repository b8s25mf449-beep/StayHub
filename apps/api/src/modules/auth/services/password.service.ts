import { Injectable, BadRequestException } from '@nestjs/common';
import * as argon2 from 'argon2';

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

const PASSWORD_RULES = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
};

@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    return argon2.hash(password, ARGON2_OPTIONS);
  }

  async verify(hash: string, password: string): Promise<boolean> {
    return argon2.verify(hash, password);
  }

  validatePolicy(password: string): void {
    const errors: string[] = [];

    if (password.length < PASSWORD_RULES.minLength) {
      errors.push(`Password must be at least ${PASSWORD_RULES.minLength} characters`);
    }
    if (password.length > PASSWORD_RULES.maxLength) {
      errors.push(`Password must not exceed ${PASSWORD_RULES.maxLength} characters`);
    }
    if (PASSWORD_RULES.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (PASSWORD_RULES.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (PASSWORD_RULES.requireNumber && !/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (PASSWORD_RULES.requireSpecial && !/[^A-Za-z0-9]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }
  }
}
