import { Router, Response } from 'express';
import { param, validationResult } from 'express-validator';
import { AppDataSource } from '../config/database';
import { Campaign } from '../entities/Campaign';
import { Map } from '../entities/Map';
import { NPC } from '../entities/NPC';
import { Token } from '../entities/Token';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { foundrySyncService } from '../services/foundrySync';

const router = Router();

const campaignRepository = () => AppDataSource.getRepository(Campaign);
const mapRepository = () => AppDataSource.getRepository(Map);
const npcRepository = () => AppDataSource.getRepository(NPC);
const tokenRepository = () => AppDataSource.getRepository(Token);

// Apply auth middleware to all routes
router.use(authMiddleware);

/**
 * IMPORTANT: Foundry VTT Integration Requirements
 * 
 * For sync to work properly, Foundry VTT must:
 * 1. Be running at FOUNDRY_URL (default: http://foundry:30000)
 * 2. Have a world loaded and active
 * 3. Have FOUNDRY_ADMIN_KEY set with a valid admin key
 * 
 * If you get 404 errors, ensure:
 * - Foundry VTT has a world loaded (not at the setup/world selection screen)
 * - The admin key is configured in Foundry's configuration
 * - The API is enabled in Foundry's settings
 */

// Health check for Foundry VTT
router.get('/health', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const foundryUrl = process.env.FOUNDRY_URL || 'http://foundry:30000';
    const status = await foundrySyncService.getStatus();
    const isHealthy = await foundrySyncService.healthCheck();
    
    if (isHealthy) {
      res.json({ 
        status: 'connected', 
        foundryUrl,
        worldActive: status.active || false,
        foundryVersion: status.version,
        world: status.world,
        system: status.system
      });
    } else {
      res.status(503).json({ 
        status: 'disconnected', 
        error: 'Foundry VTT is not accessible',
        foundryUrl,
        worldActive: false
      });
    }
  } catch (error) {
    console.error('Foundry health check error:', error);
    res.status(500).json({ error: 'Failed to check Foundry status' });
  }
});

// Sync a map to Foundry VTT as a scene
router.post(
  '/scenes/:mapId',
  [param('mapId').isUUID()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const map = await mapRepository().findOne({
        where: { id: req.params.mapId },
        relations: ['campaign'],
      });

      if (!map) {
        res.status(404).json({ error: 'Map not found' });
        return;
      }

      // Verify ownership
      if (map.campaign.ownerId !== req.userId) {
        res.status(403).json({ error: 'Not authorized' });
        return;
      }

      if (!map.foundryData) {
        res.status(400).json({ error: 'Map has no Foundry data' });
        return;
      }

      // Build scene data with Docker-internal URL for background image
      // Foundry container accesses the API via Docker network hostname 'api:3001'
      const apiBaseUrl = process.env.API_INTERNAL_URL || 'http://api:3001';
      const sceneData = {
        ...map.foundryData,
        name: map.name,
        background: map.imageUrl
          ? { src: `${apiBaseUrl}${map.imageUrl}` }
          : undefined,
      };

      // Push to Foundry
      const result = await foundrySyncService.createScene(sceneData);

      if (!result.success) {
        res.status(500).json({ 
          error: 'Failed to sync scene to Foundry', 
          details: result.error 
        });
        return;
      }

      // Store Foundry scene ID and update sync status
      map.foundrySceneId = result.data?._id;
      map.lastSyncedAt = new Date();
      map.syncStatus = 'synced';
      await mapRepository().save(map);

      res.json({
        success: true,
        message: 'Map synced to Foundry VTT',
        foundrySceneId: result.data?._id,
      });
    } catch (error) {
      console.error('Sync map error:', error);
      res.status(500).json({ error: 'Failed to sync map to Foundry' });
    }
  }
);

