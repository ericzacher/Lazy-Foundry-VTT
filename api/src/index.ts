import 'reflect-metadata';
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { AppDataSource } from './config/database';
import authRoutes from './routes/auth';
import campaignRoutes from './routes/campaigns';
import sessionRoutes from './routes/sessions';
import generateRoutes from './routes/generate';
import foundryRoutes from './routes/foundry';
import healthRoutes from './routes/health';
import { tracingMiddleware } from './middleware/tracing';
import { errorHandler } from './middleware/errorHandler';
import { logInfo, logError } from './utils/logger';

const app = express();
const port = process.env.PORT || 3001;

// Validate required environment variables
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET must be set in production');
  process.exit(1);
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.groq.com', 'https://api.openai.com'],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// CORS configuration
const allowedOrigins = [
  process.env.CORS_ORIGIN || 'http://localhost:5173',
  ...(process.env.ADDITIONAL_ORIGINS?.split(',') || [])
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
  exposedHeaders: ['x-request-id', 'X-Token-Refresh-Suggested'],
}));

// Request tracing
app.use(tracingMiddleware);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for generated assets (map images, etc.)
app.use('/api/assets', express.static(path.resolve('/app/assets')));

// Health checks
app.use('/health', healthRoutes);

// Legacy health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api', sessionRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/foundry', foundryRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler (must be last)
app.use(errorHandler);

// Initialize database and start server
AppDataSource.initialize()
  .then(() => {
    logInfo('Database connected successfully');
    app.listen(port, () => {
      logInfo(`API server running on port ${port}`, {
        environment: process.env.NODE_ENV || 'development',
        port,
      });
    });
  })
  .catch((error) => {
    logError('Database connection failed', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', async () => {
  logInfo('SIGTERM received, shutting down gracefully');
  
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  logInfo('SIGINT received, shutting down gracefully');
  
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  
  process.exit(0);
});
