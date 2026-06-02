import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  BANK_TRANSFER = 'bank_transfer',
  CASH = 'cash',
  MERCADOPAGO = 'mercadopago',
  STRIPE = 'stripe',
}

export enum PaymentProvider {
  STRIPE = 'stripe',
  MERCADOPAGO = 'mercadopago',
  MANUAL = 'manual',
}

@Entity('payments')
export class Payment extends BaseEntity {
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'reservation_id' })
  reservationId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column()
  currency: string;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ type: 'enum', enum: PaymentMethod })
  method: PaymentMethod;

  @Column({ type: 'enum', enum: PaymentProvider })
  provider: PaymentProvider;

  @Column({ name: 'provider_payment_id', nullable: true })
  providerPaymentId: string;

  @Column({ name: 'provider_response', type: 'jsonb', nullable: true })
  providerResponse: Record<string, unknown>;

  @Column({ name: 'refunded_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  refundedAmount: number;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt: Date;

  @Column({ nullable: true })
  notes: string;
}
