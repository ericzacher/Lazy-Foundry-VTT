import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { AppDataSource } from '../config/database';
import { Campaign } from '../entities/Campaign';
import { Session } from '../entities/Session';
import { NPC } from '../entities/NPC';
import { Map, MapType } from '../entities/Map';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import {
  generateCampaignLore,
  generateNPCs,
  generateScenario,
  summarizeSession,
  generatePlayerBackgrounds,
  generateMapDescription,
  generateDetailedEncounters,
} from '../services/ai';

const router = Router();

const campaignRepository = () => AppDataSource.getRepository(Campaign);
const sessionRepository = () => AppDataSource.getRepository(Session);
const npcRepository = () => AppDataSource.getRepository(NPC);
const mapRepository = () => AppDataSource.getRepository(Map);

// Apply auth middleware to all routes
router.use(authMiddleware);

// Generate campaign lore
router.post(
  '/campaigns/:id/lore',
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

      const lore = await generateCampaignLore(
        campaign.name,
        campaign.setting || '',
        campaign.theme || '',
        campaign.tone || ''
      );

      // Save lore to campaign
      campaign.worldLore = lore as unknown as Record<string, unknown>;
      await campaignRepository().save(campaign);

      res.json({ campaign, lore });
    } catch (error) {
      console.error('Generate lore error:', error);
      res.status(500).json({ error: 'Failed to generate lore' });
    }
  }
);

// Generate NPCs for a campaign
router.post(
  '/campaigns/:id/npcs',
  [
    param('id').isUUID(),
    body('count').optional().isInt({ min: 1, max: 10 }),
    body('roles').optional().isArray(),
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

      const { count = 3, roles } = req.body;

      const campaignContext = `
Campaign: ${campaign.name}
Setting: ${campaign.setting || 'Fantasy'}
Theme: ${campaign.theme || 'Adventure'}
Tone: ${campaign.tone || 'Balanced'}
${campaign.worldLore ? `World Lore: ${JSON.stringify(campaign.worldLore)}` : ''}
      `.trim();

      const generatedNPCs = await generateNPCs(campaignContext, count, roles);

      // Save NPCs to database
      const savedNPCs = [];
      for (const npc of generatedNPCs) {
        const npcEntity = npcRepository().create({
          campaignId: campaign.id,
          name: npc.name,
          role: npc.role,
          description: npc.description,
          personality: npc.personality,
          motivations: npc.motivations,
          background: npc.background,
          stats: npc.stats,
        });
        await npcRepository().save(npcEntity);
        savedNPCs.push(npcEntity);
      }

      res.json({ npcs: savedNPCs });
    } catch (error) {
      console.error('Generate NPCs error:', error);
      res.status(500).json({ error: 'Failed to generate NPCs' });
    }
  }
);

// Generate scenario for a session
router.post(
  '/sessions/:id/scenario',
  [
    param('id').isUUID(),
    body('description').optional().isString(),
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

      const campaign = session.campaign;
      const { description } = req.body;

      const campaignContext = `
Campaign: ${campaign.name}
Setting: ${campaign.setting || 'Fantasy'}
Theme: ${campaign.theme || 'Adventure'}
Tone: ${campaign.tone || 'Balanced'}
${campaign.worldLore ? `World Lore: ${JSON.stringify(campaign.worldLore)}` : ''}
      `.trim();

      // Get previous session results for continuity
      const previousSessions = await sessionRepository().find({
        where: { campaignId: campaign.id },
        relations: ['result'],
        order: { sessionNumber: 'DESC' },
        take: 3,
      });

      const previousResults = previousSessions
        .filter((s) => s.result?.summary)
        .map((s) => s.result!.summary)
        .join('\n\n');

      const scenario = await generateScenario(
        campaignContext,
        description || session.description || session.title,
        previousResults || undefined
      );

      // Save scenario to session
      session.scenario = scenario as unknown as Record<string, unknown>;
      await sessionRepository().save(session);

      res.json({ session, scenario });
    } catch (error) {
      console.error('Generate scenario error:', error);
      res.status(500).json({ error: 'Failed to generate scenario' });
    }
  }
);

