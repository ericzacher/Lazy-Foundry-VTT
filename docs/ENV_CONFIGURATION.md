# Environment Configuration Templates

Use these templates to configure your deployment environments.

## Development Environment (.env.development)

```bash
# Node Environment
NODE_ENV=development
LOG_LEVEL=debug

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/lazy_foundry_dev
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=dev-secret-change-in-production
JWT_EXPIRY=24h
REFRESH_TOKEN_EXPIRY=7d

# AI Provider
GROQ_API_KEY=gsk_xxxxx (from https://console.groq.com)
OPENAI_API_KEY=sk-xxxxx (optional fallback)

# Foundry VTT
FOUNDRY_URL=http://localhost:30000
FOUNDRY_ADMIN_KEY=your-foundry-admin-key

# API Configuration
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
API_PORT=3001

# Rate Limiting
RATE_LIMIT_ENABLED=false

# Optional: Error tracking
SENTRY_DSN=
```

## Production Environment (.env.production - SECURE)

```bash
# Node Environment
NODE_ENV=production
LOG_LEVEL=warn

# Database (use strong credentials, consider managed database)
DATABASE_URL=postgresql://dbuser:${STRONG_PASSWORD}@db.example.com:5432/lazy_foundry
REDIS_URL=redis://:${REDIS_PASSWORD}@cache.example.com:6379

# JWT Configuration (generate with: openssl rand -base64 32)
JWT_SECRET=${GENERATE_SECURE_SECRET}
JWT_EXPIRY=24h
REFRESH_TOKEN_EXPIRY=7d

# AI Provider
GROQ_API_KEY=${GROQ_API_KEY_FROM_SECRETS_MANAGER}
OPENAI_API_KEY=${OPENAI_API_KEY_FROM_SECRETS_MANAGER}

# Foundry VTT (production instance)
FOUNDRY_URL=https://foundry.example.com
FOUNDRY_ADMIN_KEY=${FOUNDRY_ADMIN_KEY_FROM_SECRETS_MANAGER}

# API Configuration
CORS_ORIGIN=https://yourdomain.com
API_PORT=3001

# Rate Limiting (enabled in production)
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# HTTPS/Security
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_HTTPONLY=true
SESSION_COOKIE_SAMESITE=strict

# Error tracking & monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
SLACK_WEBHOOK=https://hooks.slack.com/services/xxx

# Backups
BACKUP_ENABLED=true
BACKUP_INTERVAL=86400
BACKUP_RETENTION_DAYS=30
BACKUP_S3_BUCKET=lazy-foundry-backups
AWS_ACCESS_KEY_ID=${FROM_SECRETS_MANAGER}
AWS_SECRET_ACCESS_KEY=${FROM_SECRETS_MANAGER}
```

## Staging Environment (.env.staging)

```bash
# Node Environment
NODE_ENV=staging
LOG_LEVEL=info

# Database (use staging database)
DATABASE_URL=postgresql://staginguser:${STAGING_PASSWORD}@staging-db.example.com:5432/lazy_foundry_staging
REDIS_URL=redis://:${STAGING_REDIS_PASSWORD}@staging-cache.example.com:6379

# JWT Configuration (can be same as production)
JWT_SECRET=${STAGING_JWT_SECRET}
JWT_EXPIRY=24h

# AI Provider (limit quota)
GROQ_API_KEY=${GROQ_API_KEY_STAGING}

# Foundry VTT (staging instance)
FOUNDRY_URL=https://foundry-staging.example.com
FOUNDRY_ADMIN_KEY=${FOUNDRY_ADMIN_KEY_STAGING}

# API Configuration
CORS_ORIGIN=https://staging.yourdomain.com
API_PORT=3001

# Rate Limiting (enabled but lenient)
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=200

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx-staging
```

## Docker Secrets Management

For Docker Swarm or Kubernetes, use secrets instead of .env:

