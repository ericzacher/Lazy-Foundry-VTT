import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import OpenAI from 'openai';
import { authMiddleware } from '../middleware/auth';
import { AppDataSource } from '../config/database';
import { Store } from '../entities/Store';
import { foundrySyncService } from '../services/foundrySync';
import { logInfo, logError } from '../utils/logger';
import {
  ITEMS, RARITY_ORDER, SETTLEMENT_MAX_RARITY, RARITY_CHANCE,
  STOCK_SIZE_RANGE, getItemPool, weightedSelect, rollQuantity,
  applyPriceVariance, fencePrice,
  type Rarity, type StoreType, type SettlementSize, type ItemTemplate,
} from '../data/storeItems';

const router = Router();
router.use(authMiddleware);

// ─── Types ────────────────────────────────────────────────────────────────────

interface StoreItem {
  name: string;
  category: string;
  rarity: string;
  quantity: number;
  priceGp: number;
  isMagic: boolean;
  description?: string;
}

interface GeneratedStore {
  id: string;
  campaignId?: string;
  name: string;
  shopkeeperName: string;
  shopkeeperRace: string;
  shopkeeperPersonality: string;
  description: string;
  storeType: string;
  settlementSize: string;
  racialInfluence: string;
  biome: string;
  inventory: StoreItem[];
  totalValue: number;
  foundryJournalId?: string;
  createdAt: string;
}

// ─── AI Client ────────────────────────────────────────────────────────────────

function getAIClient() {
  return new OpenAI({
    apiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY,
    baseURL: process.env.GROQ_API_KEY
      ? 'https://api.groq.com/openai/v1'
      : 'https://api.openai.com/v1',
  });
}

function getModel(): string {
  return process.env.GROQ_API_KEY ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini';
}

// ─── Generation Logic ─────────────────────────────────────────────────────────

function pickShopkeeperRace(racialInfluence: string): string {
  if (racialInfluence !== 'mixed' && racialInfluence !== 'none') return racialInfluence;
  const races = ['Human', 'Elf', 'Dwarf', 'Halfling', 'Gnome', 'Half-Elf', 'Tiefling', 'Dragonborn'];
  return races[Math.floor(Math.random() * races.length)];
}

function filterByRarity(pool: ItemTemplate[], settlementSize: SettlementSize): ItemTemplate[] {
  const chances = RARITY_CHANCE[settlementSize];
  return pool.filter(item => {
    const chance = chances[item.rarity] ?? 0;
    return Math.random() < chance;
  });
}

