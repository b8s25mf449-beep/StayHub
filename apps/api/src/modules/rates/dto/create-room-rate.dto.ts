import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsNumber, IsPositive, IsOptional,
  IsUUID, IsDateString, IsBoolean, IsInt, Min,
} from 'class-validator';

export class CreateRoomRateDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() roomId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() roomTypeId?: string;
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiProperty() @IsNumber() @IsPositive() pricePerNight: number;
  @ApiPropertyOptional({ default: 'ARS' }) @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional({ example: '2026-12-01' }) @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional({ example: '2026-12-31' }) @IsOptional() @IsDateString() endDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) minNights?: number;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsInt() @Min(0) priority?: number;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() isActive?: boolean;
}
