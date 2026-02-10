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

export enum MapType {
  DUNGEON = 'dungeon',
  TAVERN = 'tavern',
  WILDERNESS = 'wilderness',
  TOWN = 'town',
  CASTLE = 'castle',
  CAVE = 'cave',
  OTHER = 'other',
}

@Entity('maps')
export class Map {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  campaignId!: string;

  @ManyToOne(() => Campaign, (campaign) => campaign.maps)
  @JoinColumn({ name: 'campaignId' })
  campaign!: Campaign;

  @Column({ type: 'uuid', nullable: true })
  sessionId?: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: MapType,
    default: MapType.OTHER,
  })
  type!: MapType;

  @Column({ type: 'int', default: 50 })
  gridSize!: number;

  @Column({ type: 'jsonb', nullable: true })
  dimensions?: { width: number; height: number };

  @Column({ type: 'varchar', nullable: true })
  imageUrl?: string;

  @Column({ type: 'varchar', nullable: true })
  foundrySceneId?: string;

  @Column({ type: 'jsonb', nullable: true })
  details?: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  foundryData?: Record<string, unknown>;

  @Column({ type: 'int', default: 1 })
  version!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
