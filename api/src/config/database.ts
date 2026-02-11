import { DataSource } from 'typeorm';
import { User } from '../entities/User';
import { Campaign } from '../entities/Campaign';
import { Session } from '../entities/Session';
import { SessionResult } from '../entities/SessionResult';
import { NPC } from '../entities/NPC';
import { Map } from '../entities/Map';
import { Token } from '../entities/Token';
import { NPCHistory } from '../entities/NPCHistory';
import { TimelineEvent } from '../entities/TimelineEvent';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: process.env.NODE_ENV === 'development', // Never true in production
  logging: process.env.NODE_ENV === 'development',
  entities: [User, Campaign, Session, SessionResult, NPC, Map, Token, NPCHistory, TimelineEvent],
  migrations: ['src/migrations/*.ts'],
  subscribers: [],
  
  // Connection pooling configuration
  extra: {
    max: parseInt(process.env.DB_POOL_MAX || '20'), // Maximum pool size
    min: parseInt(process.env.DB_POOL_MIN || '5'),  // Minimum pool size
    idleTimeoutMillis: 30000, // Close idle connections after 30s
    connectionTimeoutMillis: 5000, // Timeout for acquiring connection
  },
});