async function generateStoreAI(params: {
  storeType: string;
  settlementSize: string;
  racialInfluence: string;
  biome: string;
  shopkeeperRace: string;
  itemNames: string[];
  locationName?: string;
  campaignContext?: { setting?: string; theme?: string; tone?: string; worldSummary?: string };
}): Promise<{
  shopName: string;
  shopkeeperName: string;
  shopkeeperPersonality: string;
  description: string;
  magicItemDescriptions: Record<string, string>;
}> {
  const openai = getAIClient();
  const model = getModel();

  const worldLines: string[] = [];
  if (params.locationName) worldLines.push(`- Location name: ${params.locationName}`);
  if (params.campaignContext?.setting) worldLines.push(`- World setting: ${params.campaignContext.setting}`);
  if (params.campaignContext?.theme) worldLines.push(`- Campaign theme: ${params.campaignContext.theme}`);
  if (params.campaignContext?.tone) worldLines.push(`- World tone: ${params.campaignContext.tone}`);
  if (params.campaignContext?.worldSummary) worldLines.push(`- World lore summary: ${params.campaignContext.worldSummary}`);
  const worldContext = worldLines.length > 0 ? `\nWorld context:\n${worldLines.join('\n')}` : '';

  const prompt = `You are generating a D&D 5e shop for a tabletop RPG. Return ONLY valid JSON.

Shop context:
- Type: ${params.storeType}
- Settlement: ${params.settlementSize} ${params.biome} settlement
- Racial influence: ${params.racialInfluence}
- Shopkeeper race: ${params.shopkeeperRace}
- Inventory: ${params.itemNames.join(', ')}${worldContext}

Return this exact JSON structure:
{
  "shopName": "a unique, thematic shop name (2-4 words)",
  "shopkeeperName": "a fitting name for a ${params.shopkeeperRace} shopkeeper",
  "shopkeeperPersonality": "1-2 sentence description of personality and manner",
  "description": "2-3 sentences describing the shop atmosphere, smells, decor",
  "magicItemDescriptions": {}
}

For any magic items in the inventory, add their name as a key with a 1-sentence flavor description.
Make everything thematically consistent with ${params.racialInfluence} culture, ${params.biome} setting${params.locationName ? `, and the location "${params.locationName}"` : ''}.
${params.campaignContext ? 'Ground names and descriptions in the provided world context.' : ''}`;

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.85,
      max_tokens: 600,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? '';
    const jsonStr = raw.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
    return JSON.parse(jsonStr);
  } catch (err) {
    logError('Store AI generation failed, using fallback', { error: (err as Error).message });
    // Fallback names if AI fails
    const typeNames: Record<string, string> = {
      general: 'The Trading Post', blacksmith: 'The Iron Anvil', armorer: 'The Iron Bastion',
      alchemist: 'The Bubbling Flask', magic: 'The Arcane Cache', herbalist: "Nature's Remedy",
      tailor: 'The Gilded Needle', jeweler: 'The Glittering Stone', fence: 'Curiosities & Such',
      shipwright: 'The Dockside Depot',
    };
    return {
      shopName: typeNames[params.storeType] ?? 'The Shop',
      shopkeeperName: `${params.shopkeeperRace} Merchant`,
      shopkeeperPersonality: 'A practical merchant who values fair trades.',
      description: 'A well-stocked establishment with neatly arranged wares.',
      magicItemDescriptions: {},
    };
  }
}

// ─── POST /api/stores/generate ────────────────────────────────────────────────

