import { IsEmail, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@hotel.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecureP@ssw0rd!' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @ApiPropertyOptional({ example: '123456', description: 'TOTP code if 2FA is enabled' })
  @IsString()
  @IsOptional()
  totpCode?: string;

  @ApiPropertyOptional({ example: 'device-uuid', description: 'Stable device identifier' })
  @IsString()
  @IsOptional()
  deviceId?: string;
}
