import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum RoomStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  MAINTENANCE = 'maintenance',
  OUT_OF_ORDER = 'out_of_order',
  CLEANING = 'cleaning',
}

@Entity('rooms')
export class Room extends BaseEntity {
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'property_id' })
  propertyId: string;

  @Column({ name: 'room_type_id' })
  roomTypeId: string;

  @Column({ name: 'room_number' })
  roomNumber: string;

  @Column({ nullable: true })
  floor: string;

  @Column({ type: 'enum', enum: RoomStatus, default: RoomStatus.AVAILABLE })
  status: RoomStatus;

  @Column({ nullable: true })
  notes: string;

  @Column({ type: 'jsonb', nullable: true })
  attributes: Record<string, unknown>;
}
