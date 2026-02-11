import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { AppDataSource } from '../config/database';
import { Campaign } from '../entities/Campaign';
import { Session } from '../entities/Session';
import { NPC } from '../entities/NPC';
import { Map, MapType } from '../entities/Map';
import { Token } from '../entities/Token';
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
import { generateContinuityScenario } from '../services/sessionContinuity';
import { generateMap, saveMapImage } from '../services/mapGenerator';
import {
  generateTokenFromDescription,
  saveTokenImage,
} from '../services/tokenGenerator';

const router = Router();

const campaignRepository = () => AppDataSource.getRepository(Campaign);
const sessionRepository = () => AppDataSource.getRepository(Session);
const npcRepository = () => AppDataSource.getRepository(NPC);
const mapRepository = () => AppDataSource.getRepository(Map);
const tokenRepository = () => AppDataSource.getRepository(Token);

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
    body('mapType').optional().isIn(['dungeon', 'tavern', 'wilderness', 'town', 'city', 'castle', 'cave', 'building', 'other']),
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

      // Generate procedural map image + Foundry VTT scene data
      // Validate dimensions from AI (cap at reasonable sizes to prevent memory issues)
      const rawDims = mapDescription.dimensions || { width: 30, height: 30 };
      const dims = {
        width: Math.min(Math.max(rawDims.width || 30, 20), 80),
        height: Math.min(Math.max(rawDims.height || 30, 20), 80),
      };
      
      const generatedMap = await generateMap(
        mapType,
        dims.width,
        dims.height,
        100, // 100px grid size for Foundry compatibility
        mapDescription.name
      );

      // Save map to database first to get the ID
      const mapEntity = mapRepository().create({
        campaignId: campaign.id,
        sessionId: sessionId || undefined,
        name: mapDescription.name,
        description: mapDescription.description,
        type: mapType as MapType,
        gridSize: generatedMap.gridSize,
        dimensions: { width: generatedMap.gridWidth, height: generatedMap.gridHeight },
        details: mapDescription as unknown as Record<string, unknown>,
        foundryData: generatedMap.foundryScene as unknown as Record<string, unknown>,
      });

      await mapRepository().save(mapEntity);

      // Save the PNG image and update the entity with the URL
      const imageUrl = await saveMapImage(
        generatedMap.imageBuffer,
        mapEntity.id,
        generatedMap.fileName
      );
      mapEntity.imageUrl = imageUrl;
      await mapRepository().save(mapEntity);

      res.json({ map: mapEntity });
    } catch (error) {
      console.error('Generate map error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate map';
      console.error('Error details:', errorMessage);
      res.status(500).json({ 
        error: 'Failed to generate map',
        details: errorMessage 
      });
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

// Export Foundry VTT scene JSON for a map
router.get(
  '/campaigns/:id/maps/:mapId/foundry-export',
  [param('id').isUUID(), param('mapId').isUUID()],
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

      const map = await mapRepository().findOne({
        where: { id: req.params.mapId, campaignId: campaign.id },
      });

      if (!map) {
        res.status(404).json({ error: 'Map not found' });
        return;
      }

      if (!map.foundryData) {
        res.status(400).json({ error: 'Map has no Foundry VTT scene data' });
        return;
      }

      // Build the complete Foundry VTT scene export JSON
      const apiBaseUrl = `${req.protocol}://${req.get('host')}`;
      const sceneData = {
        ...map.foundryData,
        name: map.name,
        background: map.imageUrl
          ? { src: `${apiBaseUrl}${map.imageUrl}` }
          : undefined,
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${map.name.replace(/[^a-zA-Z0-9]/g, '_')}-foundry-scene.json"`
      );
      res.json(sceneData);
    } catch (error) {
      console.error('Foundry export error:', error);
      res.status(500).json({ error: 'Failed to export Foundry scene' });
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

// Generate token for NPC
router.post(
  '/campaigns/:id/npcs/:npcId/token',
  [param('id').isUUID(), param('npcId').isUUID()],
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

      const npc = await npcRepository().findOne({
        where: { id: req.params.npcId, campaignId: campaign.id },
      });

      if (!npc) {
        res.status(404).json({ error: 'NPC not found' });
        return;
      }

      // Determine token size from NPC stats or description
      let size = 'medium';
      if (npc.stats && typeof npc.stats === 'object') {
        const stats = npc.stats as { size?: string };
        size = stats.size?.toLowerCase() || 'medium';
      }

      // Generate token image
      const tokenData = await generateTokenFromDescription(
        npc.name,
        npc.description || npc.personality?.toString() || '',
        npc.id,
        size,
        npc.role?.toLowerCase().includes('enemy') ? 'npc' : 'character'
      );

      // Save token image
      const imageUrl = await saveTokenImage(
        tokenData.imageBuffer,
        npc.id,
        npc.name
      );

      // Create token entity
      // Map null color values to undefined for TypeORM compatibility
      const vision = tokenData.foundryData.vision
        ? { ...tokenData.foundryData.vision, color: tokenData.foundryData.vision.color ?? undefined }
        : undefined;
      const token = tokenRepository().create({
        campaignId: campaign.id,
        npcId: npc.id,
        name: npc.name,
        description: npc.description,
        imageUrl,
        type: npc.role?.toLowerCase().includes('enemy') ? 'npc' : 'character',
        size: tokenData.size,
        width: tokenData.width,
        height: tokenData.height,
        scale: 1.0,
        vision,
        detection: tokenData.foundryData.detection,
        foundryData: tokenData.foundryData,
      });

      await tokenRepository().save(token);

      // Update NPC with token image URL
      npc.tokenImageUrl = imageUrl;
      await npcRepository().save(npc);

      res.json({
        token: {
          id: token.id,
          name: token.name,
          imageUrl: token.imageUrl,
          size: token.size,
          width: token.width,
          height: token.height,
          foundryData: token.foundryData,
        },
      });
    } catch (error) {
      console.error('Generate token error:', error);
      res.status(500).json({ error: 'Failed to generate token' });
    }
  }
);

// Get tokens for a campaign
router.get(
  '/campaigns/:id/tokens',
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

      const tokens = await tokenRepository().find({
        where: { campaignId: campaign.id },
        order: { createdAt: 'DESC' },
      });

      res.json(tokens);
    } catch (error) {
      console.error('Get tokens error:', error);
      res.status(500).json({ error: 'Failed to retrieve tokens' });
    }
  }
);

// Generate continuity-aware scenario
router.post(
  '/sessions/:id/continuity-scenario',
  [
    param('id').isUUID(),
    body('description').notEmpty().isString(),
    body('partyLevel').optional().isInt({ min: 1, max: 20 }),
    body('partyComposition').optional().isString(),
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
        description,
        partyLevel = 1,
        partyComposition = 'Mixed party',
      } = req.body;

      const scenario = await generateContinuityScenario(
        session.campaignId,
        description,
        partyLevel,
        partyComposition
      );

      // Save scenario to session
      session.scenario = scenario as unknown as Record<string, unknown>;
      await sessionRepository().save(session);

      res.json({ session, scenario });
    } catch (error) {
      console.error('Generate continuity scenario error:', error);
      res.status(500).json({ error: 'Failed to generate continuity scenario' });
    }
  }
);

export default router;
