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
import { NPC } from './NPC';

@Entity('tokens')
export class Token {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  campaignId!: string;

  @ManyToOne(() => Campaign)
  @JoinColumn({ name: 'campaignId' })
  campaign!: Campaign;

  @Column({ type: 'uuid', nullable: true })
  npcId?: string;

  @ManyToOne(() => NPC, { nullable: true })
  @JoinColumn({ name: 'npcId' })
  npc?: NPC;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', nullable: true })
  imageUrl?: string;

  // Foundry VTT token properties
  @Column({ type: 'varchar', default: 'character' })
  type!: string; // 'character', 'npc', 'creature'

  @Column({ type: 'varchar', default: 'medium' })
  size!: string; // 'tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'

  @Column({ type: 'float', default: 1 })
  width!: number; // Grid units (0.5 for tiny, 1 for small/medium, 2 for large, etc.)

  @Column({ type: 'float', default: 1 })
  height!: number; // Grid units

  @Column({ type: 'float', default: 1.0 })
  scale!: number; // Visual scale multiplier (1.0 = 100%)

  // Foundry VTT vision and detection properties
  @Column({ type: 'jsonb', nullable: true })
  vision?: {
    enabled: boolean;
    range: number; // In grid units
    angle: number; // 0-360 degrees
    visionMode: string; // 'basic', 'darkvision', 'blindsight', etc.
    color?: string;
    attenuation: number;
    brightness: number;
    saturation: number;
    contrast: number;
  };

  // Foundry VTT detection modes
  @Column({ type: 'jsonb', nullable: true })
  detection?: {
    basicSight?: { enabled: boolean; range: number };
    seeInvisibility?: { enabled: boolean; range: number };
    senseInvisibility?: { enabled: boolean; range: number };
    feelTremor?: { enabled: boolean; range: number };
  };

  // Additional Foundry-compatible metadata
  @Column({ type: 'jsonb', nullable: true })
  foundryData?: {
    actorId?: string; // Linked actor ID in Foundry
    actorLink: boolean; // Whether token is linked to actor data
    disposition: number; // -1=hostile, 0=neutral, 1=friendly
    displayName: number; // 0=none, 10=control, 20=owner hover, 30=hover, 40=owner, 50=always
    displayBars: number; // 0=none, 10=control, 20=owner hover, 30=hover, 40=owner, 50=always
    bar1?: { attribute: string }; // Health bar
    bar2?: { attribute: string }; // Secondary bar
    rotation: number; // 0-360 degrees
    alpha: number; // 0-1 opacity
    lockRotation: boolean;
    hidden: boolean;
    elevation: number;
    effects: string[]; // Effect icon paths
    overlayEffect?: string;
    light?: {
      alpha: number;
      angle: number;
      bright: number;
      dim: number;
      color: string;
      animation: {
        type: string;
        speed: number;
        intensity: number;
      };
    };
  };

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
