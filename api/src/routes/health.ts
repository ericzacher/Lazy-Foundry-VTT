import express, { Request, Response } from 'express';
import { AppDataSource } from '../config/database';

const router = express.Router();

// Liveness probe - is the app running?
router.get('/live', (_req: Request, res: Response) => {
  res.json({ 
    status: 'alive', 
    timestamp: new Date().toISOString() 
  });
});

// Readiness probe - can it handle requests?
router.get('/ready', async (_req: Request, res: Response) => {
  try {
    // Check database connection
    if (!AppDataSource.isInitialized) {
      res.status(503).json({ 
        status: 'not ready',
        error: 'Database not initialized',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Test database query
    await AppDataSource.query('SELECT 1');
    
    res.json({ 
      status: 'ready', 
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'not ready',
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    });
  }
});

// Metrics endpoint
router.get('/metrics', async (_req: Request, res: Response) => {
  try {
    const metrics = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: {
        connected: AppDataSource.isInitialized,
      },
      timestamp: new Date().toISOString(),
    };
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to collect metrics',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
