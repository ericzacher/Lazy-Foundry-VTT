import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './User';
import { Session } from './Session';
import { NPC } from './NPC';
import { Map } from './Map';

@Entity('campaigns')
export class Campaign {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', nullable: true })
  setting?: string;

  @Column({ type: 'varchar', nullable: true })
  theme?: string;

  @Column({ type: 'varchar', nullable: true })
  tone?: string;

  @Column({ type: 'int', default: 4 })
  playerCount!: number;

  @Column({ type: 'int', default: 3 })
  partyLevel!: number;

  @Column({ type: 'jsonb', nullable: true })
  worldLore?: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  rules?: Record<string, unknown>;

  @Column('uuid')
  ownerId!: string;

  @ManyToOne(() => User, (user) => user.campaigns)
  @JoinColumn({ name: 'ownerId' })
  owner!: User;

  @OneToMany(() => Session, (session) => session.campaign)
  sessions!: Session[];

  @OneToMany(() => NPC, (npc) => npc.campaign)
  npcs!: NPC[];

  @OneToMany(() => Map, (map) => map.campaign)
  maps!: Map[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
