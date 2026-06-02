import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, IsNotEmpty, IsOptional, MinLength, IsArray, IsUUID } from 'class-validator';

export class CreateUserDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() @IsNotEmpty() firstName: string;
  @ApiProperty() @IsString() @IsNotEmpty() lastName: string;
  @ApiProperty() @IsString() @MinLength(8) password: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() locale?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() timezone?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsUUID('4', { each: true }) roleIds?: string[];
}
