import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
} from 'typeorm';

@Entity('audit_log')
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'actor_id', nullable: true })
  actorId: string;

  @Column({ name: 'actor_email', nullable: true })
  actorEmail: string;

  @Column({ length: 100 })
  action: string;

  @Column({ length: 50 })
  resource: string;

  @Column({ name: 'resource_id', nullable: true })
  resourceId: string;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, unknown>;

  @Column({ name: 'ip_hash', length: 64, nullable: true })
  ipHash: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
