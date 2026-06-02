import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('room_types')
export class RoomType extends BaseEntity {
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'property_id' })
  propertyId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ name: 'max_occupancy' })
  maxOccupancy: number;

  @Column({ name: 'base_price', type: 'decimal', precision: 10, scale: 2 })
  basePrice: number;

  @Column({ nullable: true })
  currency: string;

  @Column({ type: 'jsonb', nullable: true })
  amenities: string[];

  @Column({ type: 'jsonb', nullable: true })
  images: string[];

  @Column({ name: 'bed_configuration', type: 'jsonb', nullable: true })
  bedConfiguration: Record<string, unknown>;

  @Column({ name: 'area_sqm', type: 'decimal', precision: 6, scale: 2, nullable: true })
  areaSqm: number;
}
