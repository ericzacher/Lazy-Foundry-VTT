import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { AppDataSource } from '../config/database';
import { Campaign } from '../entities/Campaign';
import { CampaignPlayer, PlayerStatus } from '../entities/CampaignPlayer';
import { Session } from '../entities/Session';
import { SessionStatus } from '../entities/Session';
import { NPC } from '../entities/NPC';
import { TimelineEvent } from '../entities/TimelineEvent';
import { SessionResult } from '../entities/SessionResult';
import { foundrySyncService } from '../services/foundrySync';
import { In } from 'typeorm';

const router = Router();

// GET /join/:inviteCode — Campaign info + roster preview (public)
router.get(
  '/join/:inviteCode',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const campaign = await AppDataSource.getRepository(Campaign).findOne({
        where: { inviteCode: req.params.inviteCode },
      });

      if (!campaign) {
        res.status(404).json({ error: 'Invalid invite link' });
        return;
      }

      const players = await AppDataSource.getRepository(CampaignPlayer).find({
        where: { campaignId: campaign.id },
        order: { invitedAt: 'ASC' },
      });

      res.json({
        campaign: {
          id: campaign.id,
          name: campaign.name,
          setting: campaign.setting,
          description: campaign.description,
          playerCount: campaign.playerCount,
          partyLevel: campaign.partyLevel,
        },
        players: players.map(p => ({
          id: p.id,
          playerName: p.playerName,
          characterName: p.characterName,
          status: p.status,
        })),
      });
    } catch (error) {
      console.error('Get join info error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /join/:inviteCode — Join campaign (public)
router.post(
  '/join/:inviteCode',
  [body('playerName').notEmpty().trim()],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const campaign = await AppDataSource.getRepository(Campaign).findOne({
        where: { inviteCode: req.params.inviteCode },
      });

      if (!campaign) {
        res.status(404).json({ error: 'Invalid invite link' });
        return;
      }

      const { playerName } = req.body;

      // Create CampaignPlayer record
      const player = AppDataSource.getRepository(CampaignPlayer).create({
        campaignId: campaign.id,
        playerName,
        status: PlayerStatus.JOINED,
        joinedAt: new Date(),
      });

      // Best-effort: create Foundry user for this player
      try {
        const foundryResult = await foundrySyncService.createFoundryUser(playerName);
        if (foundryResult.success && foundryResult.data) {
          player.foundryUserId = foundryResult.data._id;
        }
      } catch (err) {
        console.warn('[Invite] Foundry user creation failed (non-critical):', err);
      }

      await AppDataSource.getRepository(CampaignPlayer).save(player);

      res.status(201).json({
        player,
        campaignId: campaign.id,
      });
    } catch (error) {
      console.error('Join campaign error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PATCH /players/:playerId — Update player (foundryActorId, characterName, characterData, status)
router.patch(
  '/players/:playerId',
  [param('playerId').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const player = await AppDataSource.getRepository(CampaignPlayer).findOne({
        where: { id: req.params.playerId },
      });

      if (!player) {
        res.status(404).json({ error: 'Player not found' });
        return;
      }

      const { foundryActorId, characterName, characterData, status } = req.body;

      if (foundryActorId !== undefined) player.foundryActorId = foundryActorId;
      if (characterName !== undefined) player.characterName = characterName;
      if (characterData !== undefined) player.characterData = characterData;
      if (status !== undefined) player.status = status;

      await AppDataSource.getRepository(CampaignPlayer).save(player);

      res.json(player);
    } catch (error) {
      console.error('Update player error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /players/:playerId/fix-permissions — Push correct ownership to Foundry actor
router.post(
  '/players/:playerId/fix-permissions',
  [param('playerId').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const player = await AppDataSource.getRepository(CampaignPlayer).findOne({
        where: { id: req.params.playerId },
      });

      if (!player) {
        res.status(404).json({ error: 'Player not found' });
        return;
      }

      if (!player.foundryActorId || !player.foundryUserId) {
        res.status(400).json({ error: 'Player has no Foundry actor or user linked' });
        return;
      }

      const ownership: Record<string, number> = {
        default: 0,
        [player.foundryUserId]: 3,
      };

      // 1. Set actor ownership so the player can open/edit the character sheet
      const actorResult = await foundrySyncService.updateActor(player.foundryActorId, { ownership });
      if (!actorResult.success) {
        res.status(500).json({ error: 'Failed to update Foundry actor ownership', details: actorResult.error });
        return;
      }

      // 2. Link the actor as the user's default character for full token control
      const userResult = await foundrySyncService.updateFoundryUser(player.foundryUserId, {
        character: player.foundryActorId,
      });
      if (!userResult.success) {
        console.warn('[fix-permissions] Could not set default character on user (non-critical):', userResult.error);
      }

      res.json({ success: true, actorId: player.foundryActorId, foundryUserId: player.foundryUserId });
    } catch (error) {
      console.error('Fix permissions error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /portal/:playerId — Player portal data (public)
router.get(
  '/portal/:playerId',
  [param('playerId').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const player = await AppDataSource.getRepository(CampaignPlayer).findOne({
        where: { id: req.params.playerId },
      });

      if (!player) {
        res.status(404).json({ error: 'Player not found' });
        return;
      }

      const campaign = await AppDataSource.getRepository(Campaign).findOne({
        where: { id: player.campaignId },
      });

      if (!campaign) {
        res.status(404).json({ error: 'Campaign not found' });
        return;
      }

      // Get completed sessions
      const sessions = await AppDataSource.getRepository(Session).find({
        where: { campaignId: campaign.id, status: SessionStatus.COMPLETED },
        order: { sessionNumber: 'ASC' },
      });

      // Get session results (summaries)
      const sessionResults: Array<{ sessionNumber: number; title: string; summary?: string }> = [];
      for (const session of sessions) {
        const result = await AppDataSource.getRepository(SessionResult).findOne({
          where: { sessionId: session.id },
        });
        sessionResults.push({
          sessionNumber: session.sessionNumber,
          title: session.title,
          summary: result?.summary || undefined,
        });
      }

      // Get NPCs from completed sessions
      const allNpcIds = sessions.flatMap(s => s.npcIds || []);
      const uniqueNpcIds = [...new Set(allNpcIds)];
      let npcs: Array<{ name: string; role?: string; description?: string }> = [];
      if (uniqueNpcIds.length > 0) {
        const npcRecords = await AppDataSource.getRepository(NPC).find({
          where: { id: In(uniqueNpcIds) },
        });
        npcs = npcRecords.map(n => ({
          name: n.name,
          role: n.role,
          description: n.description,
        }));
      }

      // Get timeline events
      const timeline = await AppDataSource.getRepository(TimelineEvent).find({
        where: { campaignId: campaign.id },
        order: { createdAt: 'ASC' },
      });

      // Get upcoming session
      const upcomingSession = await AppDataSource.getRepository(Session).findOne({
        where: { campaignId: campaign.id, status: SessionStatus.PLANNED },
        order: { sessionNumber: 'ASC' },
      });

      res.json({
        campaign: {
          name: campaign.name,
          setting: campaign.setting,
          description: campaign.description,
          worldLore: campaign.worldLore,
        },
        player,
        sessions: sessionResults,
        npcs,
        timeline,
        upcomingSession: upcomingSession ? {
          title: upcomingSession.title,
          scheduledDate: upcomingSession.scheduledDate,
          sessionNumber: upcomingSession.sessionNumber,
        } : undefined,
      });
    } catch (error) {
      console.error('Get portal data error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
