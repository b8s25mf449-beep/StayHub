import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';
import { PasswordService } from './services/password.service';
import { TotpService } from './services/totp.service';
import { BruteForceService } from './services/brute-force.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshToken } from './entities/refresh-token.entity';
import { AuditLog } from './entities/audit-log.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../users/entities/role.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { MailService } from './services/mail.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([RefreshToken, AuditLog, User, Role, Tenant]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    TotpService,
    BruteForceService,
    RefreshTokenService,
    MailService,
    JwtStrategy,
  ],
  exports: [AuthService, PasswordService],
})
export class AuthModule {}
