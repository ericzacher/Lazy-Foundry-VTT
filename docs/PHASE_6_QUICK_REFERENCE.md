# Phase 6 - Quick Reference Guide

## 🚀 Getting Started with Phase 6 Features

### Environment Setup

Make sure your `.env` file includes these new variables:

```bash
# JWT Configuration
JWT_SECRET=your-super-secret-key-here  # Generate with: openssl rand -base64 32
JWT_EXPIRY=24h
REFRESH_TOKEN_EXPIRY=7d

# Database Connection Pooling
DB_POOL_MAX=20
DB_POOL_MIN=5

# CORS
CORS_ORIGIN=http://localhost:3000

# Logging
LOG_LEVEL=info  # Options: error, warn, info, debug
```

---

## 🔐 Enhanced Authentication

### Using Token Refresh

```typescript
// Login - returns both access and refresh tokens
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "YourPassword123"
}

Response:
{
  "user": { "id": "...", "email": "...", "username": "..." },
  "token": "eyJhbGc...",  // Access token (24h)
  "refreshToken": "eyJhbGc..."  // Refresh token (7d)
}

// Refresh expired token
POST /api/auth/refresh
{
  "refreshToken": "eyJhbGc..."
}

Response:
{
  "token": "eyJhbGc...",  // New access token
  "refreshToken": "eyJhbGc..."  // New refresh token
}
```

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one number

---

## 📊 Health Checks & Monitoring

### Health Endpoints

```bash
# Liveness check - Is the application running?
curl http://localhost:3001/health/live

# Readiness check - Can it handle traffic?
curl http://localhost:3001/health/ready

# Metrics - Performance data
curl http://localhost:3001/health/metrics
```

### Kubernetes/Docker Health Checks

Already configured in `docker-compose.yml`:

```yaml
healthcheck:
  test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3001/health/ready"]
  interval: 30s
  timeout: 10s
  retries: 3
```

---

## 📝 Structured Logging

### Using the Logger

```typescript
import { logInfo, logError, logWarn, logDebug } from './utils/logger';

// Info logging
logInfo('User created campaign', {
  userId: user.id,
  campaignId: campaign.id,
  campaignName: campaign.name
});

// Error logging
logError('Failed to sync with Foundry', {
  error: error.message,
  campaignId: campaign.id
});

// Warning logging
logWarn('Slow query detected', {
  query: 'SELECT * FROM campaigns',
  duration: 2500
});

// Debug logging (only in debug mode)
logDebug('Database query', {
  sql: 'SELECT ...',
  params: [...]
});
```

### Log Output Format

All logs are JSON-formatted for easy parsing:

```json
{
  "timestamp": "2026-02-10T12:34:56.789Z",
  "level": "info",
  "message": "User created campaign",
  "service": "lazy-foundry-api",
  "environment": "production",
  "userId": "123",
  "campaignId": "456"
}
```

---

## 🔍 Request Tracing

Every request gets a unique correlation ID (`x-request-id`):

```bash
curl -H "x-request-id: my-custom-id" http://localhost:3001/api/campaigns

# Or let it auto-generate
curl http://localhost:3001/api/campaigns
# Response includes: x-request-id: a1b2c3d4-e5f6-...
```

All logs for that request will include the same `requestId`, making debugging easy.

---

## 🚨 Error Handling

### Using AppError

```typescript
import { AppError } from './middleware/errorHandler';

// Throw operational errors
if (!campaign) {
  throw new AppError(404, 'Campaign not found');
}

if (!user.hasPermission) {
  throw new AppError(403, 'Insufficient permissions');
}

// Will automatically be caught by global error handler
```

### Error Response Format

```json
{
  "error": "Campaign not found",
  "requestId": "a1b2c3d4-e5f6-..."
}
```

---

## 💾 Caching

### Using the Cache

```typescript
import { cached, cacheSet, cacheGet } from './utils/cache';

// Cache-aside pattern (recommended)
const campaign = await cached(
  `campaign:${campaignId}`,
  async () => {
    return await campaignRepository.findOne({ where: { id: campaignId } });
  },
  3600  // TTL in seconds (1 hour)
);

// Manual cache management
await cacheSet('key', data, 1800);  // 30 minutes
const data = await cacheGet('key');
```

---

## 📄 Pagination

### Using Pagination

