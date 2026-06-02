import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { TenantPlan } from '../entities/tenant.entity';

export class CreateTenantDto {
  @ApiProperty() @IsString() @IsNotEmpty() slug: string;
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() logo_url?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() website?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() timezone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional({ enum: TenantPlan }) @IsOptional() @IsEnum(TenantPlan) plan?: TenantPlan;
  @ApiPropertyOptional() @IsOptional() @IsDateString() trial_ends_at?: string;
}
