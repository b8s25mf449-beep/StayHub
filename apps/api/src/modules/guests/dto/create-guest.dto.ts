import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEmail, IsEnum } from 'class-validator';
import { GuestStatus, DocumentType } from '../entities/guest.entity';

export class CreateGuestDto {
  @ApiProperty() @IsString() @IsNotEmpty() firstName: string;
  @ApiProperty() @IsString() @IsNotEmpty() lastName: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nationality?: string;
  @ApiPropertyOptional({ enum: DocumentType }) @IsOptional() @IsEnum(DocumentType) documentType?: DocumentType;
  @ApiPropertyOptional() @IsOptional() @IsString() documentNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dateOfBirth?: string;
  @ApiPropertyOptional({ enum: GuestStatus }) @IsOptional() @IsEnum(GuestStatus) status?: GuestStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() language?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