```bash
# Create Docker secrets
echo "JWT_SECRET_VALUE" | docker secret create jwt_secret -
echo "DB_PASSWORD_VALUE" | docker secret create db_password -
echo "GROQ_API_KEY_VALUE" | docker secret create groq_api_key -

# Reference in docker-compose.yml
services:
  api:
    environment:
      JWT_SECRET_FILE: /run/secrets/jwt_secret
      DATABASE_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - jwt_secret
      - db_password
      - groq_api_key

secrets:
  jwt_secret:
    external: true
  db_password:
    external: true
  groq_api_key:
    external: true
```

Read secrets in Node.js:

```typescript
const JWT_SECRET = process.env.JWT_SECRET_FILE 
  ? fs.readFileSync(process.env.JWT_SECRET_FILE, 'utf-8').trim()
  : process.env.JWT_SECRET;
```

## AWS Secrets Manager Integration

For AWS deployments:

```typescript
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({ region: process.env.AWS_REGION });

async function getSecret(secretName: string): Promise<string> {
  try {
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await client.send(command);
    return response.SecretString || '';
  } catch (error) {
    console.error(`Failed to get secret: ${secretName}`, error);
    throw error;
  }
}

// Usage
const jwtSecret = await getSecret('lazy-foundry/jwt-secret');
const dbPassword = await getSecret('lazy-foundry/db-password');
```

## HashiCorp Vault Integration

For enterprise deployments:

```typescript
import * as Vault from 'node-vault';

const vault = new Vault({
  endpoint: process.env.VAULT_ADDR,
  token: process.env.VAULT_TOKEN,
});

async function getVaultSecret(path: string): Promise<any> {
  const secret = await vault.read(path);
  return secret.data.data;
}

// Usage
const secrets = await getVaultSecret('secret/lazy-foundry/prod');
const jwtSecret = secrets.jwt_secret;
```

## Environment Validation

Validate environment configuration on startup:

```typescript
// api/src/config/env.ts

import * as dotenv from 'dotenv';

dotenv.config();

const requiredEnvVars = [
  'NODE_ENV',
  'DATABASE_URL',
  'JWT_SECRET',
  'GROQ_API_KEY',
  'FOUNDRY_URL',
  'FOUNDRY_ADMIN_KEY',
];

const optionalEnvVars = [
  'SENTRY_DSN',
  'REDIS_URL',
  'SLACK_WEBHOOK',
];

function validateEnvironment(): void {
  const missing = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );

  if (missing.length > 0) {
    console.error('Missing required environment variables:');
    missing.forEach((varName) => console.error(`  - ${varName}`));
    process.exit(1);
  }

  // Validate format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (process.env.ADMIN_EMAIL && !emailRegex.test(process.env.ADMIN_EMAIL)) {
    console.error('Invalid ADMIN_EMAIL format');
    process.exit(1);
  }

  console.log('✓ Environment validation passed');
}

export { validateEnvironment };

// Call in api/src/index.ts
import { validateEnvironment } from './config/env';

validateEnvironment();
```

## Secrets Rotation Script

Automated key rotation (run monthly):

```bash
#!/bin/bash
# scripts/rotate-secrets.sh

set -e

echo "🔄 Starting secrets rotation..."

# 1. Generate new JWT secret
NEW_JWT_SECRET=$(openssl rand -base64 32)
echo "Generated new JWT secret"

# 2. Update in AWS Secrets Manager
aws secretsmanager put-secret-value \
  --secret-id lazy-foundry/jwt-secret \
  --secret-string "$NEW_JWT_SECRET" \
  --region us-east-1

echo "✓ Updated JWT secret in Secrets Manager"

# 3. Update in .env.production.local (local)
sed -i "s/JWT_SECRET=.*/JWT_SECRET=$NEW_JWT_SECRET/" .env.production.local
echo "✓ Updated local .env"

# 4. Trigger redeployment
docker-compose restart api
echo "✓ Restarted API service"

# 5. Monitor for errors
sleep 30
ERROR_COUNT=$(docker logs lazy-foundry-api | grep -c ERROR || true)
if [ $ERROR_COUNT -gt 0 ]; then
  echo "❌ Errors detected during restart, rolling back..."
  git checkout .env.production.local
  docker-compose restart api
  exit 1
fi

echo "✅ Secrets rotation complete"
```

Run with: `bash scripts/rotate-secrets.sh`
