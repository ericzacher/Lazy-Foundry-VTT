# Phase 6: Production Hardening & Operational Excellence

**Duration:** 2-3 weeks
**Goal:** Harden application for production, add security controls, monitoring, resilience, and operational procedures
**Dependencies:** Phase 1-5 complete (all core features working)

---

## Overview

Phase 6 focuses on **production-grade hardening** rather than just polish:
- **Security:** Authentication, authorization, input validation, secrets management
- **Resilience:** Error handling, circuit breakers, graceful degradation, retries
- **Observability:** Structured logging, metrics, tracing, health checks
- **Reliability:** Testing, backup, disaster recovery, database hardening
- **Performance:** Caching, rate limiting, query optimization, connection pooling
- **Operations:** Deployment automation, monitoring, alerting, runbooks

---

## 1. Security Hardening

### 1.1 Authentication & Authorization

**Enhanced JWT Security (api/src/middleware/auth.ts):**

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || (() => {
  throw new Error('JWT_SECRET environment variable not set');
})();

const JWT_EXPIRY = '24h';
const REFRESH_TOKEN_EXPIRY = '7d';

interface TokenPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

export interface AuthRequest extends Request {
  userId?: string;
  email?: string;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.substring(7);
    
    // Verify token signature and expiry
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    
    // Check token age - refresh if older than 12 hours
    const ageHours = (Date.now() - decoded.iat * 1000) / (1000 * 60 * 60);
    if (ageHours > 12) {
      res.status(401).json({ error: 'Token expired, please refresh' });
      return;
    }

    req.userId = decoded.userId;
    req.email = decoded.email;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
    } else if (error instanceof jwt.InvalidTokenError) {
      res.status(401).json({ error: 'Invalid token' });
    } else {
      res.status(500).json({ error: 'Authentication failed' });
    }
  }
};

// Refresh token endpoint
export async function refreshToken(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token required' });
      return;
    }

    const decoded = jwt.verify(refreshToken, JWT_SECRET) as TokenPayload;
    
    // Issue new access token
    const newToken = jwt.sign(
      { userId: decoded.userId, email: decoded.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    res.json({ token: newToken });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
}
```

### 1.2 Input Validation & Sanitization

**Enhanced validation (api/src/middleware/validation.ts):**

```typescript
import { body, param, validationResult } from 'express-validator';
import { Response, NextFunction } from 'express';
import xss from 'xss';

// Sanitize user input to prevent XSS
const sanitize = (input: string): string => {
  return xss(input.trim(), {
    whiteList: {},
    stripIgnoredTag: true,
  });
};

export const validateEmail = body('email')
  .isEmail()
  .normalizeEmail()
  .withMessage('Invalid email address');

export const validatePassword = body('password')
  .isLength({ min: 12 })
  .withMessage('Password must be at least 12 characters')
  .matches(/[A-Z]/)
  .withMessage('Password must contain uppercase letter')
  .matches(/[0-9]/)
  .withMessage('Password must contain number')
  .matches(/[!@#$%^&*]/)
  .withMessage('Password must contain special character');

export const validateCampaignName = body('name')
  .trim()
  .isLength({ min: 1, max: 255 })
  .withMessage('Campaign name must be 1-255 characters')
  .customSanitizer((value) => sanitize(value));

// Validation error handler
export const handleValidationErrors = (req: any, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ 
      error: 'Validation failed',
      details: errors.array().map(e => ({
        field: e.param,
        message: e.msg
      }))
    });
    return;
  }
  next();
};
```

### 1.3 Rate Limiting

**Distributed rate limiting (api/src/middleware/rateLimit.ts):**

```typescript
import RedisStore from 'rate-limit-redis';
import rateLimit from 'express-rate-limit';
import redis from 'redis';

const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

// Login endpoint: 5 attempts per 15 minutes per IP
export const loginLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'login:',
  }),
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// API endpoints: 100 requests per minute per user
export const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'api:',
  }),
  windowMs: 60 * 1000,
  max: 100,
  keyGenerator: (req: any) => req.userId || req.ip,
  message: 'Too many requests, please try again later',
});

