import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { ShortlinkEntity } from './shortlink.entity';
import { FormEntity } from '../../forms/entities/form.entity';

@Entity('external_sessions')
export class ExternalSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'shortlink_id' })
  shortlinkId: string;

  @ManyToOne(() => ShortlinkEntity)
  @JoinColumn({ name: 'shortlink_id' })
  shortlink: ShortlinkEntity;

  @Column({ name: 'session_token', length: 64, unique: true })
  sessionToken: string;

  @Column({ name: 'respondent_hash', length: 64, nullable: true })
  respondentHash: string;

  @Column({ name: 'respondent_fingerprint', type: 'jsonb', nullable: true })
  respondentFingerprint: Record<string, unknown>;

  @CreateDateColumn({ name: 'access_granted_at' })
  accessGrantedAt: Date;

  @Column({ name: 'access_expires_at', type: 'timestamptz' })
  accessExpiresAt: Date;

  @Column({ name: 'response_started', default: false })
  responseStarted: boolean;

  @Column({ name: 'response_completed', default: false })
  responseCompleted: boolean;

  @Column({ name: 'form_id' })
  formId: string;

  @ManyToOne(() => FormEntity)
  @JoinColumn({ name: 'form_id' })
  form: FormEntity;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  // Populated at runtime (not stored)
  token?: string;
}
