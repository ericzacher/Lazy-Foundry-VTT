# Security Guidelines & Best Practices

A comprehensive security manual for the Lazy Foundry VTT project.

---

## 1. Threat Model

### High-Risk Targets
- **User Accounts**: Authentication bypass, privilege escalation
- **API Keys**: Foundry VTT admin keys, Groq/OpenAI API keys
- **Campaign Data**: Unauthorized access to user campaigns
- **AI Generation**: API abuse, cost overruns, prompt injection
- **Database**: SQL injection, unauthorized access

### Attack Vectors
1. **Network**: Man-in-the-middle (MITM) on HTTP
2. **Authentication**: Weak tokens, session hijacking
3. **Input**: SQL injection, XSS, command injection
4. **Authorization**: Unauthorized campaign/session access
5. **Logic**: Race conditions in session finalization
6. **Dependencies**: Vulnerable npm packages

---

## 2. Secure Development Practices

### 2.1 Code Review Checklist

Every pull request must verify:

```markdown
- [ ] No hardcoded secrets (API keys, passwords, tokens)
- [ ] All user inputs validated and sanitized
- [ ] All database queries parameterized
- [ ] No console.log of sensitive data
- [ ] Error messages don't leak internal details
- [ ] Authentication checks on all protected routes
- [ ] Authorization verified (user owns resource)
- [ ] Rate limiting applied where needed
- [ ] Dependencies checked for vulnerabilities
- [ ] TypeScript strict mode enabled
- [ ] No dangling promises or unhandled rejections
```

### 2.2 Secret Management

**Never commit:**
```
JWT_SECRET
DATABASE_PASSWORD
API_KEYS (Groq, OpenAI, Foundry)
Session secrets
Private encryption keys
```

**Instead use:**

```bash
# .env.local (git-ignored)
JWT_SECRET=generated_by_openssl_rand_base64_32
DATABASE_PASSWORD=strong_random_password

# .env.production.local (on server only)
SENTRY_DSN=https://...
SLACK_WEBHOOK=https://...

# Or use Docker secrets
docker secret create jwt_secret - < jwt_secret.txt
```

### 2.3 Dependency Security

**Check for vulnerabilities:**

```bash
# Before committing
npm audit
npm audit fix

# In CI/CD
npm ci --audit

# Monitor for new vulnerabilities
npx snyk test
```

**Update strategy:**
- Daily: `npm outdated` (see available updates)
- Weekly: Update patch versions (x.y.**Z**)
- Bi-weekly: Update minor versions (x.**Y**.z)
- Monthly: Update major versions (**X**.y.z)

---

## 3. Authentication & Authorization

### 3.1 Password Security

