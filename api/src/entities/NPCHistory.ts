import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { NPC } from './NPC';
import { Session } from './Session';

@Entity('npc_history')
export class NPCHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  npcId!: string;

  @ManyToOne(() => NPC)
  @JoinColumn({ name: 'npcId' })
  npc!: NPC;

  @Column('uuid')
  sessionId!: string;

  @ManyToOne(() => Session)
  @JoinColumn({ name: 'sessionId' })
  session!: Session;

  @Column({ type: 'varchar', length: 50, nullable: true })
  alignmentBefore?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  alignmentAfter?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  loyaltyBefore?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  loyaltyAfter?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  statusBefore?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  statusAfter?: string;

  @Column({ type: 'text', nullable: true })
  relationshipChange?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'jsonb', nullable: true })
  eventsInvolved?: string[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
