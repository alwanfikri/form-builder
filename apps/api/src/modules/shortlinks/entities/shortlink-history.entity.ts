import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { ShortlinkEntity } from './shortlink.entity';
import { FormEntity } from '../../forms/entities/form.entity';
import { UserEntity } from '../../auth/entities/user.entity';

@Entity('shortlink_history')
export class ShortlinkHistoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'shortlink_id' })
  shortlinkId: string;

  @ManyToOne(() => ShortlinkEntity, (s) => s.history)
  @JoinColumn({ name: 'shortlink_id' })
  shortlink: ShortlinkEntity;

  @Column({ name: 'form_id' })
  formId: string;

  @ManyToOne(() => FormEntity)
  @JoinColumn({ name: 'form_id' })
  form: FormEntity;

  @CreateDateColumn({ name: 'activated_at' })
  activatedAt: Date;

  @Column({ name: 'deactivated_at', type: 'timestamptz', nullable: true })
  deactivatedAt: Date;

  @Column({ default: '' })
  reason: string;

  @Column({ name: 'changed_by' })
  changedBy: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'changed_by' })
  changedByUser: UserEntity;
}
