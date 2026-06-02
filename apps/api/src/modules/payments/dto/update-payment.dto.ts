import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString, IsNumber, Min } from 'class-validator';
import { PaymentStatus } from '../entities/payment.entity';

export class UpdatePaymentDto {
  @ApiPropertyOptional({ enum: PaymentStatus }) @IsOptional() @IsEnum(PaymentStatus) status?: PaymentStatus;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) refundedAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() providerPaymentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
