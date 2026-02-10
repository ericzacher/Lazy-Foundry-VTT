import { DataSource } from 'typeorm';
import { User } from '../entities/User';
import { Campaign } from '../entities/Campaign';
import { Session } from '../entities/Session';
import { SessionResult } from '../entities/SessionResult';
import { NPC } from '../entities/NPC';
import { Map } from '../entities/Map';
import { Token } from '../entities/Token';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development',
  entities: [User, Campaign, Session, SessionResult, NPC, Map, Token],
  migrations: ['src/migrations/*.ts'],
  subscribers: [],
});
