import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum ReservationStatus {
  INQUIRY = 'inquiry',
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CHECKED_IN = 'checked_in',
  CHECKED_OUT = 'checked_out',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

export enum ReservationSource {
  DIRECT = 'direct',
  BOOKING_COM = 'booking_com',
  AIRBNB = 'airbnb',
  EXPEDIA = 'expedia',
  ICAL = 'ical',
  PHONE = 'phone',
  WALK_IN = 'walk_in',
}

@Entity('reservations')
export class Reservation extends BaseEntity {
  @Column({ name: 'tenant_id' })
  @Index()
  tenantId: string;

  @Column({ name: 'property_id' })
  propertyId: string;

  @Column({ name: 'room_id' })
  roomId: string;

  @Column({ name: 'guest_id' })
  guestId: string;

  @Column({ name: 'confirmation_number', unique: true })
  confirmationNumber: string;

  @Column({ type: 'enum', enum: ReservationStatus, default: ReservationStatus.PENDING })
  status: ReservationStatus;

  @Column({ type: 'enum', enum: ReservationSource, default: ReservationSource.DIRECT })
  source: ReservationSource;

  @Column({ name: 'check_in_date', type: 'date' })
  checkInDate: string;

  @Column({ name: 'check_out_date', type: 'date' })
  checkOutDate: string;

  @Column({ name: 'actual_check_in', type: 'timestamp', nullable: true })
  actualCheckIn: Date;

  @Column({ name: 'actual_check_out', type: 'timestamp', nullable: true })
  actualCheckOut: Date;

  @Column({ name: 'adults_count', default: 1 })
  adultsCount: number;

  @Column({ name: 'children_count', default: 0 })
  childrenCount: number;

  @Column({ name: 'base_amount', type: 'decimal', precision: 12, scale: 2 })
  baseAmount: number;

  @Column({ name: 'taxes_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  taxesAmount: number;

  @Column({ name: 'extras_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  extrasAmount: number;

  @Column({ name: 'discount_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 12, scale: 2 })
  totalAmount: number;

  @Column({ nullable: true })
  currency: string;

  @Column({ name: 'channel_reservation_id', nullable: true })
  channelReservationId: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'jsonb', nullable: true })
  extras: Record<string, unknown>;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt: Date;

  @Column({ name: 'cancellation_reason', nullable: true })
  cancellationReason: string;
}
