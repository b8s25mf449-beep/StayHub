import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsPositive, IsUUID } from 'class-validator';

export class CreateRoomTypeDto {
  @ApiProperty() @IsUUID() propertyId: string;
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsNumber() @IsPositive() maxOccupancy: number;
  @ApiProperty() @IsNumber() @IsPositive() basePrice: number;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @IsPositive() areaSqm?: number;
}