**Requirements:**
- Minimum 12 characters
- At least 1 uppercase letter
- At least 1 number
- At least 1 special character (!@#$%^&*)

**Hashing:**
```typescript
import bcrypt from 'bcrypt';

const hashedPassword = await bcrypt.hash(password, 12); // salt rounds = 12
const isValid = await bcrypt.compare(password, hashedPassword);
```

### 3.2 JWT Tokens

**Best practices:**
- Short expiry (24 hours)
- Include user ID, email (minimal payload)
- Sign with strong secret (32+ bytes)
- Always transmit via HTTPS
- Store in httpOnly cookie or Authorization header

```typescript
const token = jwt.sign(
  { userId: user.id, email: user.email },
  JWT_SECRET,
  { 
    expiresIn: '24h',
    algorithm: 'HS256',
  }
);
```

### 3.3 Authorization Patterns

**Always verify ownership:**

```typescript
// ✅ Good - verify user owns campaign
const campaign = await campaignRepository.findOne({
  where: { id: campaignId, ownerId: userId }
});
if (!campaign) throw new AppError(403, 'Unauthorized');

// ❌ Bad - assume request is authorized
const campaign = await campaignRepository.findOne({ id: campaignId });

// ❌ Very Bad - load all campaigns
const campaigns = await campaignRepository.find();
```

---

## 4. Input Validation & Sanitization

### 4.1 Email Validation

```typescript
import { isEmail } from 'validator';

const validateEmail = (email: string): boolean => {
  return isEmail(email) && email.length <= 254; // RFC 5321
};
```

### 4.2 String Sanitization

```typescript
import xss from 'xss';

const sanitizeInput = (input: string): string => {
  return xss(
    input
      .trim()
      .slice(0, 5000), // Prevent huge inputs
    {
      whiteList: {},
      stripIgnoredTag: true,
      stripLeadingAndTrailingWhitespace: true,
    }
  );
};

// Usage
const campaignName = sanitizeInput(req.body.name);
```

### 4.3 JSON Schema Validation

```typescript
import Joi from 'joi';

const createCampaignSchema = Joi.object({
  name: Joi.string().required().max(255),
  setting: Joi.string().required().valid('Fantasy', 'SciFi', 'Horror', 'Modern'),
  description: Joi.string().max(5000),
});

const { error, value } = createCampaignSchema.validate(req.body);
if (error) {
  throw new AppError(400, `Validation: ${error.message}`);
}
```

---

## 5. API Security

### 5.1 CORS Configuration

```typescript
const ALLOWED_ORIGINS = [
  process.env.CORS_ORIGIN, // Production domain
  'http://localhost:5173', // Local dev
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // 1 day
}));
```

### 5.2 Rate Limiting

```typescript
// Asymmetric limits: strict on auth, loose on read
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts',
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 per minute
});

app.post('/api/auth/login', loginLimiter, loginHandler);
app.use('/api/', apiLimiter);
```

### 5.3 Security Headers

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind needs inline
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.groq.com'],
      frameSrc: ["'none'"], // No iframes
    },
  },
  strictTransportSecurity: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  hsts: {
    maxAge: 31536000,
  },
  noSniff: true, // Prevent MIME sniffing
  xssFilter: true, // Legacy XSS protection
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
```

---

## 6. Database Security

### 6.1 Connection Security

```typescript
// PostgreSQL connection over TLS
export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: true } 
    : false,
  extra: {
    // Connection pooling to prevent exhaustion
    max: 20,
    min: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
});
```

### 6.2 Query Security

```typescript
// ✅ Parameterized queries (TypeORM handles automatically)
const campaign = await campaignRepository.find({
  where: { ownerId: userId }
});

// ❌ String concatenation (NEVER)
// await db.query(`SELECT * FROM campaigns WHERE owner_id = '${userId}'`);
```

### 6.3 Backup Encryption

```bash
# Encrypt backups at rest
gpg --encrypt --armor --recipient email@example.com backup.sql

# Decrypt when needed
gpg --decrypt backup.sql.asc > backup.sql
```

---

## 7. API Security

### 7.1 Prompt Injection Prevention

When building AI prompts, never concatenate user input directly:

```typescript
// ❌ Vulnerable to prompt injection
const prompt = `
  Generate a D&D session for this campaign: ${userInput}
  Rules: ...
`;

// ✅ Use structured prompts
const prompt = `
  Generate a D&D session for this campaign setting:
  ---CAMPAIGN_SETTING_START---
  ${campaignSetting}
  ---CAMPAIGN_SETTING_END---
  
  Rules: ...
`;

// Even better: Use function calls instead of text-based prompting
```

### 7.2 Cost Control

**Prevent AI API cost overruns:**

```typescript
// Set usage quotas per user/day
router.post('/generate/sessions/:id/scenario', async (req, res) => {
  const usage = await getUserDailyUsage(userId);
  if (usage.tokens > MAX_TOKENS_PER_DAY) {
    throw new AppError(429, 'Daily generation quota exceeded');
  }

  // Track tokens used
  const result = await generateScenario(...);
  await addTokenUsage(userId, result.tokensUsed);
  
  res.json(result);
});
```

---

## 8. Logging & Monitoring

### 8.1 Sensitive Data Filtering

```typescript
const sensitiveFields = [
  'password', 'token', 'secret', 'apiKey', 
  'databaseUrl', 'jwtSecret', 'creditCard'
];

function redactSensitiveData(obj: any): any {
  if (typeof obj !== 'object') return obj;
  
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      acc[key] = '***REDACTED***';
    } else {
      acc[key] = value;
    }
    return acc;
  }, {} as any);
}

