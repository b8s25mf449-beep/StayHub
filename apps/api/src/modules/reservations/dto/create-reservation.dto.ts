import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsUUID, IsDateString, IsNumber, IsPositive, Min } from 'class-validator';
import { ReservationSource } from '../entities/reservation.entity';

export class CreateReservationDto {
  @ApiProperty() @IsUUID() propertyId: string;
  @ApiProperty() @IsUUID() roomId: string;
  @ApiProperty() @IsUUID() guestId: string;
  @ApiProperty({ example: '2026-07-01' }) @IsDateString() checkInDate: string;
  @ApiProperty({ example: '2026-07-05' }) @IsDateString() checkOutDate: string;
  @ApiProperty() @IsNumber() @IsPositive() baseAmount: number;
  @ApiProperty() @IsNumber() @IsPositive() totalAmount: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) taxesAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) extrasAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discountAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @IsPositive() adultsCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) childrenCount?: number;
  @ApiPropertyOptional({ enum: ReservationSource }) @IsOptional() @IsEnum(ReservationSource) source?: ReservationSource;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() channelReservationId?: string;
}