// Summarize session results
router.post(
  '/sessions/:id/summarize',
  [
    param('id').isUUID(),
    body('events').isArray(),
    body('playerDecisions').isArray(),
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

      const { events, playerDecisions } = req.body;

      const summary = await summarizeSession(events, playerDecisions);

      res.json({ summary });
    } catch (error) {
      console.error('Summarize session error:', error);
      res.status(500).json({ error: 'Failed to summarize session' });
    }
  }
);

// Get campaign NPCs
router.get(
  '/campaigns/:id/npcs',
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
        order: { createdAt: 'DESC' },
      });

      res.json(npcs);
    } catch (error) {
      console.error('Get NPCs error:', error);
      res.status(500).json({ error: 'Failed to get NPCs' });
    }
  }
);

// Generate player backgrounds
router.post(
  '/campaigns/:id/backgrounds',
  [
    param('id').isUUID(),
    body('playerCount').optional().isInt({ min: 1, max: 10 }),
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

      const { playerCount = campaign.playerCount || 4 } = req.body;

      const campaignContext = `
Campaign: ${campaign.name}
Setting: ${campaign.setting || 'Fantasy'}
Theme: ${campaign.theme || 'Adventure'}
Tone: ${campaign.tone || 'Balanced'}
${campaign.worldLore ? `World Lore: ${JSON.stringify(campaign.worldLore).substring(0, 500)}` : ''}
      `.trim();

      const backgrounds = await generatePlayerBackgrounds(campaignContext, playerCount);

      res.json({ backgrounds });
    } catch (error) {
      console.error('Generate backgrounds error:', error);
      res.status(500).json({ error: 'Failed to generate player backgrounds' });
    }
  }
);

// Generate map description
router.post(
  '/campaigns/:id/maps',
  [
    param('id').isUUID(),
    body('description').notEmpty().trim(),
    body('mapType').optional().isIn(['dungeon', 'tavern', 'wilderness', 'town', 'castle', 'cave', 'other']),
    body('sessionId').optional().isUUID(),
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

      const { description, mapType = 'other', sessionId } = req.body;

      const campaignContext = `
Campaign: ${campaign.name}
Setting: ${campaign.setting || 'Fantasy'}
Theme: ${campaign.theme || 'Adventure'}
Tone: ${campaign.tone || 'Balanced'}
      `.trim();

      const mapDescription = await generateMapDescription(campaignContext, description, mapType);

      // Save map to database
      const mapEntity = mapRepository().create({
        campaignId: campaign.id,
        sessionId: sessionId || undefined,
        name: mapDescription.name,
        description: mapDescription.description,
        type: mapType as MapType,
        gridSize: mapDescription.gridSize || 50,
        dimensions: mapDescription.dimensions || { width: 30, height: 30 },
      });

      await mapRepository().save(mapEntity);

      res.json({ map: { ...mapEntity, details: mapDescription } });
    } catch (error) {
      console.error('Generate map error:', error);
      res.status(500).json({ error: 'Failed to generate map' });
    }
  }
);

// Get campaign maps
router.get(
  '/campaigns/:id/maps',
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

      const maps = await mapRepository().find({
        where: { campaignId: campaign.id },
        order: { createdAt: 'DESC' },
      });

      res.json(maps);
    } catch (error) {
      console.error('Get maps error:', error);
      res.status(500).json({ error: 'Failed to get maps' });
    }
  }
);

// Generate detailed encounters
router.post(
  '/campaigns/:id/encounters',
  [
    param('id').isUUID(),
    body('partyLevel').optional().isInt({ min: 1, max: 20 }),
    body('partySize').optional().isInt({ min: 1, max: 10 }),
    body('encounterType').optional().isString(),
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
        partyLevel = 1,
        partySize = campaign.playerCount || 4,
        encounterType = 'combat',
      } = req.body;

      const campaignContext = `
Campaign: ${campaign.name}
Setting: ${campaign.setting || 'Fantasy'}
Theme: ${campaign.theme || 'Adventure'}
Tone: ${campaign.tone || 'Balanced'}
${campaign.worldLore ? `World Lore: ${JSON.stringify(campaign.worldLore).substring(0, 500)}` : ''}
      `.trim();

      const encounters = await generateDetailedEncounters(
        campaignContext,
        partyLevel,
        partySize,
        encounterType
      );

      res.json({ encounters });
    } catch (error) {
      console.error('Generate encounters error:', error);
      res.status(500).json({ error: 'Failed to generate encounters' });
    }
  }
);

export default router;
