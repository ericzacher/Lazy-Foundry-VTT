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

export enum PlayerStatus {
  INVITED = 'invited',
  JOINED = 'joined',
  READY = 'ready',
}

@Entity('campaign_players')
export class CampaignPlayer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  campaignId!: string;

  @ManyToOne(() => Campaign, (campaign) => campaign.players, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaignId' })
  campaign!: Campaign;

  @Column({ type: 'varchar' })
  playerName!: string;

  @Column({ type: 'varchar', nullable: true })
  foundryUserId?: string;

  @Column({ type: 'varchar', nullable: true })
  foundryActorId?: string;

  @Column({ type: 'varchar', nullable: true })
  characterName?: string;

  @Column({ type: 'jsonb', nullable: true })
  characterData?: Record<string, unknown>;

  @Column({
    type: 'enum',
    enum: PlayerStatus,
    default: PlayerStatus.INVITED,
  })
  status!: PlayerStatus;

  @CreateDateColumn()
  invitedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  joinedAt?: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
