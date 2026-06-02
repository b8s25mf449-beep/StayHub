import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('refresh_tokens')
export class RefreshToken extends BaseEntity {
  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'token_hash', unique: true })
  @Index()
  tokenHash: string;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @Column({ name: 'revoked_at', type: 'timestamp', nullable: true })
  revokedAt: Date | null;

  @Column({ name: 'device_id', nullable: true })
  deviceId: string;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent: string;

  @Column({ name: 'replaced_by', nullable: true })
  replacedBy: string;
}