// AI generation: 10 per hour per user (expensive)
export const generationLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'generation:',
  }),
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req: any) => req.userId,
  message: 'Too many generation requests, limit is 10 per hour',
});
```

### 1.4 Secrets Management

**Environment-based secrets (api/.env.example):**

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/lazy_foundry
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=<generate with: openssl rand -base64 32>
JWT_EXPIRY=24h
REFRESH_TOKEN_EXPIRY=7d

# AI
GROQ_API_KEY=<from https://console.groq.com>
OPENAI_API_KEY=<optional fallback>

# Foundry VTT
FOUNDRY_URL=http://foundry:30000
FOUNDRY_ADMIN_KEY=<from Foundry configuration>

# Security
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_HTTPONLY=true

# Monitoring
SENTRY_DSN=<optional error tracking>
LOG_LEVEL=info
```

**Never commit .env, use secrets manager in production (Docker Compose secrets, AWS Secrets Manager, HashiCorp Vault, etc.)**

### 1.5 CORS & Security Headers

**Production CORS (api/src/index.ts):**

```typescript
import helmet from 'helmet';
import cors from 'cors';

const allowedOrigins = [
  process.env.CORS_ORIGIN || 'http://localhost:5173',
  ...(process.env.ADDITIONAL_ORIGINS?.split(',') || [])
];

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // tighten if possible
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.groq.com', 'https://api.openai.com'],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

### 1.6 SQL Injection Prevention

**Use parameterized queries (TypeORM already handles this):**

```typescript
// ✅ Good - TypeORM with parameters
const campaign = await campaignRepository.findOne({
  where: { id: campaignId, ownerId: userId }
});

// ❌ Bad - String concatenation (TypeORM prevents this, but never do it)
// const campaign = await db.query(`SELECT * FROM campaigns WHERE id = '${campaignId}'`);
```

---

## 2. Resilience & Error Handling

### 2.1 Graceful Error Handling

**Global error handler (api/src/middleware/errorHandler.ts):**

```typescript
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational: boolean = true
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      requestId: req.headers['x-request-id'],
    });
  }

  // Log unexpected errors for investigation
  logger.error('Unexpected error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    userId: (req as any).userId,
    requestId: req.headers['x-request-id'],
  });

  // Don't leak internal error details
  res.status(500).json({
    error: 'Internal server error',
    requestId: req.headers['x-request-id'],
  });
};

// Usage in route handlers
router.post('/sessions/:id/finalize', async (req, res, next) => {
  try {
    // ... route logic
  } catch (error) {
    next(error);
  }
});
```

### 2.2 Circuit Breaker for AI Calls

**Prevent cascading failures (api/src/services/aiCircuitBreaker.ts):**

```typescript
import CircuitBreaker from 'opossum';
import { logger } from '../utils/logger';

const aiCircuitBreaker = new CircuitBreaker(
  async (fn: () => Promise<any>) => fn(),
  {
    timeout: 30000, // 30 second timeout
    errorThresholdPercentage: 50, // Open if 50% fail
    resetTimeout: 60000, // Try again after 60s
    rollingCountTimeout: 10000, // 10s window
    name: 'AI Generation',
  }
);

aiCircuitBreaker.fallback(() => {
  logger.warn('Circuit breaker open, using fallback');
  return { fallback: true, message: 'AI service temporarily unavailable' };
});

aiCircuitBreaker.on('open', () => {
  logger.error('AI Circuit breaker opened');
});

export async function callAIWithFallback<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await aiCircuitBreaker.fire(() => fn());
  } catch (error) {
    logger.error('AI call failed after circuit breaker', { error });
    throw new AppError(503, 'AI service temporarily unavailable');
  }
}
```

### 2.3 Retry Logic

**Exponential backoff for transient failures (api/src/utils/retry.ts):**

```typescript
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on client errors (4xx)
      if (error instanceof AppError && error.statusCode < 500) {
        throw error;
      }

      if (attempt < maxRetries - 1) {
        const delayMs = initialDelayMs * Math.pow(2, attempt);
        logger.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delayMs}ms`, {
          error: lastError.message,
        });
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError!;
}

// Usage in sessions.ts
const result = await retryWithBackoff(() => autoSummarizeSession(...), 3);
```

