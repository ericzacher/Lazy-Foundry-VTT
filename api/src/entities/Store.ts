import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('stores')
export class Store {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { nullable: true })
  campaignId?: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar' })
  storeType!: string;

  @Column({ type: 'jsonb' })
  parameters!: Record<string, unknown>;

  @Column({ type: 'jsonb' })
  data!: Record<string, unknown>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
