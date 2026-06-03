import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum ChannelType {
  BOOKING_COM = 'booking_com',
  AIRBNB = 'airbnb',
  EXPEDIA = 'expedia',
  ICAL = 'ical',
  VRBO = 'vrbo',
}

export enum ChannelStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  SYNCING = 'syncing',
}

@Entity('channel_connections')
export class ChannelConnection extends BaseEntity {
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'property_id' })
  propertyId: string;

  @Column({ name: 'room_id' })
  roomId: string;

  @Column({ type: 'enum', enum: ChannelType })
  channel: ChannelType;

  @Column({ type: 'enum', enum: ChannelStatus, default: ChannelStatus.INACTIVE })
  status: ChannelStatus;

  @Column({ name: 'ical_url' })
  icalUrl: string;

  @Column({ name: 'channel_property_id', nullable: true })
  channelPropertyId: string;

  @Column({ name: 'last_sync_at', type: 'timestamptz', nullable: true })
  lastSyncAt: Date;

  @Column({ name: 'last_sync_count', default: 0 })
  lastSyncCount: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;

  @Column({ type: 'jsonb', nullable: true })
  settings: Record<string, unknown>;
}
