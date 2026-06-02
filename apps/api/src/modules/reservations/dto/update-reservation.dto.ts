import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString, IsDateString } from 'class-validator';
import { ReservationStatus } from '../entities/reservation.entity';

export class UpdateReservationDto {
  @ApiPropertyOptional({ enum: ReservationStatus }) @IsOptional() @IsEnum(ReservationStatus) status?: ReservationStatus;
  @ApiPropertyOptional() @IsOptional() @IsDateString() checkInDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() checkOutDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cancellationReason?: string;
}
