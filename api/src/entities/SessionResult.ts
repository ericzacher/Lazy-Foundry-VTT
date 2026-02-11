import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Session } from './Session';

@Entity('session_results')
export class SessionResult {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  sessionId!: string;

  @OneToOne(() => Session, (session) => session.result)
  @JoinColumn({ name: 'sessionId' })
  session!: Session;

  @Column({ type: 'text', nullable: true })
  summary?: string;

  @Column({ type: 'text', array: true, default: [] })
  events!: string[];

  @Column({ type: 'jsonb', nullable: true })
  npcInteractions?: Record<string, unknown>;

  @Column({ type: 'text', array: true, default: [] })
  playerDecisions!: string[];

  @Column({ type: 'jsonb', nullable: true })
  worldChanges?: Record<string, unknown>;

  @Column({ type: 'text', array: true, default: [] })
  unfinishedThreads!: string[];

  // Phase 5: Story continuity
  @Column({ type: 'text', nullable: true })
  plotAdvancement?: string;

  @Column({ type: 'jsonb', nullable: true })
  characterDevelopment?: Record<string, unknown>;

  // Phase 5: Session metadata
  @Column({ type: 'int', nullable: true })
  durationMinutes?: number;

  @Column({ type: 'int', nullable: true })
  xpAwarded?: number;

  @Column({ type: 'jsonb', nullable: true })
  lootAwarded?: Record<string, unknown>;

  @Column({ type: 'int', default: 0 })
  deathCount!: number;

  // Phase 5: Capture method
  @Column({ type: 'varchar', length: 50, nullable: true })
  captureMethod?: string;

  @Column({ type: 'text', nullable: true })
  transcript?: string;

  // Phase 5: Session tone
  @Column({ type: 'varchar', length: 50, nullable: true })
  mood?: string;

  @CreateDateColumn()
  capturedAt!: Date;
}