```typescript
import { paginate, getPaginationParams } from './utils/pagination';

// In your route handler
router.get('/campaigns', async (req, res) => {
  const params = getPaginationParams(req.query);
  
  const allCampaigns = await campaignRepository.find();
  const result = await paginate(allCampaigns, params);
  
  res.json({
    campaigns: result.data,
    nextCursor: result.nextCursor,
    hasMore: result.hasMore
  });
});
```

### API Usage

```bash
# First page
GET /api/campaigns?limit=20

# Next page (use cursor from previous response)
GET /api/campaigns?limit=20&cursor=eyJpZCI6ImFiYzEyMyJ9
```

---

## 🔄 Retry Logic

### Using Retry with Backoff

```typescript
import { retryWithBackoff } from './utils/retry';

// Retry AI calls
const result = await retryWithBackoff(
  async () => await callGroqAPI(prompt),
  {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000
  }
);

// Custom retry logic
const data = await retryWithBackoff(
  async () => await fetchExternalAPI(),
  {
    shouldRetry: (error) => {
      // Don't retry on 4xx errors
      return error.statusCode >= 500;
    }
  }
);
```

---

## 🗄️ Database Indexes

### Running the Index Migration

```bash
# Apply indexes (uses CONCURRENTLY for zero downtime)
docker exec -i lazy-foundry-db psql -U postgres -d lazy_foundry < api/migrations/add-indexes.sql

# Verify indexes
docker exec -i lazy-foundry-db psql -U postgres -d lazy_foundry -c "\di"
```

---

## 🐳 Docker Commands

### Starting the Application

```bash
# Development mode
docker compose up

# Production mode (with health checks)
docker compose up -d

# Check health
docker compose ps

# View logs
docker compose logs -f api

# Restart specific service
docker compose restart api
```

### Viewing Structured Logs

```bash
# Pretty-print JSON logs
docker compose logs api | jq .

# Filter by log level
docker compose logs api | jq 'select(.level == "error")'

# Filter by user
docker compose logs api | jq 'select(.userId == "123")'
```

---

## 🔒 Security Best Practices

### Before Production

1. **Generate secure JWT secret:**
```bash
openssl rand -base64 32
```

2. **Update .env with production values:**
```bash
NODE_ENV=production
JWT_SECRET=<your-generated-secret>
CORS_ORIGIN=https://yourdomain.com
```

3. **Enable security features:**
   - Helmet.js headers (already enabled)
   - HTTPS only (configure reverse proxy)
   - Rate limiting (optional - implement if needed)

4. **Database backups:**
```bash
# Manual backup
docker exec lazy-foundry-db pg_dump -U postgres lazy_foundry > backup.sql

# Restore
docker exec -i lazy-foundry-db psql -U postgres lazy_foundry < backup.sql
```

---

## 📊 Monitoring Integration

### Prometheus Metrics

The `/health/metrics` endpoint returns data suitable for Prometheus scraping:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'lazy-foundry-api'
    static_configs:
      - targets: ['api:3001']
    metrics_path: '/health/metrics'
```

### Log Aggregation

Since logs are JSON, they're ready for:
- **Elasticsearch + Kibana**
- **Grafana Loki**
- **CloudWatch Logs**
- **Datadog**

---

## 🐛 Debugging Tips

### Finding Issues by Request ID

```bash
# Get request ID from error response
REQUEST_ID="a1b2c3d4-e5f6-..."

# Find all logs for that request
docker compose logs api | jq "select(.requestId == \"$REQUEST_ID\")"
```

### Checking Database Performance

```bash
# Connect to database
docker exec -it lazy-foundry-db psql -U postgres lazy_foundry

# Check slow queries
SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;

# Check index usage
SELECT * FROM pg_stat_user_indexes;
```

---

## ✅ Production Deployment Checklist

- [ ] JWT_SECRET set to secure random value
- [ ] NODE_ENV=production
- [ ] CORS_ORIGIN set to your domain
- [ ] Database backups automated
- [ ] Health checks configured in orchestrator
- [ ] Monitoring/alerting set up
- [ ] SSL/TLS certificates installed
- [ ] Log aggregation configured
- [ ] Database indexes applied
- [ ] Connection pooling tuned for your workload

---

## 📚 Additional Resources

- [Phase 6 Implementation Complete](./PHASE_6_IMPLEMENTATION_COMPLETE.md)
- [Phase 6 Hardening Plan](./PHASE_6_HARDENING_AND_PRODUCTION.md)
- [Environment Configuration](../ENV_CONFIGURATION.md)
- [Main README](../README.md)

---

**Need Help?** Check the logs first! All errors include request IDs for easy tracking.
