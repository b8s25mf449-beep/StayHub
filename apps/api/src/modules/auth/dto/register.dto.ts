import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsString() @MinLength(2) @MaxLength(100) hotelName: string;
  @IsString() @MinLength(2) @MaxLength(50) firstName: string;
  @IsString() @MinLength(2) @MaxLength(50) lastName: string;
  @IsEmail() email: string;
  @IsString() @MinLength(8) @MaxLength(128) password: string;
}
