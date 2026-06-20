import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Unique,
} from 'typeorm';

@Entity('users')
@Unique(['provider', 'providerId'])
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  name: string;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl: string;

  @Column({ length: 20 })
  provider: string;

  @Column({ name: 'provider_id' })
  providerId: string;

  @Column({ name: 'org_provider', length: 20 })
  orgProvider: string;

  @Column({ length: 20, default: 'editor' })
  role: string;

  @Column({ name: 'refresh_token', nullable: true })
  refreshToken: string;

  @Column({ name: 'access_token', nullable: true })
  accessToken: string;

  @Column({ name: 'token_expiry', type: 'timestamptz', nullable: true })
  tokenExpiry: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
