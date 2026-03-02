import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { In } from 'typeorm';
import crypto from 'crypto';
import { AppDataSource } from '../config/database';
import { Campaign } from '../entities/Campaign';
import { CampaignPlayer } from '../entities/CampaignPlayer';
import { NPC } from '../entities/NPC';
import { Map as MapEntity } from '../entities/Map';
import { Session } from '../entities/Session';
import { Token } from '../entities/Token';
import { NPCHistory } from '../entities/NPCHistory';
import { SessionResult } from '../entities/SessionResult';
import { TimelineEvent } from '../entities/TimelineEvent';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { foundrySyncService } from '../services/foundrySync';
import {
  getCampaignSummary,
  getNPCCurrentStatus,
  addTimelineEvent,
  getTimeline,
} from '../services/sessionContinuity';
import { PlayerStatus } from '../entities/CampaignPlayer';
import { SessionStatus } from '../entities/Session';

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
        inviteCode: crypto.randomUUID(),
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
      const campaignId = req.params.id;

      const campaign = await campaignRepository().findOne({
        where: { id: campaignId, ownerId: req.userId! },
      });

      if (!campaign) {
        res.status(404).json({ error: 'Campaign not found' });
        return;
      }

      // Gather Foundry IDs before deleting local records
      const maps = await AppDataSource.getRepository(MapEntity).find({
        where: { campaignId },
        select: ['id', 'foundrySceneId'],
      });
      const npcs = await AppDataSource.getRepository(NPC).find({
        where: { campaignId },
        select: ['id', 'foundryActorId'],
      });
      const sessions = await AppDataSource.getRepository(Session).find({
        where: { campaignId },
        select: ['id'],
      });

      // Delete Foundry VTT items (best-effort — don't block if Foundry is unreachable)
      const sceneIds: string[] = maps.flatMap((m: MapEntity) => (m.foundrySceneId ? [m.foundrySceneId] : []));
      const actorIds: string[] = npcs.flatMap((n: NPC) => (n.foundryActorId ? [n.foundryActorId] : []));

      if (sceneIds.length > 0 || actorIds.length > 0) {
        try {
          await Promise.all([
            ...sceneIds.map((id) => foundrySyncService.deleteScene(id)),
            ...actorIds.map((id) => foundrySyncService.deleteActor(id)),
          ]);
          console.log(
            `[Campaign Delete] Removed ${sceneIds.length} scene(s) and ${actorIds.length} actor(s) from Foundry`
          );
        } catch (foundryErr) {
          console.warn('[Campaign Delete] Foundry cleanup partial or failed (continuing):', foundryErr);
        }
      }

      // Delete local DB records in dependency order
      const npcIds: string[] = npcs.map((n: NPC) => n.id);
      const sessionIds: string[] = sessions.map((s: Session) => s.id);

      if (npcIds.length > 0) {
        await AppDataSource.getRepository(NPCHistory).delete({ npcId: In(npcIds) });
      }
      if (sessionIds.length > 0) {
        await AppDataSource.getRepository(SessionResult).delete({ sessionId: In(sessionIds) });
      }
      await AppDataSource.getRepository(CampaignPlayer).delete({ campaignId });
      await AppDataSource.getRepository(TimelineEvent).delete({ campaignId });
      await AppDataSource.getRepository(Token).delete({ campaignId });
      await AppDataSource.getRepository(NPC).delete({ campaignId });
      await AppDataSource.getRepository(MapEntity).delete({ campaignId });
      await AppDataSource.getRepository(Session).delete({ campaignId });

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

