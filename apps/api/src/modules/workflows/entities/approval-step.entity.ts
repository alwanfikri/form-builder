import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
} from 'typeorm';
import { ApprovalRequestEntity } from './approval-request.entity';

@Entity('approval_steps')
export class ApprovalStepEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'approval_request_id' })
  approvalRequestId: string;

  @ManyToOne(() => ApprovalRequestEntity, (r) => r.steps)
  @JoinColumn({ name: 'approval_request_id' })
  approvalRequest: ApprovalRequestEntity;

  @Column({ name: 'step_order' })
  stepOrder: number;

  @Column({ name: 'approver_email' })
  approverEmail: string;

  @Column({ length: 20, default: 'pending' })
  status: string;

  @Column({ nullable: true })
  comment: string;

  @Column({ name: 'decided_at', type: 'timestamptz', nullable: true })
  decidedAt: Date;

  @Column({ length: 64, unique: true, nullable: true })
  token: string;
}
