import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('audit_logs')
export class AuditLog extends BaseEntity {
  @Column({ name: 'tenant_id' })
  @Index()
  tenantId: string;

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @Column()
  action: string;

  @Column()
  resource: string;

  @Column({ name: 'resource_id', nullable: true })
  resourceId: string;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;
}
