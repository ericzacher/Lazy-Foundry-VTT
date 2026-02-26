import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { foundrySyncService } from '../services/foundrySync';
import { logInfo, logError } from '../utils/logger';
import OpenAI from 'openai';

const router = Router();

// No authMiddleware — this route is intentionally public

// ─── Types ────────────────────────────────────────────────────────────────────

interface AbilityScores {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

interface CharacterData {
  name: string;
  race: string;
  subrace?: string;
  class: string;
  subclass?: string;
  background: string;
  abilityScores: AbilityScores;
  chosenSkills: string[];
  alignment: string;
  backstory: string;
  personalityTraits?: string[];
  ideals?: string;
  bonds?: string;
  flaws?: string;
  startingEquipment: string[];
  startingGold: number;
  scoreMethod: 'standard' | 'pointbuy';
  hpRoll?: number;
  foundryUserId?: string;
  level?: number;
  selectedCantrips?: string[];
  selectedSpells?: string[];
}

// ─── Spell Slot Tables ────────────────────────────────────────────────────────

type CasterProgression = 'full' | 'half' | 'pact' | 'none';

const CASTER_PROGRESSION: Record<string, CasterProgression> = {
  Bard: 'full', Cleric: 'full', Druid: 'full', Sorcerer: 'full', Wizard: 'full',
  Paladin: 'half', Ranger: 'half',
  Warlock: 'pact',
};

const SPELL_SLOTS_FULL: number[][] = [
  [],
  [2,0,0,0,0,0,0,0,0], [3,0,0,0,0,0,0,0,0], [4,2,0,0,0,0,0,0,0], [4,3,0,0,0,0,0,0,0],
  [4,3,2,0,0,0,0,0,0], [4,3,3,0,0,0,0,0,0], [4,3,3,1,0,0,0,0,0], [4,3,3,2,0,0,0,0,0],
  [4,3,3,3,1,0,0,0,0], [4,3,3,3,2,0,0,0,0], [4,3,3,3,2,1,0,0,0], [4,3,3,3,2,1,0,0,0],
  [4,3,3,3,2,1,1,0,0], [4,3,3,3,2,1,1,0,0], [4,3,3,3,2,1,1,1,0], [4,3,3,3,2,1,1,1,0],
  [4,3,3,3,2,1,1,1,1], [4,3,3,3,3,1,1,1,1], [4,3,3,3,3,2,1,1,1], [4,3,3,3,3,2,2,1,1],
];

const SPELL_SLOTS_HALF: number[][] = [
  [],
  [0,0,0,0,0,0,0,0,0], [2,0,0,0,0,0,0,0,0], [3,0,0,0,0,0,0,0,0], [3,0,0,0,0,0,0,0,0],
  [4,2,0,0,0,0,0,0,0], [4,2,0,0,0,0,0,0,0], [4,3,0,0,0,0,0,0,0], [4,3,0,0,0,0,0,0,0],
  [4,3,2,0,0,0,0,0,0], [4,3,2,0,0,0,0,0,0], [4,3,3,0,0,0,0,0,0], [4,3,3,0,0,0,0,0,0],
  [4,3,3,1,0,0,0,0,0], [4,3,3,1,0,0,0,0,0], [4,3,3,2,0,0,0,0,0], [4,3,3,2,0,0,0,0,0],
  [4,3,3,3,1,0,0,0,0], [4,3,3,3,1,0,0,0,0], [4,3,3,3,2,0,0,0,0], [4,3,3,3,2,0,0,0,0],
];

// [slotCount, slotLevel] indexed by class level
const PACT_SLOTS: Array<[number, number]> = [
  [0,0], [1,1],[2,1],[2,2],[2,2],[2,3],[2,3],[2,4],[2,4],[2,5],[2,5],
  [3,5],[3,5],[3,5],[3,5],[3,5],[3,5],[4,5],[4,5],[4,5],[4,5],
];

function buildSpellSlots(className: string, level: number): Record<string, { value: number; max: number; override: null }> {
  const prog = CASTER_PROGRESSION[className] ?? 'none';
  if (prog === 'none') return {};
  const idx = Math.min(level, 20);
  if (prog === 'pact') {
    const [count, pactLevel] = PACT_SLOTS[idx] ?? [0, 0];
    if (count === 0) return {};
    return { [`spell${pactLevel}`]: { value: count, max: count, override: null } };
  }
  const table = prog === 'half' ? SPELL_SLOTS_HALF : SPELL_SLOTS_FULL;
  const slots = table[idx] ?? [];
  const result: Record<string, { value: number; max: number; override: null }> = {};
  slots.forEach((count, i) => {
    if (count > 0) result[`spell${i + 1}`] = { value: count, max: count, override: null };
  });
  return result;
}

// Class hit die map
const HIT_DICE: Record<string, number> = {
  Barbarian: 12, Bard: 8, Cleric: 8, Druid: 8, Fighter: 10,
  Monk: 8, Paladin: 10, Ranger: 10, Rogue: 8, Sorcerer: 6,
  Warlock: 8, Wizard: 6,
};

// Starting AC bonuses from armor (check equipment list for armor names)
const ARMOR_AC: Record<string, number> = {
  'Chain Mail': 16,
  'Scale Mail': 14,
  'Leather Armor': 11,
  'Hide Armor': 12,
  'Ring Mail': 14,
};

function calcMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

// Parse "Handaxe (2)" → { name: "Handaxe", quantity: 2 }
function parseItemName(raw: string): { name: string; quantity: number } {
  const match = raw.match(/^(.+?)\s*\((\d+)\)\s*$/);
  if (match) return { name: match[1].trim(), quantity: parseInt(match[2], 10) };
  return { name: raw.trim(), quantity: 1 };
}

function calcAC(dexMod: number, equipment: string[]): number {
  for (const item of equipment) {
    for (const [armor, ac] of Object.entries(ARMOR_AC)) {
      if (item.toLowerCase().includes(armor.toLowerCase())) {
        // Leather armor uses dex modifier
        if (armor === 'Leather Armor') return ac + dexMod;
        // Heavy armor (chain mail, ring mail) — no dex
        if (armor === 'Chain Mail' || armor === 'Ring Mail') return ac;
        // Medium armor — max +2 dex
        return ac + Math.min(dexMod, 2);
      }
    }
  }
  // Unarmored: 10 + DEX
  return 10 + dexMod;
}

const ALL_SKILL_KEYS = [
  'acr', 'ani', 'arc', 'ath', 'dec', 'his', 'ins', 'itm',
  'inv', 'med', 'nat', 'prc', 'prf', 'per', 'rel', 'slt', 'ste', 'sur',
];

// ─── GET /foundry-players ────────────────────────────────────────────────────

router.get('/foundry-players', (_req: Request, res: Response) => {
  const players = foundrySyncService.getPlayerUsers();
  res.json({ success: true, players });
});

// ─── POST /sync ───────────────────────────────────────────────────────────────

router.post(
  '/sync',
  [
    body('name').isString().trim().notEmpty().withMessage('Character name is required'),
    body('race').isString().notEmpty(),
    body('class').isString().notEmpty(),
    body('background').isString().notEmpty(),
    body('abilityScores').isObject(),
    body('chosenSkills').isArray(),
    body('alignment').isString().notEmpty(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Validation failed', details: errors.array().map(e => ({ field: (e as any).path, message: e.msg })) });
      return;
    }

    try {
      const data: CharacterData = req.body;
      const { abilityScores, chosenSkills, startingEquipment = [] } = data;

      const strMod = calcMod(abilityScores.str);
      const dexMod = calcMod(abilityScores.dex);
      const conMod = calcMod(abilityScores.con);

      const hitDie = HIT_DICE[data.class] ?? 8;
      const level = data.level ?? 1;
      const avgPerLevel = Math.max(1, Math.ceil(hitDie / 2) + 1 + conMod);
      const hp = data.hpRoll !== undefined
        ? data.hpRoll
        : Math.max(1, (hitDie + conMod) + (level - 1) * avgPerLevel);
      const ac = calcAC(dexMod, startingEquipment);

      // Build skills object: 1 = proficient, 0 = not
      const skills: Record<string, { value: number }> = {};
      for (const key of ALL_SKILL_KEYS) {
        skills[key] = { value: chosenSkills.includes(key) ? 1 : 0 };
      }

      // Currency
      const gp = Math.max(0, Math.floor(data.startingGold ?? 0));

      // Build ownership: give the chosen player full ownership
      const ownership: Record<string, number> = { default: 0 };
      if (data.foundryUserId) {
        ownership[data.foundryUserId] = 3; // 3 = Owner
      }

      // ─── Resolve embedded items from Foundry compendiums ─────────────────
      // class → dnd5e.classes, subclass → dnd5e.subclasses, equipment → dnd5e.items
      // Falls back to minimal stubs so the actor is always created successfully.
      const resolvedItems: unknown[] = [];

      // 1. Class item
      const classCompItem = await foundrySyncService.findCompendiumItem('dnd5e.classes', data.class);
      if (classCompItem) {
        const entry = { ...classCompItem };
        delete (entry as Record<string, unknown>)._id;
        resolvedItems.push({
          ...entry,
          system: { ...(entry.system as Record<string, unknown>), levels: level },
        });
      } else {
        resolvedItems.push({
          name: data.class,
          type: 'class',
          system: {
            description: { value: '' },
            identifier: data.class.toLowerCase(),
            levels: level,
            hitDice: `d${HIT_DICE[data.class] ?? 8}`,
            hitDiceUsed: 0,
          },
        });
      }

      // 2. Subclass item (level-1 subclasses: Cleric, Sorcerer, Warlock)
      if (data.subclass) {
        const subCompItem = await foundrySyncService.findCompendiumItem('dnd5e.subclasses', data.subclass);
        if (subCompItem) {
          const entry = { ...subCompItem };
          delete (entry as Record<string, unknown>)._id;
          resolvedItems.push(entry);
        }
      }

      // 3. Starting equipment
      for (const equipName of startingEquipment) {
        const { name: lookupName, quantity } = parseItemName(equipName);
        const compItem = await foundrySyncService.findCompendiumItem('dnd5e.items', lookupName);
        if (compItem) {
          const entry = { ...compItem };
          delete (entry as Record<string, unknown>)._id;
          resolvedItems.push({
            ...entry,
            system: { ...(entry.system as Record<string, unknown>), quantity },
          });
        } else {
          // Fallback: loot stub — still appears in Equipment tab
          resolvedItems.push({
            name: equipName,
            type: 'loot',
            system: {
              description: { value: '' },
              quantity,
              weight: { value: 0, units: 'lb' },
            },
          });
        }
      }

      // 4. Selected spells (cantrips + leveled spells)
      const allSpells = [...(data.selectedCantrips ?? []), ...(data.selectedSpells ?? [])];
      for (const spellName of allSpells) {
        const spellItem = await foundrySyncService.findCompendiumItem('dnd5e.spells', spellName);
        if (spellItem) {
          const entry = { ...spellItem };
          delete (entry as Record<string, unknown>)._id;
          resolvedItems.push(entry);
        } else {
          resolvedItems.push({
            name: spellName,
            type: 'spell',
            system: { description: { value: '' }, level: 0, school: 'evo' },
          });
        }
      }

      logInfo('Resolved embedded items', { count: resolvedItems.length, class: data.class, spells: allSpells.length });

      const actorData = {
        name: data.name,
        type: 'character' as const,
        ownership,
        items: resolvedItems,
        system: {
          abilities: {
            str: { value: abilityScores.str },
            dex: { value: abilityScores.dex },
            con: { value: abilityScores.con },
            int: { value: abilityScores.int },
            wis: { value: abilityScores.wis },
            cha: { value: abilityScores.cha },
          },
          attributes: {
            hp: { value: Math.max(1, hp), max: Math.max(1, hp) },
            ac: { flat: ac },
            speed: { walk: 30 },
          },
          details: {
            race: data.race + (data.subrace ? ` (${data.subrace})` : ''),
            background: data.background,
            alignment: data.alignment,
            level,
            biography: {
              value: buildBiography(data),
            },
          },
          skills,
          currency: { gp, sp: 0, cp: 0, ep: 0, pp: 0 },
          spells: buildSpellSlots(data.class, level),
        },
      };

      logInfo('Syncing PC character to Foundry', { name: data.name, class: data.class, race: data.race, items: resolvedItems.length });

      const result = await foundrySyncService.createActor(actorData);

      if (!result.success) {
        res.status(500).json({ error: 'Failed to create actor in Foundry', details: result.error });
        return;
      }

      res.json({
        success: true,
        foundryActorId: result.data?._id,
        name: data.name,
      });
    } catch (error) {
      logError('Character sync error', { error: (error as Error).message });
      res.status(500).json({ error: 'Failed to sync character to Foundry' });
    }
  }
);

function buildBiography(data: CharacterData): string {
  const parts: string[] = [
    `<h2>${data.name}</h2>`,
    `<p><strong>Race:</strong> ${data.race}${data.subrace ? ` (${data.subrace})` : ''}</p>`,
    `<p><strong>Class:</strong> ${data.class}${data.subclass ? ` — ${data.subclass}` : ''} (Level ${data.level ?? 1})</p>`,
    `<p><strong>Background:</strong> ${data.background}</p>`,
    `<p><strong>Alignment:</strong> ${data.alignment}</p>`,
  ];
  if (data.backstory) parts.push(`<h3>Backstory</h3><p>${data.backstory}</p>`);
  if (data.personalityTraits?.length) {
    parts.push(`<h3>Personality Traits</h3><ul>${data.personalityTraits.map(t => `<li>${t}</li>`).join('')}</ul>`);
  }
  if (data.ideals) parts.push(`<h3>Ideals</h3><p>${data.ideals}</p>`);
  if (data.bonds) parts.push(`<h3>Bonds</h3><p>${data.bonds}</p>`);
  if (data.flaws) parts.push(`<h3>Flaws</h3><p>${data.flaws}</p>`);
  if (data.startingEquipment?.length) {
    parts.push(`<h3>Starting Equipment</h3><ul>${data.startingEquipment.map(e => `<li>${e}</li>`).join('')}</ul>`);
  }
  return parts.join('\n');
}

// ─── POST /generate-ai ────────────────────────────────────────────────────────

router.post(
  '/generate-ai',
  [
    body('concept').isString().trim().notEmpty().withMessage('Character concept is required'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Validation failed', details: errors.array().map(e => ({ field: (e as any).path, message: e.msg })) });
      return;
    }

    const { concept } = req.body as { concept: string };

    // Build AI client (same pattern as ai.ts)
    const openai = new OpenAI({
      apiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY,
      baseURL: process.env.GROQ_API_KEY
        ? 'https://api.groq.com/openai/v1'
        : 'https://api.openai.com/v1',
    });
    const model = process.env.GROQ_API_KEY ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini';

    const systemPrompt = `You are a D&D 5e character creation assistant. Given a player's character concept, generate a complete D&D 5e level-1 character following PHB rules.

You MUST respond with ONLY valid JSON (no markdown, no extra text) matching this exact structure:
{
  "name": "string — a fitting fantasy name",
  "race": "one of: Human, Elf, Dwarf, Halfling, Dragonborn, Gnome, Half-Elf, Half-Orc, Tiefling",
  "subrace": "optional: e.g. High Elf, Wood Elf, Drow, Hill Dwarf, Mountain Dwarf, Lightfoot, Stout, Forest Gnome, Rock Gnome — omit if race has no subraces",
  "class": "one of: Barbarian, Bard, Cleric, Druid, Fighter, Monk, Paladin, Ranger, Rogue, Sorcerer, Warlock, Wizard",
  "background": "one of: Acolyte, Charlatan, Criminal, Entertainer, Folk Hero, Guild Artisan, Hermit, Noble, Outlander, Sage, Sailor, Soldier, Urchin",
  "abilityScores": {
    "str": number (8-15 before racial),
    "dex": number (8-15 before racial),
    "con": number (8-15 before racial),
    "int": number (8-15 before racial),
    "wis": number (8-15 before racial),
    "cha": number (8-15 before racial)
  },
  "chosenSkills": ["array of 2-4 Foundry skill keys appropriate to the class and character, from: acr,ani,arc,ath,dec,his,ins,itm,inv,med,nat,prc,prf,per,rel,slt,ste,sur"],
  "alignment": "one of: Lawful Good, Neutral Good, Chaotic Good, Lawful Neutral, True Neutral, Chaotic Neutral, Lawful Evil, Neutral Evil, Chaotic Evil",
  "backstory": "2-3 paragraph backstory that fits the concept",
  "startingEquipment": ["list of starting equipment items appropriate to the class"],
  "startingGold": number (5-25),
  "scoreMethod": "standard"
}

Rules:
- Ability scores should use Standard Array values [15,14,13,12,10,8] distributed appropriately for the class
- Choose race/subrace, class, and background that best match the concept
- Background skills must be included in chosenSkills plus class skill choices
- Equipment should match the class
- Backstory should be 2-3 engaging paragraphs`;

    try {
      logInfo('Generating AI character', { concept: concept.slice(0, 100) });

      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Create a D&D 5e character for this concept: ${concept}` },
        ],
        temperature: 0.8,
        max_tokens: 1500,
      });

      const raw = completion.choices[0]?.message?.content?.trim() ?? '';

      // Strip markdown code blocks if present
      const jsonStr = raw.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();

      let character: CharacterData;
      try {
        character = JSON.parse(jsonStr);
      } catch {
        logError('AI character generation: invalid JSON', { raw: raw.slice(0, 200) });
        res.status(500).json({ error: 'AI returned invalid character data' });
        return;
      }

      res.json({ success: true, character });
    } catch (error) {
      logError('AI character generation error', { error: (error as Error).message });
      res.status(500).json({ error: 'Failed to generate character with AI' });
    }
  }
);

// ─── POST /generate-lore ──────────────────────────────────────────────────────

router.post(
  '/generate-lore',
  [
    body('race').isString().notEmpty(),
    body('class').isString().notEmpty(),
    body('background').isString().notEmpty(),
    body('alignment').isString().notEmpty(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Validation failed', details: errors.array().map(e => ({ field: (e as any).path, message: e.msg })) });
      return;
    }

    const { name, race, subrace, class: cls, subclass, background, alignment } = req.body as {
      name?: string; race: string; subrace?: string; class: string; subclass?: string;
      background: string; alignment: string;
    };

    const openai = new OpenAI({
      apiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY,
      baseURL: process.env.GROQ_API_KEY ? 'https://api.groq.com/openai/v1' : 'https://api.openai.com/v1',
    });
    const model = process.env.GROQ_API_KEY ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini';

    const characterDesc = [
      name ? `Name: ${name}` : null,
      `Race: ${race}${subrace ? ` (${subrace})` : ''}`,
      `Class: ${cls}${subclass ? ` — ${subclass}` : ''}`,
      `Background: ${background}`,
      `Alignment: ${alignment}`,
    ].filter(Boolean).join(', ');

    const systemPrompt = `You are a D&D 5e character lore writer. Generate rich character personality and backstory details.
Respond ONLY with valid JSON (no markdown):
{
  "backstory": "2-3 paragraph character backstory",
  "personalityTraits": ["trait 1", "trait 2"],
  "ideals": "one ideal that drives the character",
  "bonds": "one bond connecting the character to people, places, or ideals",
  "flaws": "one flaw or vice that holds the character back"
}
Make the content thematically appropriate for the race, class, background, and alignment.`;

    try {
      logInfo('Generating character lore', { race, class: cls, background });

      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate lore for: ${characterDesc}` },
        ],
        temperature: 0.85,
        max_tokens: 800,
      });

      const raw = completion.choices[0]?.message?.content?.trim() ?? '';
      const jsonStr = raw.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();

      let lore: { backstory: string; personalityTraits: string[]; ideals: string; bonds: string; flaws: string };
      try {
        lore = JSON.parse(jsonStr);
      } catch {
        logError('Lore generation: invalid JSON', { raw: raw.slice(0, 200) });
        res.status(500).json({ error: 'AI returned invalid lore data' });
        return;
      }

      res.json({ success: true, ...lore });
    } catch (error) {
      logError('Lore generation error', { error: (error as Error).message });
      res.status(500).json({ error: 'Failed to generate character lore' });
    }
  }
);

export default router;
