import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsEmail } from 'class-validator';
import { PropertyType, PropertyStatus } from '../entities/property.entity';

export class CreatePropertyDto {
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty({ enum: PropertyType }) @IsEnum(PropertyType) type: PropertyType;
  @ApiPropertyOptional({ enum: PropertyStatus }) @IsOptional() @IsEnum(PropertyStatus) status?: PropertyStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() zip_code?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() latitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() longitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() timezone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() checkInTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() checkOutTime?: string;
}