router.post(
  '/generate',
  [
    body('settlementSize').isIn(['hamlet', 'village', 'town', 'city', 'metropolis']),
    body('storeType').isIn(['general','blacksmith','armorer','alchemist','magic','herbalist','tailor','jeweler','fence','shipwright']),
    body('racialInfluence').isString().notEmpty(),
    body('biome').isString().notEmpty(),
    body('maxRarity').optional().isIn(['common','uncommon','rare','very rare','legendary']),
    body('stockSize').optional().isIn(['small','medium','large']),
    body('magicItems').optional().isBoolean(),
    body('campaignId').optional().isUUID(),
    body('locationName').optional().isString().trim(),
    body('campaignContext').optional().isObject(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Validation failed', details: errors.array() });
      return;
    }

    const {
      settlementSize = 'town',
      storeType = 'general',
      racialInfluence = 'mixed',
      biome = 'urban',
      stockSize = 'medium',
      magicItems = true,
      campaignId,
      locationName,
      campaignContext,
    } = req.body as {
      settlementSize: SettlementSize;
      storeType: StoreType;
      racialInfluence: string;
      biome: string;
      maxRarity?: Rarity;
      stockSize?: string;
      magicItems?: boolean;
      campaignId?: string;
      locationName?: string;
      campaignContext?: { setting?: string; theme?: string; tone?: string; worldSummary?: string };
    };

    // Derive maxRarity from settlement size (can be overridden by request)
    const maxRarity: Rarity = (req.body.maxRarity as Rarity) || SETTLEMENT_MAX_RARITY[settlementSize];

    try {
      logInfo('Generating store', { storeType, settlementSize, racialInfluence, biome, maxRarity });

      // 1. Build item pool
      let pool = getItemPool(storeType, maxRarity, magicItems);

      // 2. Apply rarity probability gate (prevents rare items being guaranteed)
      pool = filterByRarity(pool, settlementSize);

      // Ensure we have a minimum pool to draw from
      if (pool.length < 3) {
        pool = getItemPool(storeType, 'common', false);
      }

      // 3. Determine stock count
      const [minStock, maxStock] = STOCK_SIZE_RANGE[stockSize] ?? [9, 14];
      const targetCount = minStock + Math.floor(Math.random() * (maxStock - minStock + 1));

      // 4. Weighted selection (racial + biome bias)
      const selected = weightedSelect(pool, racialInfluence, biome, targetCount);

      // 5. Build inventory with quantities and prices
      const isFence = storeType === 'fence';
      const inventory: StoreItem[] = selected.map(item => {
        const qty = rollQuantity(item, settlementSize);
        const price = isFence ? fencePrice(item.basePrice) : applyPriceVariance(item.basePrice);
        return {
          name: item.name,
          category: item.category,
          rarity: item.rarity,
          quantity: qty,
          priceGp: price,
          isMagic: item.isMagic,
        };
      });

      // 6. AI enrichment
      const shopkeeperRace = pickShopkeeperRace(racialInfluence);
      const magicItemNames = inventory.filter(i => i.isMagic).map(i => i.name);
      const allItemNames = inventory.map(i => i.name);

      const aiResult = await generateStoreAI({
        storeType,
        settlementSize,
        racialInfluence,
        biome,
        shopkeeperRace,
        itemNames: allItemNames,
        locationName,
        campaignContext,
      });

      // Apply magic item descriptions from AI
      for (const item of inventory) {
        if (item.isMagic && aiResult.magicItemDescriptions[item.name]) {
          item.description = aiResult.magicItemDescriptions[item.name];
        }
      }

      const totalValue = inventory.reduce((sum, i) => sum + i.priceGp * i.quantity, 0);

      // 7. Save to DB
      const storeRepo = AppDataSource.getRepository(Store);
      const storeRecord = storeRepo.create({
        campaignId: campaignId || undefined,
        name: aiResult.shopName,
        storeType,
        parameters: { settlementSize, storeType, racialInfluence, biome, maxRarity, stockSize, magicItems },
        data: {
          name: aiResult.shopName,
          shopkeeperName: aiResult.shopkeeperName,
          shopkeeperRace,
          shopkeeperPersonality: aiResult.shopkeeperPersonality,
          description: aiResult.description,
          storeType,
          settlementSize,
          racialInfluence,
          biome,
          inventory,
          totalValue,
        },
      });

      const saved = await storeRepo.save(storeRecord);

      const result: GeneratedStore = {
        id: saved.id,
        campaignId: saved.campaignId,
        name: aiResult.shopName,
        shopkeeperName: aiResult.shopkeeperName,
        shopkeeperRace,
        shopkeeperPersonality: aiResult.shopkeeperPersonality,
        description: aiResult.description,
        storeType,
        settlementSize,
        racialInfluence,
        biome,
        inventory,
        totalValue,
        createdAt: saved.createdAt.toISOString(),
      };

      logInfo('Store generated', { id: saved.id, name: result.name, items: inventory.length });
      res.json({ success: true, store: result });
    } catch (error) {
      logError('Store generation error', { error: (error as Error).message });
      res.status(500).json({ error: 'Failed to generate store' });
    }
  }
);

// ─── GET /api/stores ──────────────────────────────────────────────────────────

router.get(
  '/',
  [query('campaignId').optional().isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const storeRepo = AppDataSource.getRepository(Store);
      const { campaignId } = req.query as { campaignId?: string };

      const where = campaignId ? { campaignId } : {};
      const stores = await storeRepo.find({
        where,
        order: { createdAt: 'DESC' },
        take: 50,
      });

      res.json({
        stores: stores.map(s => ({
          id: s.id,
          campaignId: s.campaignId,
          name: s.name,
          storeType: s.storeType,
          parameters: s.parameters,
          itemCount: (s.data as any).inventory?.length ?? 0,
          totalValue: (s.data as any).totalValue ?? 0,
          createdAt: s.createdAt,
        })),
      });
    } catch (error) {
      logError('Get stores error', { error: (error as Error).message });
      res.status(500).json({ error: 'Failed to retrieve stores' });
    }
  }
);

// ─── GET /api/stores/:id ──────────────────────────────────────────────────────

