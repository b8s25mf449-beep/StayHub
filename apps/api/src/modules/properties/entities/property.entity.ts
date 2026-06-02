import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum PropertyType {
  HOTEL = 'hotel',
  HOSTEL = 'hostel',
  VACATION_RENTAL = 'vacation_rental',
  APARTMENT = 'apartment',
  BOUTIQUE = 'boutique',
}

export enum PropertyStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
}

@Entity('properties')
export class Property extends BaseEntity {
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'enum', enum: PropertyType })
  type: PropertyType;

  @Column({ type: 'enum', enum: PropertyStatus, default: PropertyStatus.ACTIVE })
  status: PropertyStatus;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  zip_code: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  timezone: string;

  @Column({ nullable: true })
  currency: string;

  @Column({ name: 'check_in_time', nullable: true })
  checkInTime: string;

  @Column({ name: 'check_out_time', nullable: true })
  checkOutTime: string;

  @Column({ type: 'jsonb', nullable: true })
  amenities: string[];

  @Column({ type: 'jsonb', nullable: true })
  images: string[];

  @Column({ type: 'jsonb', nullable: true })
  policies: Record<string, unknown>;
}
