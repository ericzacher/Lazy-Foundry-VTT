import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { AppDataSource } from '../config/database';
import { Session, SessionStatus } from '../entities/Session';
import { SessionResult } from '../entities/SessionResult';
import { Campaign } from '../entities/Campaign';
import { NPCHistory } from '../entities/NPCHistory';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import {
  autoSummarizeSession,
  trackNPCChanges,
} from '../services/sessionContinuity';

const router = Router();

const sessionRepository = () => AppDataSource.getRepository(Session);
const sessionResultRepository = () => AppDataSource.getRepository(SessionResult);
const campaignRepository = () => AppDataSource.getRepository(Campaign);
const npcHistoryRepository = () => AppDataSource.getRepository(NPCHistory);

// Apply auth middleware to all routes
router.use(authMiddleware);

// Create session for a campaign
router.post(
  '/campaigns/:campaignId/sessions',
  [
    param('campaignId').isUUID(),
    body('title').notEmpty().trim(),
    body('description').optional().trim(),
    body('scheduledDate').optional().isISO8601(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { campaignId } = req.params;
    const { title, description, scheduledDate } = req.body;

    try {
      // Verify campaign ownership
      const campaign = await campaignRepository().findOne({
        where: { id: campaignId, ownerId: req.userId! },
      });

      if (!campaign) {
        res.status(404).json({ error: 'Campaign not found' });
        return;
      }

      // Get next session number
      const lastSession = await sessionRepository().findOne({
        where: { campaignId },
        order: { sessionNumber: 'DESC' },
      });

      const sessionNumber = lastSession ? lastSession.sessionNumber + 1 : 1;

      const session = sessionRepository().create({
        campaignId,
        title,
        description,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
        sessionNumber,
        status: SessionStatus.PLANNED,
      });

      await sessionRepository().save(session);

      res.status(201).json(session);
    } catch (error) {
      console.error('Create session error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// List sessions for a campaign
router.get(
  '/campaigns/:campaignId/sessions',
  [param('campaignId').isUUID()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { campaignId } = req.params;

    try {
      // Verify campaign ownership
      const campaign = await campaignRepository().findOne({
        where: { id: campaignId, ownerId: req.userId! },
      });

      if (!campaign) {
        res.status(404).json({ error: 'Campaign not found' });
        return;
      }

      const sessions = await sessionRepository().find({
        where: { campaignId },
        order: { sessionNumber: 'ASC' },
      });

      res.json(sessions);
    } catch (error) {
      console.error('List sessions error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get session by ID
router.get(
  '/sessions/:id',
  [param('id').isUUID()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const session = await sessionRepository().findOne({
        where: { id: req.params.id },
        relations: ['campaign', 'result'],
      });

      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      // Verify campaign ownership
      if (session.campaign.ownerId !== req.userId) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      res.json(session);
    } catch (error) {
      console.error('Get session error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Update session
router.put(
  '/sessions/:id',
  [
    param('id').isUUID(),
    body('title').optional().notEmpty().trim(),
    body('description').optional().trim(),
    body('scheduledDate').optional().isISO8601(),
    body('status').optional().isIn(Object.values(SessionStatus)),
    body('scenario').optional().isObject(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const session = await sessionRepository().findOne({
        where: { id: req.params.id },
        relations: ['campaign'],
      });

      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      // Verify campaign ownership
      if (session.campaign.ownerId !== req.userId) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      const { title, description, scheduledDate, status, scenario } = req.body;

      if (title !== undefined) session.title = title;
      if (description !== undefined) session.description = description;
      if (scheduledDate !== undefined) session.scheduledDate = new Date(scheduledDate);
      if (status !== undefined) {
        session.status = status;
        if (status === SessionStatus.COMPLETED) {
          session.completedDate = new Date();
        }
      }
      if (scenario !== undefined) session.scenario = scenario;

      await sessionRepository().save(session);

      res.json(session);
    } catch (error) {
      console.error('Update session error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Delete session
router.delete(
  '/sessions/:id',
  [param('id').isUUID()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const session = await sessionRepository().findOne({
        where: { id: req.params.id },
        relations: ['campaign'],
      });

      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      // Verify campaign ownership
      if (session.campaign.ownerId !== req.userId) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      await sessionRepository().remove(session);

      res.status(204).send();
    } catch (error) {
      console.error('Delete session error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Finalize session (save results)
router.post(
  '/sessions/:id/finalize',
  [
    param('id').isUUID(),
    body('summary').optional().trim(),
    body('events').optional().isArray(),
    body('npcInteractions').optional().isObject(),
    body('playerDecisions').optional().isArray(),
    body('worldChanges').optional().isObject(),
    body('unfinishedThreads').optional().isArray(),
    // Phase 5 fields
    body('plotAdvancement').optional().trim(),
    body('durationMinutes').optional().isInt(),
    body('xpAwarded').optional().isInt(),
    body('lootAwarded').optional().isObject(),
    body('deathCount').optional().isInt(),
    body('captureMethod').optional().isIn(['manual', 'ai_summarized']),
    body('transcript').optional().trim(),
    body('mood').optional().isIn(['intense', 'comedic', 'dramatic', 'mixed']),
    body('characterDevelopment').optional().isObject(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const session = await sessionRepository().findOne({
        where: { id: req.params.id },
        relations: ['campaign', 'result'],
      });

      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      // Verify campaign ownership
      if (session.campaign.ownerId !== req.userId) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      const {
        summary,
        events,
        npcInteractions,
        playerDecisions,
        worldChanges,
        unfinishedThreads,
        plotAdvancement,
        durationMinutes,
        xpAwarded,
        lootAwarded,
        deathCount,
        captureMethod,
        transcript,
        mood,
        characterDevelopment,
      } = req.body;

      let result = session.result;

      if (!result) {
        result = sessionResultRepository().create({
          sessionId: session.id,
        });
      }

      if (summary !== undefined) result.summary = summary;
      if (events !== undefined) result.events = events;
      if (npcInteractions !== undefined) result.npcInteractions = npcInteractions;
      if (playerDecisions !== undefined) result.playerDecisions = playerDecisions;
      if (worldChanges !== undefined) result.worldChanges = worldChanges;
      if (unfinishedThreads !== undefined) result.unfinishedThreads = unfinishedThreads;
      // Phase 5 fields
      if (plotAdvancement !== undefined) result.plotAdvancement = plotAdvancement;
      if (durationMinutes !== undefined) result.durationMinutes = durationMinutes;
      if (xpAwarded !== undefined) result.xpAwarded = xpAwarded;
      if (lootAwarded !== undefined) result.lootAwarded = lootAwarded;
      if (deathCount !== undefined) result.deathCount = deathCount;
      if (captureMethod !== undefined) result.captureMethod = captureMethod;
      if (transcript !== undefined) result.transcript = transcript;
      if (mood !== undefined) result.mood = mood;
      if (characterDevelopment !== undefined) result.characterDevelopment = characterDevelopment;

      await sessionResultRepository().save(result);

      // Mark session as completed
      session.status = SessionStatus.COMPLETED;
      session.completedDate = new Date();
      await sessionRepository().save(session);

      res.json({ session, result });
    } catch (error) {
      console.error('Finalize session error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get session results
router.get(
  '/sessions/:id/results',
  [param('id').isUUID()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const session = await sessionRepository().findOne({
        where: { id: req.params.id },
        relations: ['campaign', 'result'],
      });

      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      // Verify campaign ownership
      if (session.campaign.ownerId !== req.userId) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      if (!session.result) {
        res.status(404).json({ error: 'Session results not found' });
        return;
      }

      res.json(session.result);
    } catch (error) {
      console.error('Get session results error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Auto-summarize session with AI
router.post(
  '/sessions/:id/auto-summarize',
  [
    param('id').isUUID(),
    body('transcript').notEmpty().trim(),
    body('partyComposition').optional().trim(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const session = await sessionRepository().findOne({
        where: { id: req.params.id },
        relations: ['campaign', 'result'],
      });

      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      if (session.campaign.ownerId !== req.userId) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      const { transcript, partyComposition = 'Mixed party' } = req.body;
      const campaign = session.campaign;

      const campaignContext = `
Campaign: ${campaign.name}
Setting: ${campaign.setting || 'Fantasy'}
Theme: ${campaign.theme || 'Adventure'}
Tone: ${campaign.tone || 'Balanced'}
${campaign.worldLore ? `World Lore: ${JSON.stringify(campaign.worldLore).substring(0, 1000)}` : ''}
      `.trim();

      const summaryData = await autoSummarizeSession(
        transcript,
        campaignContext,
        partyComposition
      );

      // Save to session result
      let result = session.result;
      if (!result) {
        result = sessionResultRepository().create({
          sessionId: session.id,
        });
      }

      result.summary = summaryData.summary;
      result.events = summaryData.keyEvents || [];
      result.npcInteractions = summaryData.npcInteractions || {};
      result.worldChanges = summaryData.worldChanges || {};
      result.plotAdvancement = summaryData.plotAdvancement;
      result.unfinishedThreads = summaryData.unresolvedThreads || [];
      result.captureMethod = 'ai_summarized';
      result.transcript = transcript;

      await sessionResultRepository().save(result);

      res.json({ summary: summaryData, result });
    } catch (error) {
      console.error('Auto-summarize error:', error);
      res.status(500).json({ error: 'Failed to auto-summarize session' });
    }
  }
);

// Track NPC changes for a session
router.post(
  '/sessions/:id/npc-history',
  [
    param('id').isUUID(),
    body('npcId').isUUID(),
    body('alignmentBefore').optional().trim(),
    body('alignmentAfter').optional().trim(),
    body('loyaltyBefore').optional().trim(),
    body('loyaltyAfter').optional().trim(),
    body('statusBefore').optional().trim(),
    body('statusAfter').optional().trim(),
    body('relationshipChange').optional().trim(),
    body('notes').optional().trim(),
    body('eventsInvolved').optional().isArray(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const session = await sessionRepository().findOne({
        where: { id: req.params.id },
        relations: ['campaign'],
      });

      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      if (session.campaign.ownerId !== req.userId) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      const {
        npcId,
        alignmentBefore,
        alignmentAfter,
        loyaltyBefore,
        loyaltyAfter,
        statusBefore,
        statusAfter,
        relationshipChange,
        notes,
        eventsInvolved,
      } = req.body;

      const history = await trackNPCChanges(npcId, session.id, {
        alignmentBefore,
        alignmentAfter,
        loyaltyBefore,
        loyaltyAfter,
        statusBefore,
        statusAfter,
        relationshipChange,
        notes,
        eventsInvolved,
      });

      res.json({ history });
    } catch (error) {
      console.error('Track NPC history error:', error);
      res.status(500).json({ error: 'Failed to track NPC history' });
    }
  }
);

export default router;
