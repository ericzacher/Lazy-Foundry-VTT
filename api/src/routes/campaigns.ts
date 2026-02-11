import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { AppDataSource } from '../config/database';
import { Campaign } from '../entities/Campaign';
import { NPC } from '../entities/NPC';
import { TimelineEvent } from '../entities/TimelineEvent';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import {
  getCampaignSummary,
  getNPCCurrentStatus,
  addTimelineEvent,
  getTimeline,
} from '../services/sessionContinuity';

const router = Router();

const campaignRepository = () => AppDataSource.getRepository(Campaign);
const npcRepository = () => AppDataSource.getRepository(NPC);
const timelineRepository = () => AppDataSource.getRepository(TimelineEvent);

// Apply auth middleware to all routes
router.use(authMiddleware);

// Create campaign
router.post(
  '/',
  [
    body('name').notEmpty().trim(),
    body('description').optional().trim(),
    body('setting').optional().trim(),
    body('theme').optional().trim(),
    body('tone').optional().trim(),
    body('playerCount').optional().isInt({ min: 1, max: 20 }),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { name, description, setting, theme, tone, playerCount } = req.body;

    try {
      const campaign = campaignRepository().create({
        name,
        description,
        setting,
        theme,
        tone,
        playerCount: playerCount || 4,
        ownerId: req.userId!,
      });

      await campaignRepository().save(campaign);

      res.status(201).json(campaign);
    } catch (error) {
      console.error('Create campaign error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// List campaigns for current user
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const campaigns = await campaignRepository().find({
      where: { ownerId: req.userId! },
      order: { updatedAt: 'DESC' },
    });

    res.json(campaigns);
  } catch (error) {
    console.error('List campaigns error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get campaign by ID
router.get(
  '/:id',
  [param('id').isUUID()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const campaign = await campaignRepository().findOne({
        where: { id: req.params.id, ownerId: req.userId! },
        relations: ['sessions'],
      });

      if (!campaign) {
        res.status(404).json({ error: 'Campaign not found' });
        return;
      }

      res.json(campaign);
    } catch (error) {
      console.error('Get campaign error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Update campaign
router.put(
  '/:id',
  [
    param('id').isUUID(),
    body('name').optional().notEmpty().trim(),
    body('description').optional().trim(),
    body('setting').optional().trim(),
    body('theme').optional().trim(),
    body('tone').optional().trim(),
    body('playerCount').optional().isInt({ min: 1, max: 20 }),
    body('worldLore').optional().isObject(),
    body('rules').optional().isObject(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const campaign = await campaignRepository().findOne({
        where: { id: req.params.id, ownerId: req.userId! },
      });

      if (!campaign) {
        res.status(404).json({ error: 'Campaign not found' });
        return;
      }

      const { name, description, setting, theme, tone, playerCount, worldLore, rules } = req.body;

      if (name !== undefined) campaign.name = name;
      if (description !== undefined) campaign.description = description;
      if (setting !== undefined) campaign.setting = setting;
      if (theme !== undefined) campaign.theme = theme;
      if (tone !== undefined) campaign.tone = tone;
      if (playerCount !== undefined) campaign.playerCount = playerCount;
      if (worldLore !== undefined) campaign.worldLore = worldLore;
      if (rules !== undefined) campaign.rules = rules;

      await campaignRepository().save(campaign);

      res.json(campaign);
    } catch (error) {
      console.error('Update campaign error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Delete campaign
router.delete(
  '/:id',
  [param('id').isUUID()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const campaign = await campaignRepository().findOne({
        where: { id: req.params.id, ownerId: req.userId! },
      });

      if (!campaign) {
        res.status(404).json({ error: 'Campaign not found' });
        return;
      }

      await campaignRepository().remove(campaign);

      res.status(204).send();
    } catch (error) {
      console.error('Delete campaign error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get campaign summary (sessions, timeline, NPC statuses)
router.get(
  '/:id/summary',
  [param('id').isUUID()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const campaign = await campaignRepository().findOne({
        where: { id: req.params.id, ownerId: req.userId! },
      });

      if (!campaign) {
        res.status(404).json({ error: 'Campaign not found' });
        return;
      }

      const summary = await getCampaignSummary(campaign.id);
      res.json({ summary });
    } catch (error) {
      console.error('Get campaign summary error:', error);
      res.status(500).json({ error: 'Failed to get campaign summary' });
    }
  }
);

// Get NPC statuses for a campaign
router.get(
  '/:id/npc-status',
  [param('id').isUUID()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const campaign = await campaignRepository().findOne({
        where: { id: req.params.id, ownerId: req.userId! },
      });

      if (!campaign) {
        res.status(404).json({ error: 'Campaign not found' });
        return;
      }

      const npcs = await npcRepository().find({
        where: { campaignId: campaign.id },
      });

      const statuses: Record<string, unknown> = {};
      for (const npc of npcs) {
        const status = await getNPCCurrentStatus(npc.id);
        if (status) statuses[npc.name] = status;
      }

      res.json({ statuses });
    } catch (error) {
      console.error('Get NPC statuses error:', error);
      res.status(500).json({ error: 'Failed to get NPC statuses' });
    }
  }
);

// Get campaign timeline
router.get(
  '/:id/timeline',
  [param('id').isUUID()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const campaign = await campaignRepository().findOne({
        where: { id: req.params.id, ownerId: req.userId! },
      });

      if (!campaign) {
        res.status(404).json({ error: 'Campaign not found' });
        return;
      }

      const events = await getTimeline(campaign.id);
      res.json({ events });
    } catch (error) {
      console.error('Get timeline error:', error);
      res.status(500).json({ error: 'Failed to get timeline' });
    }
  }
);

// Add timeline event
router.post(
  '/:id/timeline',
  [
    param('id').isUUID(),
    body('sessionId').optional().isUUID(),
    body('eventDate').notEmpty().trim(),
    body('title').notEmpty().trim(),
    body('description').optional().trim(),
    body('eventType').notEmpty().isIn(['combat', 'dialogue', 'discovery', 'death', 'political', 'travel', 'other']),
    body('significance').notEmpty().isIn(['minor', 'major', 'critical']),
    body('peopleInvolved').optional().isArray(),
    body('locations').optional().isArray(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const campaign = await campaignRepository().findOne({
        where: { id: req.params.id, ownerId: req.userId! },
      });

      if (!campaign) {
        res.status(404).json({ error: 'Campaign not found' });
        return;
      }

      const {
        sessionId,
        eventDate,
        title,
        description,
        eventType,
        significance,
        peopleInvolved,
        locations,
      } = req.body;

      const event = await addTimelineEvent(campaign.id, sessionId || null, {
        eventDate,
        title,
        description,
        eventType,
        significance,
        peopleInvolved,
        locations,
      });

      res.status(201).json({ event });
    } catch (error) {
      console.error('Add timeline event error:', error);
      res.status(500).json({ error: 'Failed to add timeline event' });
    }
  }
);

export default router;