// Delete a single timeline event
router.delete(
  '/:id/timeline/:eventId',
  [param('id').isUUID(), param('eventId').isUUID()],
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

      const event = await AppDataSource.getRepository(TimelineEvent).findOne({
        where: { id: req.params.eventId, campaignId: req.params.id },
      });
      if (!event) {
        res.status(404).json({ error: 'Timeline event not found' });
        return;
      }

      await AppDataSource.getRepository(TimelineEvent).remove(event);

      res.status(204).send();
    } catch (error) {
      console.error('Delete timeline event error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── Player Roster Endpoints ───────────────────────────────────────

// List players in campaign
router.get(
  '/:id/players',
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

      const players = await AppDataSource.getRepository(CampaignPlayer).find({
        where: { campaignId: campaign.id },
        order: { invitedAt: 'ASC' },
      });

      res.json({ players, inviteCode: campaign.inviteCode });
    } catch (error) {
      console.error('List players error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GM adds a player to roster
router.post(
  '/:id/players',
  [
    param('id').isUUID(),
    body('playerName').notEmpty().trim(),
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

      const player = AppDataSource.getRepository(CampaignPlayer).create({
        campaignId: campaign.id,
        playerName: req.body.playerName,
      });

      await AppDataSource.getRepository(CampaignPlayer).save(player);

      res.status(201).json(player);
    } catch (error) {
      console.error('Add player error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Remove player from roster
router.delete(
  '/:id/players/:playerId',
  [param('id').isUUID(), param('playerId').isUUID()],
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

      const player = await AppDataSource.getRepository(CampaignPlayer).findOne({
        where: { id: req.params.playerId, campaignId: campaign.id },
      });
      if (!player) {
        res.status(404).json({ error: 'Player not found' });
        return;
      }

      await AppDataSource.getRepository(CampaignPlayer).remove(player);

      res.status(204).send();
    } catch (error) {
      console.error('Remove player error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Regenerate invite code
router.post(
  '/:id/invite-code',
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

      campaign.inviteCode = crypto.randomUUID();
      await campaignRepository().save(campaign);

      res.json({ inviteCode: campaign.inviteCode });
    } catch (error) {
      console.error('Regenerate invite code error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── Session Zero Endpoints ──────────────────────────────────────

// Get session zero data: roster + party composition analysis
router.get(
  '/:id/session-zero',
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

      const players = await AppDataSource.getRepository(CampaignPlayer).find({
        where: { campaignId: campaign.id },
        order: { invitedAt: 'ASC' },
      });

      const allReady = players.length > 0 && players.every(p => p.status === PlayerStatus.READY);

      // Compute party composition from characterData
      const ROLE_MAP: Record<string, string> = {
        Fighter: 'Tank', Barbarian: 'Tank', Paladin: 'Tank',
        Cleric: 'Healer', Druid: 'Healer',
        Rogue: 'DPS', Ranger: 'DPS', Monk: 'DPS',
        Wizard: 'Utility', Sorcerer: 'Utility', Warlock: 'Utility', Bard: 'Utility', Artificer: 'Utility',
      };

      const classes: Record<string, number> = {};
      const races: Record<string, number> = {};
      const backgrounds: Record<string, number> = {};
      const roles: Record<string, number> = {};
      const abilityTotals: Record<string, number> = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
      let readyCount = 0;

      for (const player of players) {
        if (player.status !== PlayerStatus.READY || !player.characterData) continue;
        readyCount++;
        const cd = player.characterData as Record<string, unknown>;
        const cls = cd.class as string || 'Unknown';
        const race = cd.race as string || 'Unknown';
        const bg = cd.background as string || 'Unknown';

        classes[cls] = (classes[cls] || 0) + 1;
        races[race] = (races[race] || 0) + 1;
        backgrounds[bg] = (backgrounds[bg] || 0) + 1;

        const role = ROLE_MAP[cls] || 'Utility';
        roles[role] = (roles[role] || 0) + 1;

        const scores = cd.abilityScores as Record<string, number> | undefined;
        if (scores) {
          for (const key of Object.keys(abilityTotals)) {
            abilityTotals[key] += (scores[key] || 0);
          }
        }
      }

      const abilitySpread: Record<string, number> = {};
      if (readyCount > 0) {
        for (const key of Object.keys(abilityTotals)) {
          abilitySpread[key] = Math.round(abilityTotals[key] / readyCount);
        }
      }

      res.json({
        campaign: {
          id: campaign.id,
          name: campaign.name,
          setting: campaign.setting,
          description: campaign.description,
          playerCount: campaign.playerCount,
          inviteCode: campaign.inviteCode,
        },
        players,
        allReady,
        composition: {
          classes,
          races,
          backgrounds,
          roles,
          abilitySpread,
        },
      });
    } catch (error) {
      console.error('Get session zero error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Generate party hooks (AI backstory connections)
router.post(
  '/:id/session-zero/party-hooks',
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

      const players = await AppDataSource.getRepository(CampaignPlayer).find({
        where: { campaignId: campaign.id, status: PlayerStatus.READY },
      });

      if (players.length === 0) {
        res.status(400).json({ error: 'No ready players found' });
        return;
      }

      const characterSummaries = players.map(p => {
        const cd = p.characterData as Record<string, unknown>;
        return `${p.characterName || p.playerName}: ${cd?.race || ''} ${cd?.class || ''}, Background: ${cd?.background || ''}, Backstory: ${cd?.backstory || 'none'}`;
      }).join('\n');

      // Use dynamic import for AI service
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({
        apiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY,
        baseURL: process.env.GROQ_API_KEY ? 'https://api.groq.com/openai/v1' : 'https://api.openai.com/v1',
      });
      const model = process.env.GROQ_API_KEY ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini';

      const response = await openai.chat.completions.create({
        model,
        messages: [{
          role: 'user',
          content: `You are a creative D&D Dungeon Master. Given these player characters in the campaign "${campaign.name}" (${campaign.setting || 'High Fantasy'}), generate backstory connections and party hooks that tie them together.

Characters:
${characterSummaries}

Respond with a JSON object:
{
  "connections": [{ "characters": ["Name1", "Name2"], "connection": "description of how they're connected" }],
  "partyHook": "A compelling reason why this group comes together",
  "tensions": [{ "characters": ["Name1", "Name2"], "tension": "a potential source of intra-party drama" }],
  "sharedGoal": "A common objective that unites the party"
}

Respond ONLY with valid JSON.`
        }],
        response_format: { type: 'json_object' },
      });

      const hooks = JSON.parse(response.choices[0].message.content || '{}');
      res.json(hooks);
    } catch (error) {
      console.error('Generate party hooks error:', error);
      res.status(500).json({ error: 'Failed to generate party hooks' });
    }
  }
);

// Regenerate world lore tuned to the party
router.post(
  '/:id/session-zero/regenerate-lore',
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

      const players = await AppDataSource.getRepository(CampaignPlayer).find({
        where: { campaignId: campaign.id, status: PlayerStatus.READY },
      });

      const partyDesc = players.map(p => {
        const cd = p.characterData as Record<string, unknown>;
        return `${cd?.race || ''} ${cd?.class || ''} (${cd?.background || ''})`;
      }).join(', ');

      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({
        apiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY,
        baseURL: process.env.GROQ_API_KEY ? 'https://api.groq.com/openai/v1' : 'https://api.openai.com/v1',
      });
      const model = process.env.GROQ_API_KEY ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini';

      const response = await openai.chat.completions.create({
        model,
        messages: [{
          role: 'user',
          content: `You are a creative Dungeon Master. Regenerate world lore for the campaign "${campaign.name}" (Setting: ${campaign.setting || 'High Fantasy'}, Theme: ${campaign.theme || 'Adventure'}, Tone: ${campaign.tone || 'Balanced'}).

The party consists of: ${partyDesc}

Tailor the lore to incorporate elements relevant to these characters' races, classes, and backgrounds.

Respond with a JSON object:
{
  "worldDescription": "2-3 paragraph world description",
  "history": "Brief world history relevant to the party",
  "factions": [{ "name": "Faction Name", "description": "Description, including relevance to party members" }],
  "locations": [{ "name": "Location Name", "description": "Description" }],
  "hooks": ["Adventure hook relevant to the party"]
}

Respond ONLY with valid JSON.`
        }],
        response_format: { type: 'json_object' },
      });

      const lore = JSON.parse(response.choices[0].message.content || '{}');
      campaign.worldLore = lore;
      await campaignRepository().save(campaign);

      res.json({ campaign, lore });
    } catch (error) {
      console.error('Regenerate lore error:', error);
      res.status(500).json({ error: 'Failed to regenerate lore' });
    }
  }
);

// Create Session 1 with AI scenario
router.post(
  '/:id/session-zero/create-session-one',
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

      const players = await AppDataSource.getRepository(CampaignPlayer).find({
        where: { campaignId: campaign.id, status: PlayerStatus.READY },
      });

      // Ensure all players have Foundry VTT user profiles and correct actor ownership
      for (const player of players) {
        if (!player.foundryUserId) {
          try {
            const result = await foundrySyncService.createFoundryUser(player.playerName);
            if (result.success && result.data) {
              player.foundryUserId = result.data._id;
              await AppDataSource.getRepository(CampaignPlayer).save(player);
              console.log(`[Session Zero] Created Foundry user for ${player.playerName}: ${result.data._id}`);
            }
          } catch (err) {
            console.warn(`[Session Zero] Failed to create Foundry user for ${player.playerName}:`, err);
          }
        }

        if (player.foundryActorId && player.foundryUserId) {
          try {
            const ownership: Record<string, number> = { default: 0, [player.foundryUserId]: 3 };
            await foundrySyncService.updateActor(player.foundryActorId, { ownership });
            await foundrySyncService.updateFoundryUser(player.foundryUserId, { character: player.foundryActorId });
          } catch (err) {
            console.warn(`[Session Zero] Failed to fix actor ownership for ${player.playerName}:`, err);
          }
        }
      }

      const partyDesc = players.map(p => {
        const cd = p.characterData as Record<string, unknown>;
        return `${p.characterName || p.playerName}: ${cd?.race || ''} ${cd?.class || ''} Level ${campaign.partyLevel || 1}`;
      }).join(', ');

      const loreContext = campaign.worldLore
        ? JSON.stringify(campaign.worldLore).slice(0, 2000)
        : campaign.setting || 'High Fantasy';

      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({
        apiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY,
        baseURL: process.env.GROQ_API_KEY ? 'https://api.groq.com/openai/v1' : 'https://api.openai.com/v1',
      });
      const model = process.env.GROQ_API_KEY ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini';

      const response = await openai.chat.completions.create({
        model,
        messages: [{
          role: 'user',
          content: `You are a creative Dungeon Master. Create a compelling first session scenario for the campaign "${campaign.name}".

World/Lore Context: ${loreContext}
Party: ${partyDesc}

Create an opening scenario that:
- Introduces the party naturally
- Establishes the campaign's tone and stakes
- Includes a mix of roleplay and potential combat
- Ends with a hook for the next session

Respond with a JSON object:
{
  "title": "Session title",
  "description": "Brief overview",
  "scenario": {
    "summary": "2-3 paragraph scenario overview",
    "objectives": ["objective 1", "objective 2"],
    "encounters": [{ "name": "encounter name", "description": "description", "difficulty": "easy/medium/hard" }],
    "rewards": ["reward 1"],
    "twists": ["twist 1"]
  }
}

Respond ONLY with valid JSON.`
        }],
        response_format: { type: 'json_object' },
      });

      const scenarioData = JSON.parse(response.choices[0].message.content || '{}');

      // Check how many sessions exist to determine session number
      const existingSessions = await AppDataSource.getRepository(Session).count({
        where: { campaignId: campaign.id },
      });

      const session = AppDataSource.getRepository(Session).create({
        campaignId: campaign.id,
        sessionNumber: existingSessions + 1,
        title: scenarioData.title || 'Session 1',
        description: scenarioData.description,
        scenario: scenarioData.scenario,
        status: SessionStatus.PLANNED,
      });

      await AppDataSource.getRepository(Session).save(session);

      res.status(201).json({ session, scenario: scenarioData.scenario });
    } catch (error) {
      console.error('Create session one error:', error);
      res.status(500).json({ error: 'Failed to create session' });
    }
  }
);

export default router;