// Usage
logger.info('Login attempt', redactSensitiveData(req.body));
```

### 8.2 Audit Logging

```typescript
// Log sensitive operations
async function auditLog(
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  changes?: any
): Promise<void> {
  logger.info('Audit log', {
    userId,
    action, // 'create', 'update', 'delete', 'export'
    resourceType,
    resourceId,
    timestamp: new Date(),
    ipAddress: req.ip,
    changes: redactSensitiveData(changes),
  });
}

// Usage
await auditLog(userId, 'export', 'campaign', campaignId, { exported: true });
```

---

## 9. Incident Response

### 9.1 Breach Protocol

If a security breach is suspected:

1. **Isolate**: Stop deployment pipeline, don't pull latest code
2. **Assess**: Which data was accessed? When? By whom?
3. **Contain**: Revoke API keys, reset tokens, block attacker IPs
4. **Eradicate**: Remove malicious code, patch vulnerability
5. **Recover**: Restore from clean backup, verify integrity
6. **Notify**: Inform users if personal data was accessed

### 9.2 Key Rotation

```bash
# Rotate JWT secret monthly
# 1. Add new secret to environment
JWT_SECRET_NEW=generated_by_openssl_rand_base64_32

# 2. Update middleware to accept both
const validSecrets = [JWT_SECRET_NEW, JWT_SECRET_OLD];

# 3. Force re-login after 1 hour (old tokens expire)
# 4. Remove old secret from .env

# 5. Rotate API keys
curl -X POST https://console.groq.com/api/keys/rotate
```

---

## 10. Security Audit Checklist

Run monthly security audits:

```bash
# 1. Check for vulnerabilities
npm audit
npx snyk test
docker scan lazy-foundry-api
docker scan lazy-foundry-web

# 2. Check for exposed secrets
git log --all --oneline | grep -i secret
npx detect-secrets scan

# 3. Check logs for suspicious activity
grep -i "unauthorized\|403\|invalid token" logs/combined.log | tail -100

# 4. Verify HTTPS
curl -I https://yourdomain.com | grep Strict-Transport-Security

# 5. Check CORS configuration
curl -H "Origin: evil.com" https://yourdomain.com -v

# 6. Verify rate limiting
for i in {1..10}; do curl https://yourdomain.com/api/auth/login; done
```

---

## 11. Compliance

### 11.1 GDPR Compliance

Users must be able to:
- **Export**: Download all personal data
- **Delete**: Request complete account deletion
- **Correct**: Update incorrect data

Implementation:

```typescript
// Export user data
router.post('/api/users/export', authMiddleware, async (req, res) => {
  const userData = await getUserExport(req.userId);
  res.json(userData);
});

// Delete account
router.delete('/api/users/account', authMiddleware, async (req, res) => {
  await deleteUserData(req.userId);
  res.json({ message: 'Account deleted' });
});
```

### 11.2 Data Retention

```typescript
// Auto-delete old data
const JOB_DELETE_OLD_SESSIONS = '0 2 * * *'; // Daily at 2 AM

schedule.scheduleJob(JOB_DELETE_OLD_SESSIONS, async () => {
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days
  await sessionRepository.delete({ createdAt: LessThan(cutoff) });
  logger.info('Deleted sessions older than 90 days');
});
```

---

## 12. Third-Party Dependencies Security

### 12.1 Trusted Sources Only

Use only official npm packages:

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "typeorm": "^0.3.0",
    "groq-sdk": "^0.3.0"
  }
}
```

Avoid:
- Unverified packages
- Packages with few downloads
- Packages not updated in 6+ months
- Packages by unknown publishers

### 12.2 Pin Dependencies

```json
{
  "dependencies": {
    "express": "4.18.2",
    "typeorm": "0.3.17"
  }
}
```

Update only via `npm update` with review.

---

## 13. Regular Security Review Schedule

- **Daily**: Check logs for errors/attacks
- **Weekly**: Dependency vulnerability scan
- **Monthly**: Full security audit, penetration testing
- **Quarterly**: Code review for security practices
- **Annually**: Third-party security assessment

---

## 14. Resources

- **OWASP**: https://owasp.org/
- **NodeJS Security**: https://nodejs.org/en/docs/guides/security/
- **npm Security**: https://docs.npmjs.com/policies/security
- **Express Security**: https://expressjs.com/en/advanced/best-practice-security.html
