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

@Entity('npcs')
export class NPC {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  campaignId!: string;

  @ManyToOne(() => Campaign, (campaign) => campaign.npcs)
  @JoinColumn({ name: 'campaignId' })
  campaign!: Campaign;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar', nullable: true })
  role?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'jsonb', nullable: true })
  personality?: Record<string, unknown>;

  @Column({ type: 'text', array: true, default: [] })
  motivations!: string[];

  @Column({ type: 'text', nullable: true })
  background?: string;

  @Column({ type: 'jsonb', nullable: true })
  stats?: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  combatStats?: Record<string, unknown>;

  @Column({ type: 'varchar', nullable: true })
  tokenImageUrl?: string;

  @Column({ type: 'uuid', array: true, default: [] })
  encounterSessionIds!: string[];

  @Column({ type: 'varchar', nullable: true })
  foundryActorId?: string;

  @Column({ type: 'timestamp', nullable: true })
  lastSyncedAt?: Date;

  @Column({ type: 'varchar', nullable: true })
  syncStatus?: 'never' | 'pending' | 'synced' | 'error';

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
