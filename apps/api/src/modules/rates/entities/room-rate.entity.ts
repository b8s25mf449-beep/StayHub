import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('room_rates')
export class RoomRate extends BaseEntity {
  @Column({ name: 'tenant_id' })
  @Index()
  tenantId: string;

  @Column({ name: 'room_id', type: 'uuid', nullable: true })
  roomId: string | null;

  @Column({ name: 'room_type_id', type: 'uuid', nullable: true })
  roomTypeId: string | null;

  @Column()
  name: string;

  @Column({ name: 'price_per_night', type: 'decimal', precision: 10, scale: 2 })
  pricePerNight: number;

  @Column({ default: 'ARS' })
  currency: string;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: string | null;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: string | null;

  @Column({ name: 'min_nights', type: 'int', nullable: true })
  minNights: number | null;

  @Column({ default: 0 })
  priority: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
