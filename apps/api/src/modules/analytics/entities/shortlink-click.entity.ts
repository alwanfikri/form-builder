import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { ShortlinkEntity } from '../../shortlinks/entities/shortlink.entity';

@Entity('shortlink_clicks')
export class ShortlinkClickEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'shortlink_id' })
  shortlinkId: string;

  @ManyToOne(() => ShortlinkEntity)
  @JoinColumn({ name: 'shortlink_id' })
  shortlink: ShortlinkEntity;

  @CreateDateColumn({ name: 'clicked_at' })
  clickedAt: Date;

  @Column({ name: 'ip_hash', length: 64, nullable: true })
  ipHash: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent: string;

  @Column({ nullable: true })
  referrer: string;

  @Column({ length: 2, nullable: true })
  country: string;

  @Column({ name: 'device_type', length: 20, nullable: true })
  deviceType: string;

  @Column({ name: 'is_unique', default: false })
  isUnique: boolean;
}