---

## 3. Observability

### 3.1 Structured Logging

**JSON structured logging (api/src/utils/logger.ts):**

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'lazy-foundry-api',
    environment: process.env.NODE_ENV,
    version: process.env.VERSION || '0.0.1',
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
});

export { logger };

// Usage
logger.info('Session finalized', {
  sessionId: session.id,
  duration: completedDate - scheduledDate,
  eventCount: events.length,
  userId: req.userId,
});
```

### 3.2 Request Tracing

**Correlation IDs for request tracking (api/src/middleware/tracing.ts):**

```typescript
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const tracingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] as string || uuidv4();
  
  req.headers['x-request-id'] = requestId;
  res.setHeader('x-request-id', requestId);

  // Add to logs
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP request', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: (req as any).userId,
    });
  });

  next();
};
```

### 3.3 Health Checks

**Liveness and readiness probes (api/src/routes/health.ts):**

```typescript
router.get('/health/live', async (req: Request, res: Response) => {
  // Liveness: is the app running?
  res.json({ status: 'alive', timestamp: new Date().toISOString() });
});

router.get('/health/ready', async (req: Request, res: Response) => {
  try {
    // Readiness: can it handle requests?
    await AppDataSource.query('SELECT 1');
    
    // Check Redis
    const redisClient = redis.createClient();
    await redisClient.ping();
    
    res.json({ status: 'ready', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ 
      status: 'not ready',
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    });
  }
});

router.get('/health/metrics', async (req: Request, res: Response) => {
  // Prometheus-compatible metrics
  const metrics = {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: {
      connected: AppDataSource.isInitialized,
      poolSize: AppDataSource.driver?.pool?.idleCount,
    },
    api: {
      requestsPerSecond: metricsCollector.getRequestsPerSecond(),
      p95ResponseTime: metricsCollector.getP95ResponseTime(),
      errorRate: metricsCollector.getErrorRate(),
    }
  };
  res.json(metrics);
});
```

---

## 4. Database Hardening

### 4.1 Connection Pooling

**TypeORM connection pooling (api/src/config/database.ts):**

```typescript
export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: false, // Use migrations in production
  logging: process.env.NODE_ENV === 'development',
  entities: [...],
  migrations: ['src/migrations/*.ts'],
  
  // Connection pooling
  extra: {
    max: 20, // Maximum pool size
    min: 5,  // Minimum pool size
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
});
```

### 4.2 Database Indexes

**Strategic indexes (api/src/migrations/add-indexes.ts):**

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndexes1000000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // User queries
    await queryRunner.query(
      `CREATE INDEX CONCURRENTLY idx_users_email ON users(email)`
    );

    // Campaign queries
    await queryRunner.query(
      `CREATE INDEX CONCURRENTLY idx_campaigns_owner ON campaigns(owner_id, created_at)`
    );

    // Session queries
    await queryRunner.query(
      `CREATE INDEX CONCURRENTLY idx_sessions_campaign_number ON sessions(campaign_id, session_number)`
    );
    await queryRunner.query(
      `CREATE INDEX CONCURRENTLY idx_sessions_status ON sessions(status, completed_at)`
    );

    // NPC queries
    await queryRunner.query(
      `CREATE INDEX CONCURRENTLY idx_npcs_campaign ON npcs(campaign_id, name)`
    );

    // Timeline queries
    await queryRunner.query(
      `CREATE INDEX CONCURRENTLY idx_timeline_campaign ON timeline_events(campaign_id, session_number)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback indexes
  }
}
```

### 4.3 Backup & Recovery

**Automated backup strategy (docker-compose.prod.yml):**

```yaml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      # WAL archiving for PITR
      POSTGRES_INITDB_ARGS: >
        -c wal_level=replica
        -c max_wal_senders=5
        -c max_replication_slots=5
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  postgres-backup:
    image: postgres:15-alpine
    entrypoint: >
      sh -c "while true; do
        pg_dump -h postgres -U ${DB_USER} -d ${DB_NAME} > /backups/dump-\$(date +\"%Y%m%d-%H%M%S\").sql;
        find /backups -name 'dump-*.sql' -mtime +7 -delete;
        sleep 86400;
      done"
    volumes:
      - ./backups:/backups
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      PGPASSWORD: ${DB_PASSWORD}
```

---

## 5. Performance Optimization

### 5.1 Query Caching

**Redis caching with TTL (api/src/middleware/cache.ts):**

```typescript
import redis from 'redis';

const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

export async function cacheGet<T>(key: string): Promise<T | null> {
  const cached = await redisClient.get(key);
  return cached ? JSON.parse(cached) : null;
}

export async function cacheSet<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
  await redisClient.setEx(key, ttl, JSON.stringify(value));
}

