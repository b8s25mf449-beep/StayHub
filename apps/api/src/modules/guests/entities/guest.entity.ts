import { Entity, Column } from 'typeorm';
import { Exclude } from 'class-transformer';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum GuestStatus {
  ACTIVE = 'active',
  BLACKLISTED = 'blacklisted',
  VIP = 'vip',
}

export enum DocumentType {
  PASSPORT = 'passport',
  DNI = 'dni',
  CEDULA = 'cedula',
  DRIVERS_LICENSE = 'drivers_license',
}

@Entity('guests')
export class Guest extends BaseEntity {
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column({ unique: true, nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  nationality: string;

  @Column({ name: 'document_type', type: 'enum', enum: DocumentType, nullable: true })
  documentType: DocumentType;

  @Column({ name: 'document_number_encrypted', nullable: true })
  @Exclude()
  documentNumberEncrypted: string;

  @Column({ name: 'date_of_birth_encrypted', nullable: true })
  @Exclude()
  dateOfBirthEncrypted: string;

  @Column({ type: 'enum', enum: GuestStatus, default: GuestStatus.ACTIVE })
  status: GuestStatus;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  language: string;

  @Column({ type: 'jsonb', nullable: true })
  preferences: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'total_stays', default: 0 })
  totalStays: number;

  @Column({ name: 'total_revenue', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalRevenue: number;
}
