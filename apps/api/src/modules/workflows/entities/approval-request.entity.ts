import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, OneToMany,
} from 'typeorm';
import { ApprovalStepEntity } from './approval-step.entity';

@Entity('approval_requests')
export class ApprovalRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'form_id' })
  formId: string;

  @Column({ name: 'response_ref' })
  responseRef: string;

  @Column({ name: 'shortlink_id', nullable: true })
  shortlinkId: string;

  @Column({ length: 20, default: 'pending' })
  status: string;

  @Column({ name: 'workflow_config', type: 'jsonb' })
  workflowConfig: Record<string, unknown>;

  @Column({ name: 'current_step', default: 0 })
  currentStep: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date;

  @Column({ name: 'resolved_by', nullable: true })
  resolvedBy: string;

  @OneToMany(() => ApprovalStepEntity, (s) => s.approvalRequest)
  steps: ApprovalStepEntity[];
}