// Usage in campaigns.ts
router.get('/:id/summary', async (req: AuthRequest, res: Response) => {
  const cacheKey = `campaign:${req.params.id}:summary`;
  
  let summary = await cacheGet(cacheKey);
  if (!summary) {
    summary = await getCampaignSummary(req.params.id);
    await cacheSet(cacheKey, summary, 3600); // Cache 1 hour
  }
  
  res.json({ summary });
});
```

### 5.2 Database Query Optimization

**Use SELECT fields, not SELECT * (api/src/routes/campaigns.ts):**

```typescript
// ✅ Good - select only needed fields
const campaigns = await campaignRepository.find({
  where: { ownerId: userId },
  select: ['id', 'name', 'setting', 'createdAt', 'updatedAt'],
  order: { updatedAt: 'DESC' },
  take: 10,
});

// ❌ Avoid - loads all columns, all relations
const campaigns = await campaignRepository.find({ ownerId: userId });
```

### 5.3 Pagination

**Cursor-based pagination for large datasets (api/src/utils/pagination.ts):**

```typescript
export async function paginateResults<T>(
  query: SelectQueryBuilder<T>,
  cursor?: string,
  limit: number = 20
): Promise<{ data: T[]; nextCursor?: string }> {
  if (cursor) {
    const decodedCursor = Buffer.from(cursor, 'base64').toString('utf-8');
    query.andWhere(`id > :cursor`, { cursor: decodedCursor });
  }

  const results = await query.take(limit + 1).getMany();

  return {
    data: results.slice(0, limit),
    nextCursor: results.length > limit
      ? Buffer.from(results[limit - 1].id).toString('base64')
      : undefined,
  };
}

// Usage
router.get('/campaigns', async (req, res) => {
  const { cursor, limit } = req.query;
  const { data, nextCursor } = await paginateResults(
    campaignRepository.createQueryBuilder(),
    cursor as string,
    parseInt(limit as string) || 20
  );
  res.json({ campaigns: data, nextCursor });
});
```

---

## 6. Testing Strategy

### 6.1 Integration Tests

**Complete workflow tests (api/tests/integration.test.ts):**

```typescript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import app from '../src/index';