// Sync an NPC to Foundry VTT as an actor
router.post(
  '/actors/:npcId',
  [param('npcId').isUUID()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const npc = await npcRepository().findOne({
        where: { id: req.params.npcId },
        relations: ['campaign'],
      });

      if (!npc) {
        res.status(404).json({ error: 'NPC not found' });
        return;
      }

      // Verify ownership
      if (npc.campaign.ownerId !== req.userId) {
        res.status(403).json({ error: 'Not authorized' });
        return;
      }

      // Build actor data for Foundry (Docker-internal URL)
      const apiBaseUrl = process.env.API_INTERNAL_URL || 'http://api:3001';
      const actorData = {
        name: npc.name,
        type: 'npc',
        img: npc.tokenImageUrl ? `${apiBaseUrl}${npc.tokenImageUrl}` : undefined,
        system: {
          details: {
            biography: {
              value: `
                <h2>${npc.name}</h2>
                <p><strong>Role:</strong> ${npc.role || 'Unknown'}</p>
                <p>${npc.description || ''}</p>
                ${npc.background ? `<h3>Background</h3><p>${npc.background}</p>` : ''}
                ${npc.motivations?.length ? `<h3>Motivations</h3><ul>${npc.motivations.map(m => `<li>${m}</li>`).join('')}</ul>` : ''}
              `,
            },
          },
          abilities: npc.stats
            ? {
                str: { value: npc.stats.strength || 10 },
                dex: { value: npc.stats.dexterity || 10 },
                con: { value: npc.stats.constitution || 10 },
                int: { value: npc.stats.intelligence || 10 },
                wis: { value: npc.stats.wisdom || 10 },
                cha: { value: npc.stats.charisma || 10 },
              }
            : undefined,
        },
      };

      // Push to Foundry
      const result = await foundrySyncService.createActor(actorData);

      if (!result.success) {
        res.status(500).json({ 
          error: 'Failed to sync NPC to Foundry', 
          details: result.error 
        });
        return;
      }

      // Store Foundry actor ID and update sync status
      npc.foundryActorId = result.data?._id;
      npc.lastSyncedAt = new Date();
      npc.syncStatus = 'synced';
      await npcRepository().save(npc);

      res.json({
        success: true,
        message: 'NPC synced to Foundry VTT',
        foundryActorId: result.data?._id,
      });
    } catch (error) {
      console.error('Sync NPC error:', error);
      res.status(500).json({ error: 'Failed to sync NPC to Foundry' });
    }
  }
);

// Sync campaign lore to Foundry as journal entries
router.post(
  '/journals/:campaignId',
  [param('campaignId').isUUID()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const campaign = await campaignRepository().findOne({
        where: { id: req.params.campaignId, ownerId: req.userId! },
      });

      if (!campaign) {
        res.status(404).json({ error: 'Campaign not found' });
        return;
      }

      if (!campaign.worldLore || Object.keys(campaign.worldLore).length === 0) {
        res.status(400).json({ error: 'Campaign has no world lore' });
        return;
      }

      // Build journal entry content
      let content = `<h1>${campaign.name}</h1>`;
      content += `<p><strong>Setting:</strong> ${campaign.setting || 'Unknown'}</p>`;
      content += `<p><strong>Theme:</strong> ${campaign.theme || 'Unknown'}</p>`;
      content += `<p><strong>Tone:</strong> ${campaign.tone || 'Unknown'}</p>`;
      
      if (campaign.description) {
        content += `<h2>Description</h2><p>${campaign.description}</p>`;
      }

      // Add world lore sections
      const lore = campaign.worldLore as Record<string, unknown>;
      for (const [key, value] of Object.entries(lore)) {
        if (value && typeof value === 'object') {
          content += `<h2>${key.charAt(0).toUpperCase() + key.slice(1)}</h2>`;
          content += `<p>${JSON.stringify(value, null, 2)}</p>`;
        } else if (value) {
          content += `<h2>${key.charAt(0).toUpperCase() + key.slice(1)}</h2>`;
          content += `<p>${value}</p>`;
        }
      }

      const journalData = {
        name: `${campaign.name} - World Lore`,
        content,
      };

      // Push to Foundry
      const result = await foundrySyncService.createJournalEntry(journalData);

      if (!result.success) {
        res.status(500).json({ 
          error: 'Failed to sync lore to Foundry', 
          details: result.error 
        });
        return;
      }

      res.json({
        success: true,
        message: 'Campaign lore synced to Foundry VTT',
        foundryJournalId: result.data?._id,
      });
    } catch (error) {
      console.error('Sync lore error:', error);
      res.status(500).json({ error: 'Failed to sync lore to Foundry' });
    }
  }
);

