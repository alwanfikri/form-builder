import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';
import type {
  FormSettings, FormField, FormLayout, FormWorkflow,
  StorageConfig, DatabaseConfig,
} from '@form-builder/shared';

@Entity('forms')
export class FormEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ length: 20, default: 'draft' })
  status: string;

  @Column({ name: 'created_by' })
  createdBy: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'created_by' })
  creator: UserEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'response_count', default: 0 })
  responseCount: number;

  @Column({ type: 'jsonb' })
  settings: FormSettings;

  @Column({ type: 'jsonb', default: [] })
  fields: FormField[];

  @Column({ type: 'jsonb' })
  layout: FormLayout;

  @Column({ type: 'jsonb' })
  workflow: FormWorkflow;

  @Column({ name: 'storage_config', type: 'jsonb', nullable: true })
  storageConfig: StorageConfig;

  @Column({ name: 'database_config', type: 'jsonb', nullable: true })
  databaseConfig: DatabaseConfig;
}