describe('Complete Campaign Workflow', () => {
  let token: string;
  let campaignId: string;
  let sessionId: string;

  beforeEach(async () => {
    // Setup: register and login
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'TestPassword123!' });
    token = res.body.token;
  });

  it('should create campaign, generate content, and finalize session', async () => {
    // 1. Create campaign
    const campaign = await request(app)
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test', setting: 'Fantasy' });
    expect(campaign.status).toBe(201);
    campaignId = campaign.body.id;

    // 2. Generate lore
    const lore = await request(app)
      .post(`/api/generate/campaigns/${campaignId}/lore`)
      .set('Authorization', `Bearer ${token}`);
    expect(lore.status).toBe(200);

    // 3. Create session
    const session = await request(app)
      .post(`/api/campaigns/${campaignId}/sessions`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Session 1' });
    expect(session.status).toBe(201);
    sessionId = session.body.id;

    // 4. Generate scenario
    const scenario = await request(app)
      .post(`/api/generate/sessions/${sessionId}/scenario`)
      .set('Authorization', `Bearer ${token}`);
    expect(scenario.status).toBe(200);

    // 5. Finalize session
    const finalize = await request(app)
      .post(`/api/sessions/${sessionId}/finalize`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        summary: 'Test session',
        events: ['Event 1'],
        playerDecisions: ['Decision 1'],
      });
    expect(finalize.status).toBe(200);
  });
});
```

### 6.2 Load Testing

**Stress test with k6 (load-test.js):**

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '5m', target: 200 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.1'],
  },
};

export default function () {
  const url = 'http://localhost:3001/api/campaigns';
  const payload = JSON.stringify({
    name: `Campaign ${Date.now()}`,
    setting: 'Fantasy',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer valid_token_here',
    },
  };

  const res = http.post(url, payload, params);
  check(res, {
    'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

Run with: `k6 run load-test.js`

---

## 7. Deployment & Operations

### 7.1 Docker Compose Production

**Production-hardened docker-compose.yml:**

```yaml
version: '3.9'

services:
  # PostgreSQL with replication & backups
  postgres:
    image: postgres:15-alpine
    restart: always
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    networks:
      - backend

  # Redis for caching & session store
  redis:
    image: redis:7-alpine
    restart: always
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - backend

  # API server
  api:
    build: ./api
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health/ready"]
      interval: 30s
      timeout: 10s
      retries: 3
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      JWT_SECRET: ${JWT_SECRET}
      GROQ_API_KEY: ${GROQ_API_KEY}
      FOUNDRY_URL: ${FOUNDRY_URL}
      FOUNDRY_ADMIN_KEY: ${FOUNDRY_ADMIN_KEY}
      LOG_LEVEL: info
      SENTRY_DSN: ${SENTRY_DSN}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    expose:
      - "3001"
    networks:
      - backend

  # Frontend
  web:
    build: ./web
    restart: always
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:5173/"]
      interval: 30s
      timeout: 10s
      retries: 3
    expose:
      - "5173"
    networks:
      - frontend

  # Nginx reverse proxy
  nginx:
    image: nginx:1.25-alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl/certs:/etc/nginx/certs:ro
      - ./logs:/var/log/nginx
    depends_on:
      - api
      - web
    networks:
      - frontend
      - backend

networks:
  backend:
    driver: bridge
  frontend:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
```

### 7.2 Kubernetes Deployment

**Production K8s manifests (k8s/deployment.yaml):**

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: lazy-foundry

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: api-config
  namespace: lazy-foundry
data:
  LOG_LEVEL: "info"
  NODE_ENV: "production"

---
apiVersion: v1
kind: Secret
metadata:
  name: api-secrets
  namespace: lazy-foundry
type: Opaque
stringData:
  JWT_SECRET: ${JWT_SECRET}
  DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
  GROQ_API_KEY: ${GROQ_API_KEY}

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: lazy-foundry
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
      - name: api
        image: lazy-foundry-api:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 3001
        envFrom:
        - configMapRef:
            name: api-config
        - secretRef:
            name: api-secrets
        resources:
          requests:
            cpu: 250m
            memory: 512Mi
          limits:
            cpu: 1000m
            memory: 1Gi
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 5
          failureThreshold: 3
        securityContext:
          runAsNonRoot: true
          readOnlyRootFilesystem: true
          allowPrivilegeEscalation: false
        volumeMounts:
        - name: tmp
          mountPath: /tmp
      volumes:
      - name: tmp
        emptyDir: {}
      securityContext:
        fsGroup: 1000

---
apiVersion: v1
kind: Service
metadata:
  name: api
  namespace: lazy-foundry
spec:
  type: ClusterIP
  selector:
    app: api
  ports:
  - port: 3001
    targetPort: 3001
```

### 7.3 Monitoring & Alerting