router.get(
  '/:id',
  [param('id').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Invalid store ID' });
      return;
    }

    try {
      const storeRepo = AppDataSource.getRepository(Store);
      const store = await storeRepo.findOne({ where: { id: req.params.id } });

      if (!store) {
        res.status(404).json({ error: 'Store not found' });
        return;
      }

      const data = store.data as any;
      res.json({
        store: {
          id: store.id,
          campaignId: store.campaignId,
          ...data,
          parameters: store.parameters,
          createdAt: store.createdAt,
        },
      });
    } catch (error) {
      logError('Get store error', { error: (error as Error).message });
      res.status(500).json({ error: 'Failed to retrieve store' });
    }
  }
);

// ─── DELETE /api/stores/:id ───────────────────────────────────────────────────

router.delete(
  '/:id',
  [param('id').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Invalid store ID' });
      return;
    }

    try {
      const storeRepo = AppDataSource.getRepository(Store);
      const store = await storeRepo.findOne({ where: { id: req.params.id } });

      if (!store) {
        res.status(404).json({ error: 'Store not found' });
        return;
      }

      await storeRepo.remove(store);
      logInfo('Store deleted', { id: req.params.id });
      res.status(204).send();
    } catch (error) {
      logError('Delete store error', { error: (error as Error).message });
      res.status(500).json({ error: 'Failed to delete store' });
    }
  }
);

// ─── POST /api/stores/:id/foundry-export ──────────────────────────────────────

router.post(
  '/:id/foundry-export',
  [param('id').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Invalid store ID' });
      return;
    }

    try {
      const storeRepo = AppDataSource.getRepository(Store);
      const store = await storeRepo.findOne({ where: { id: req.params.id } });

      if (!store) {
        res.status(404).json({ error: 'Store not found' });
        return;
      }

      const data = store.data as any;
      const inventory: StoreItem[] = data.inventory ?? [];

      const rarityBadge: Record<string, string> = {
        common: '#9d9d9d', uncommon: '#1eff00', rare: '#0070dd',
        'very rare': '#a335ee', legendary: '#ff8000',
      };

      const inventoryRows = inventory
        .map(item => {
          const color = rarityBadge[item.rarity] ?? '#fff';
          return `<tr>
  <td>${item.name}${item.description ? ` <em style="color:#aaa;font-size:0.85em">— ${item.description}</em>` : ''}</td>
  <td style="color:${color}">${item.rarity}</td>
  <td style="text-align:center">${item.quantity}</td>
  <td style="text-align:right">${item.priceGp} gp</td>
</tr>`;
        })
        .join('\n');

      const totalGp = Math.round(data.totalValue ?? 0);

      const html = `<h2>${data.name}</h2>
<p><em>${data.storeType.charAt(0).toUpperCase() + data.storeType.slice(1)} · ${data.settlementSize.charAt(0).toUpperCase() + data.settlementSize.slice(1)} · ${data.biome.charAt(0).toUpperCase() + data.biome.slice(1)}</em></p>
<p>${data.description ?? ''}</p>

<h3>Shopkeeper</h3>
<p><strong>${data.shopkeeperName}</strong> (${data.shopkeeperRace}) — ${data.shopkeeperPersonality ?? ''}</p>

<h3>Inventory <small style="color:#aaa;font-weight:normal">Total value: ~${totalGp} gp</small></h3>
<table style="width:100%;border-collapse:collapse">
<thead><tr style="border-bottom:1px solid #555">
  <th style="text-align:left">Item</th>
  <th>Rarity</th>
  <th style="text-align:center">Qty</th>
  <th style="text-align:right">Price</th>
</tr></thead>
<tbody>
${inventoryRows}
</tbody>
</table>`;

      const result = await foundrySyncService.createJournalEntry({
        name: data.name,
        content: html,
      });

      if (!result.success) {
        res.status(500).json({ error: 'Failed to export to Foundry', details: result.error });
        return;
      }

      // Save journal ID back to the store record
      store.data = { ...store.data, foundryJournalId: result.data?._id } as Record<string, unknown>;
      await storeRepo.save(store);

      logInfo('Store exported to Foundry', { storeId: store.id, journalId: result.data?._id });
      res.json({ success: true, foundryJournalId: result.data?._id });
    } catch (error) {
      logError('Store Foundry export error', { error: (error as Error).message });
      res.status(500).json({ error: 'Failed to export store to Foundry' });
    }
  }
);

export default router;
