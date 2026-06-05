import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString, IsDateString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ReservationStatus } from '../entities/reservation.entity';

export class UpdateReservationDto {
  @ApiPropertyOptional({ enum: ReservationStatus }) @IsOptional() @IsEnum(ReservationStatus) status?: ReservationStatus;
  @ApiPropertyOptional() @IsOptional() @IsDateString() checkInDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() checkOutDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cancellationReason?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number) baseAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number) totalAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number) taxesAmount?: number;
}