**Prometheus monitoring (prometheus.yml):**

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
  - static_configs:
    - targets:
      - alertmanager:9093

rule_files:
  - 'alerts.yml'

scrape_configs:
  - job_name: 'api'
    static_configs:
      - targets: ['api:3001']
    metrics_path: '/metrics'
    scrape_interval: 10s
```

**Alert rules (alerts.yml):**

```yaml
groups:
  - name: api
    rules:
    - alert: HighErrorRate
      expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
      for: 5m
      annotations:
        summary: "High error rate detected"

    - alert: SlowResponseTime
      expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
      for: 5m
      annotations:
        summary: "Slow response times"

    - alert: DatabaseDown
      expr: pg_up == 0
      for: 1m
      annotations:
        summary: "Database is down"

    - alert: HighCPUUsage
      expr: (1 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m]))) > 0.8
      for: 5m
      annotations:
        summary: "High CPU usage"
```

---

## 8. Runbooks & Operational Procedures

### 8.1 Incident Response

**incident-response.md:**

```markdown
## High Error Rate Response

1. **Check logs**: `docker logs lazy-foundry-api | grep ERROR | tail -50`
2. **Check metrics**: Navigate to Prometheus dashboard
3. **Check database**: `SELECT COUNT(*) FROM sessions WHERE created_at > now() - interval '5 minutes'`
4. **Check circuit breakers**: See if AI service is open
5. **Restart if needed**: `docker restart lazy-foundry-api`
6. **Check for deployments**: See if recent changes caused issue

## Database Performance Degradation

1. Run EXPLAIN on slow queries
2. Check index usage: `SELECT * FROM pg_stat_user_indexes`
3. Vacuum if needed: `VACUUM ANALYZE`
4. Check for missing indexes
5. Look for long-running transactions: `SELECT * FROM pg_stat_activity`
```

### 8.2 Backup & Recovery

**Backup schedule:**
- Daily database dumps (7-day rotation)
- Redis snapshots (hourly)
- Application logs to S3 (hourly, 30-day retention)

**Recovery procedure:**
```bash
# Restore from backup
docker exec lazy-foundry-postgres psql -U user -d db < backups/dump-20240101-120000.sql

# Verify data integrity
docker exec lazy-foundry-postgres pg_dump -d db | md5sum
```

---

## 9. Compliance & Security Checklist

- [ ] All secrets in environment variables (not in code)
- [ ] HTTPS enforced (no HTTP)
- [ ] Password requirements enforced (12+ chars, mixed case, numbers, symbols)
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (input sanitization, CSP headers)
- [ ] CSRF protection on state-changing operations
- [ ] Rate limiting on auth endpoints
- [ ] Audit logging for sensitive operations
- [ ] Data encryption at rest (database)
- [ ] Data encryption in transit (TLS)
- [ ] Regular security audits
- [ ] Penetration testing
- [ ] GDPR compliance (data export, deletion)
- [ ] Access logging for compliance

---

## 10. Success Criteria

✅ **Security:**
- Zero OWASP Top 10 vulnerabilities
- Secrets management verified
- Rate limiting working
- Input validation comprehensive

✅ **Reliability:**
- 99.9% uptime SLA
- Database backups automated
- Health checks passing
- Graceful error handling

✅ **Performance:**
- API p95 < 500ms
- AI generation < 30s
- Zero SQL N+1 queries
- Cache hit rate > 80%

✅ **Operations:**
- Automated deployment working
- Monitoring & alerting active
- Runbooks documented
- On-call procedures defined

---

## 11. Production Deployment Checklist

Before going live:

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] SSL certificates installed
- [ ] Backup system verified
- [ ] Monitoring alerts configured
- [ ] Log aggregation setup
- [ ] Team trained on runbooks
- [ ] Incident response plan ready
- [ ] Load testing completed
- [ ] Security audit passed
- [ ] Disaster recovery tested
- [ ] Failover procedures documented

Phase 6 complete: Your application is production-ready, secure, and operationally sound.
