import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Campaign } from './Campaign';
import { SessionResult } from './SessionResult';

export enum SessionStatus {
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  campaignId!: string;

  @ManyToOne(() => Campaign, (campaign) => campaign.sessions)
  @JoinColumn({ name: 'campaignId' })
  campaign!: Campaign;

  @Column({ type: 'int' })
  sessionNumber!: number;

  @Column({ type: 'varchar' })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'timestamp', nullable: true })
  scheduledDate?: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedDate?: Date;

  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.PLANNED,
  })
  status!: SessionStatus;

  @Column({ type: 'jsonb', nullable: true })
  scenario?: Record<string, unknown>;

  @Column({ type: 'uuid', array: true, default: [] })
  npcIds!: string[];

  @Column({ type: 'uuid', array: true, default: [] })
  mapIds!: string[];

  @OneToOne(() => SessionResult, (result) => result.session)
  result?: SessionResult;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