// Bulk sync entire campaign to Foundry
router.post(
  '/campaigns/:campaignId/bulk',
  [param('campaignId').isUUID()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const campaign = await campaignRepository().findOne({
        where: { id: req.params.campaignId, ownerId: req.userId! },
      });

      if (!campaign) {
        res.status(404).json({ error: 'Campaign not found' });
        return;
      }

      const results = {
        scenes: { success: 0, failed: 0 },
        actors: { success: 0, failed: 0 },
        journals: { success: 0, failed: 0 },
      };

      // Sync all maps
      const maps = await mapRepository().find({
        where: { campaignId: campaign.id },
      });

      for (const map of maps) {
        if (!map.foundryData || !map.imageUrl) continue;

        const apiBaseUrl = process.env.API_INTERNAL_URL || 'http://api:3001';
        const sceneData = {
          ...map.foundryData,
          name: map.name,
          background: { src: `${apiBaseUrl}${map.imageUrl}` },
        };

        const result = await foundrySyncService.createScene(sceneData);
        if (result.success) {
          map.foundrySceneId = result.data?._id;
          map.lastSyncedAt = new Date();
          map.syncStatus = 'synced';
          await mapRepository().save(map);
          results.scenes.success++;
        } else {
          map.syncStatus = 'error';
          await mapRepository().save(map);
          results.scenes.failed++;
        }
      }

      // Sync all NPCs
      const npcs = await npcRepository().find({
        where: { campaignId: campaign.id },
      });

      for (const npc of npcs) {
        const apiBaseUrl = process.env.API_INTERNAL_URL || 'http://api:3001';
        const actorData = {
          name: npc.name,
          type: 'npc' as const,
          img: npc.tokenImageUrl ? `${apiBaseUrl}${npc.tokenImageUrl}` : undefined,
          system: {
            details: {
              biography: {
                value: `<h2>${npc.name}</h2><p>${npc.description || ''}</p>`,
              },
            },
            abilities: npc.stats
              ? {
                  str: { value: (npc.stats as { strength?: number }).strength || 10 },
                  dex: { value: (npc.stats as { dexterity?: number }).dexterity || 10 },
                  con: { value: (npc.stats as { constitution?: number }).constitution || 10 },
                  int: { value: (npc.stats as { intelligence?: number }).intelligence || 10 },
                  wis: { value: (npc.stats as { wisdom?: number }).wisdom || 10 },
                  cha: { value: (npc.stats as { charisma?: number }).charisma || 10 },
                }
              : undefined,
          },
        };

        const result = await foundrySyncService.createActor(actorData);
        if (result.success) {
          npc.foundryActorId = result.data?._id;
          npc.lastSyncedAt = new Date();
          npc.syncStatus = 'synced';
          await npcRepository().save(npc);
          results.actors.success++;
        } else {
          npc.syncStatus = 'error';
          await npcRepository().save(npc);
          results.actors.failed++;
        }
      }

      // Sync campaign lore
      if (campaign.worldLore && Object.keys(campaign.worldLore).length > 0) {
        let content = `<h1>${campaign.name}</h1>`;
        content += `<p>${campaign.description || ''}</p>`;
        
        const lore = campaign.worldLore as Record<string, unknown>;
        for (const [key, value] of Object.entries(lore)) {
          content += `<h2>${key}</h2><p>${JSON.stringify(value)}</p>`;
        }

        const result = await foundrySyncService.createJournalEntry({
          name: `${campaign.name} - World Lore`,
          content,
        });

        if (result.success) {
          results.journals.success++;
        } else {
          results.journals.failed++;
        }
      }

      res.json({
        success: true,
        message: 'Bulk sync completed',
        results,
      });
    } catch (error) {
      console.error('Bulk sync error:', error);
      res.status(500).json({ error: 'Failed to bulk sync campaign' });
    }
  }
);

// Get list of scenes from Foundry
router.get('/scenes', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await foundrySyncService.getScenes();
    
    if (!result.success) {
      res.status(500).json({ error: 'Failed to fetch scenes from Foundry' });
      return;
    }

    res.json({ scenes: result.data });
  } catch (error) {
    console.error('Get scenes error:', error);
    res.status(500).json({ error: 'Failed to fetch scenes from Foundry' });
  }
});

// Get list of actors from Foundry
router.get('/actors', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await foundrySyncService.getActors();
    
    if (!result.success) {
      res.status(500).json({ error: 'Failed to fetch actors from Foundry' });
      return;
    }

    res.json({ actors: result.data });
  } catch (error) {
    console.error('Get actors error:', error);
    res.status(500).json({ error: 'Failed to fetch actors from Foundry' });
  }
});

export default router;
