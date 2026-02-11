import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Campaign } from './Campaign';
import { Session } from './Session';

@Entity('timeline_events')
export class TimelineEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  campaignId!: string;

  @ManyToOne(() => Campaign)
  @JoinColumn({ name: 'campaignId' })
  campaign!: Campaign;

  @Column({ type: 'uuid', nullable: true })
  sessionId?: string;

  @ManyToOne(() => Session, { nullable: true })
  @JoinColumn({ name: 'sessionId' })
  session?: Session;

  @Column({ type: 'varchar', length: 100 })
  eventDate!: string;

  @Column({ type: 'int', nullable: true })
  sessionNumber?: number;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 50 })
  eventType!: string;

  @Column({ type: 'varchar', length: 50 })
  significance!: string;

  @Column({ type: 'jsonb', nullable: true })
  peopleInvolved?: string[];

  @Column({ type: 'jsonb', nullable: true })
  locations?: string[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
