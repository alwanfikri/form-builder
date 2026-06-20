import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';
import { FormEntity } from '../../forms/entities/form.entity';
import { ShortlinkHistoryEntity } from './shortlink-history.entity';
import type { ShortlinkAccessConfig } from '@form-builder/shared';

@Entity('shortlinks')
export class ShortlinkEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'short_code', length: 30 })
  shortCode: string;

  @Column({ name: 'current_form_id' })
  currentFormId: string;

  @ManyToOne(() => FormEntity)
  @JoinColumn({ name: 'current_form_id' })
  currentForm: FormEntity;

  @Column({ length: 20, default: 'active' })
  status: string;

  @Column({ name: 'access_type', length: 20, default: 'public' })
  accessType: string;

  @Column({ name: 'access_config', type: 'jsonb', default: {} })
  accessConfig: ShortlinkAccessConfig;

  @Column({ name: 'fallback_url', nullable: true })
  fallbackUrl: string;

  @Column({ name: 'total_clicks', default: 0 })
  totalClicks: number;

  @Column({ name: 'unique_clicks', default: 0 })
  uniqueClicks: number;

  @Column({ name: 'created_by' })
  createdBy: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'created_by' })
  creator: UserEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date;

  @Column({ name: 'archived_at', type: 'timestamptz', nullable: true })
  archivedAt: Date;

  @OneToMany(() => ShortlinkHistoryEntity, (h) => h.shortlink)
  history: ShortlinkHistoryEntity[];
}
