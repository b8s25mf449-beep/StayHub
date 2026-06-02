import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { RoomStatus } from '../../entities/room.entity';

export class CreateRoomDto {
  @ApiProperty() @IsUUID() propertyId: string;
  @ApiProperty() @IsUUID() roomTypeId: string;
  @ApiProperty() @IsString() @IsNotEmpty() roomNumber: string;
  @ApiPropertyOptional() @IsOptional() @IsString() floor?: string;
  @ApiPropertyOptional({ enum: RoomStatus }) @IsOptional() @IsEnum(RoomStatus) status?: RoomStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
