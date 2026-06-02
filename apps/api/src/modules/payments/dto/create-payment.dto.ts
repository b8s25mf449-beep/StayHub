import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUUID, IsNumber, IsPositive } from 'class-validator';
import { PaymentMethod, PaymentProvider } from '../entities/payment.entity';

export class CreatePaymentDto {
  @ApiProperty() @IsUUID() reservationId: string;
  @ApiProperty() @IsNumber() @IsPositive() amount: number;
  @ApiProperty() @IsString() @IsNotEmpty() currency: string;
  @ApiProperty({ enum: PaymentMethod }) @IsEnum(PaymentMethod) method: PaymentMethod;
  @ApiProperty({ enum: PaymentProvider }) @IsEnum(PaymentProvider) provider: PaymentProvider;
  @ApiPropertyOptional() @IsOptional() @IsString() providerPaymentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
