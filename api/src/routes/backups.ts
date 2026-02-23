import { Router, Response } from 'express';
import multer from 'multer';
import archiver from 'archiver';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import {
  createFullBackup,
  createCampaignBackup,
  restoreFullBackup,
  restoreCampaignBackup,
} from '../services/backupService';
import { logInfo, logError } from '../utils/logger';

const router = Router();
router.use(authMiddleware);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/zip' || file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Only .zip files are accepted'));
    }
  },
});

function formatTimestamp(): string {
  const d = new Date();
  return d.toISOString().replace(/[-:T]/g, '').replace(/\.\d+Z$/, '').slice(0, 15);
}

// ─── Download endpoints ─────────────────────────────────────────

router.get('/full', async (req: AuthRequest, res: Response) => {
  try {
    const filename = `lazy-foundry-full-${formatTimestamp()}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.pipe(res);

    archive.on('error', (err) => {
      logError('Backup archive error', { error: err.message });
      if (!res.headersSent) res.status(500).json({ error: 'Backup failed' });
    });

    await createFullBackup(archive);
    await archive.finalize();

    logInfo('Full backup created', { userId: req.userId });
  } catch (err: any) {
    logError('Full backup failed', { error: err.message });
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

router.get('/campaigns/:campaignId', async (req: AuthRequest, res: Response) => {
  try {
    const { campaignId } = req.params;
    const archive = archiver('zip', { zlib: { level: 6 } });

    const manifest = await createCampaignBackup(archive, campaignId, req.userId!);

    const safeName = (manifest.campaignName ?? 'campaign').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `lazy-foundry-campaign-${safeName}-${formatTimestamp()}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    archive.pipe(res);
    await archive.finalize();

    logInfo('Campaign backup created', { userId: req.userId, campaignId });
  } catch (err: any) {
    logError('Campaign backup failed', { error: err.message });
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

// ─── Restore endpoints ──────────────────────────────────────────

router.post('/restore/full', upload.single('backup'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No backup file uploaded' });
      return;
    }

    const result = await restoreFullBackup(req.file.buffer, req.userId!);
    res.json(result);
  } catch (err: any) {
    logError('Full restore failed', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

router.post('/restore/campaign', upload.single('backup'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No backup file uploaded' });
      return;
    }

    const result = await restoreCampaignBackup(req.file.buffer, req.userId!);
    res.json(result);
  } catch (err: any) {
    logError('Campaign restore failed', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

router.post('/restore/campaign/:campaignId', upload.single('backup'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No backup file uploaded' });
      return;
    }

    const { campaignId } = req.params;
    const result = await restoreCampaignBackup(req.file.buffer, req.userId!, campaignId);
    res.json(result);
  } catch (err: any) {
    logError('Campaign merge restore failed', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

export default router;
