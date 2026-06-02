import { Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';
import { randomBytes } from 'crypto';

authenticator.options = { window: 1 };

@Injectable()
export class TotpService {
  generateSecret(): string {
    return authenticator.generateSecret(32);
  }

  async generateQrCode(email: string, secret: string, issuer = 'StayHub'): Promise<string> {
    const otpauth = authenticator.keyuri(email, issuer, secret);
    return qrcode.toDataURL(otpauth);
  }

  verify(token: string, secret: string): boolean {
    return authenticator.verify({ token, secret });
  }

  generateBackupCodes(count = 8): string[] {
    return Array.from({ length: count }, () => {
      const bytes = randomBytes(6);
      const hex = bytes.toString('hex').toUpperCase();
      return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
    });
  }
}
