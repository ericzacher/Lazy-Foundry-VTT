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

  @CreateDateColumn()
  capturedAt!: Date;
}
