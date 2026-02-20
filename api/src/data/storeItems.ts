// ─── Static D&D 5e item tables for store generation ──────────────────────────
// PHB prices, rarity, categories, and contextual weights.

export type Rarity = 'common' | 'uncommon' | 'rare' | 'very rare' | 'legendary';
export type StoreType =
  | 'general' | 'blacksmith' | 'armorer' | 'alchemist'
  | 'magic' | 'herbalist' | 'tailor' | 'jeweler' | 'fence' | 'shipwright';
export type SettlementSize = 'hamlet' | 'village' | 'town' | 'city' | 'metropolis';
export type ItemCategory =
  | 'weapon' | 'armor' | 'potion' | 'gear' | 'tool' | 'magic' | 'trade' | 'clothing';

export interface ItemTemplate {
  name: string;
  category: ItemCategory;
  storeTypes: StoreType[];
  rarity: Rarity;
  basePrice: number;        // gp
  isMagic: boolean;
  racialBias?: string[];    // races that preferentially stock this item
  biomes?: string[];        // biomes where item is more common
  maxQty?: number;          // max stock quantity (default 1)
}

export const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'very rare', 'legendary'];

// Max rarity available by settlement size
export const SETTLEMENT_MAX_RARITY: Record<SettlementSize, Rarity> = {
  hamlet:     'common',
  village:    'uncommon',
  town:       'rare',
  city:       'very rare',
  metropolis: 'legendary',
};

// Probability of reaching max rarity (lower = rarer items appear less often)
export const RARITY_CHANCE: Record<SettlementSize, Record<Rarity, number>> = {
  hamlet:     { common: 1.0, uncommon: 0,   rare: 0,    'very rare': 0,    legendary: 0 },
  village:    { common: 1.0, uncommon: 0.15, rare: 0,    'very rare': 0,    legendary: 0 },
  town:       { common: 1.0, uncommon: 0.6, rare: 0.10,  'very rare': 0,    legendary: 0 },
  city:       { common: 1.0, uncommon: 0.9, rare: 0.40,  'very rare': 0.08, legendary: 0 },
  metropolis: { common: 1.0, uncommon: 1.0, rare: 0.70,  'very rare': 0.25, legendary: 0.05 },
};

export const STOCK_SIZE_RANGE: Record<string, [number, number]> = {
  small:  [4, 7],
  medium: [9, 14],
  large:  [18, 28],
};

// ─── Item Tables ──────────────────────────────────────────────────────────────

export const ITEMS: ItemTemplate[] = [
  // ── Simple Melee Weapons ────────────────────────────────────────────────────
  { name: 'Club',            category: 'weapon', storeTypes: ['general','blacksmith','fence'], rarity: 'common',   basePrice: 0.1,  isMagic: false, maxQty: 3 },
  { name: 'Dagger',          category: 'weapon', storeTypes: ['general','blacksmith','fence','tailor'], rarity: 'common',   basePrice: 2,    isMagic: false, maxQty: 4, racialBias: ['halfling','tiefling'] },
  { name: 'Greatclub',       category: 'weapon', storeTypes: ['blacksmith','general','fence'], rarity: 'common',   basePrice: 0.2,  isMagic: false, maxQty: 2 },
  { name: 'Handaxe',         category: 'weapon', storeTypes: ['blacksmith','general','fence'], rarity: 'common',   basePrice: 5,    isMagic: false, maxQty: 3, racialBias: ['dwarf','half-orc'] },
  { name: 'Javelin',         category: 'weapon', storeTypes: ['blacksmith','general','fence'], rarity: 'common',   basePrice: 0.5,  isMagic: false, maxQty: 4 },
  { name: 'Light Hammer',    category: 'weapon', storeTypes: ['blacksmith','general'], rarity: 'common',   basePrice: 2,    isMagic: false, maxQty: 2, racialBias: ['dwarf'] },
  { name: 'Mace',            category: 'weapon', storeTypes: ['blacksmith','general'], rarity: 'common',   basePrice: 5,    isMagic: false, maxQty: 2 },
  { name: 'Quarterstaff',    category: 'weapon', storeTypes: ['blacksmith','general','fence'], rarity: 'common',   basePrice: 0.2,  isMagic: false, maxQty: 3 },
  { name: 'Sickle',          category: 'weapon', storeTypes: ['general','blacksmith'], rarity: 'common',   basePrice: 1,    isMagic: false, maxQty: 2 },
  { name: 'Spear',           category: 'weapon', storeTypes: ['blacksmith','general','fence'], rarity: 'common',   basePrice: 1,    isMagic: false, maxQty: 3 },

  // ── Simple Ranged Weapons ────────────────────────────────────────────────────
  { name: 'Light Crossbow',  category: 'weapon', storeTypes: ['blacksmith','general','fence'], rarity: 'common',   basePrice: 25,   isMagic: false, maxQty: 2, racialBias: ['gnome'] },
  { name: 'Dart',            category: 'weapon', storeTypes: ['general','fence'], rarity: 'common',   basePrice: 0.05, isMagic: false, maxQty: 10 },
  { name: 'Shortbow',        category: 'weapon', storeTypes: ['blacksmith','general','fence'], rarity: 'common',   basePrice: 25,   isMagic: false, maxQty: 2, racialBias: ['halfling','elf'] },
  { name: 'Sling',           category: 'weapon', storeTypes: ['general','fence'], rarity: 'common',   basePrice: 0.1,  isMagic: false, maxQty: 3, racialBias: ['halfling'] },

  // ── Martial Melee Weapons ───────────────────────────────────────────────────
  { name: 'Battleaxe',       category: 'weapon', storeTypes: ['blacksmith','fence'], rarity: 'common',   basePrice: 10,   isMagic: false, maxQty: 2, racialBias: ['dwarf','half-orc'] },
  { name: 'Flail',           category: 'weapon', storeTypes: ['blacksmith','fence'], rarity: 'common',   basePrice: 10,   isMagic: false, maxQty: 2 },
  { name: 'Glaive',          category: 'weapon', storeTypes: ['blacksmith','fence'], rarity: 'common',   basePrice: 20,   isMagic: false, maxQty: 1 },
  { name: 'Greataxe',        category: 'weapon', storeTypes: ['blacksmith','fence'], rarity: 'common',   basePrice: 30,   isMagic: false, maxQty: 1, racialBias: ['dwarf','half-orc','dragonborn'] },
  { name: 'Greatsword',      category: 'weapon', storeTypes: ['blacksmith','fence'], rarity: 'common',   basePrice: 50,   isMagic: false, maxQty: 1 },
  { name: 'Halberd',         category: 'weapon', storeTypes: ['blacksmith','fence'], rarity: 'common',   basePrice: 20,   isMagic: false, maxQty: 1 },
  { name: 'Longsword',       category: 'weapon', storeTypes: ['blacksmith','fence'], rarity: 'common',   basePrice: 15,   isMagic: false, maxQty: 2 },
  { name: 'Maul',            category: 'weapon', storeTypes: ['blacksmith','fence'], rarity: 'common',   basePrice: 10,   isMagic: false, maxQty: 1, racialBias: ['dwarf','half-orc'] },
  { name: 'Morningstar',     category: 'weapon', storeTypes: ['blacksmith','fence'], rarity: 'common',   basePrice: 15,   isMagic: false, maxQty: 1 },
  { name: 'Rapier',          category: 'weapon', storeTypes: ['blacksmith','fence'], rarity: 'common',   basePrice: 25,   isMagic: false, maxQty: 2, racialBias: ['elf','tiefling','half-elf'] },
  { name: 'Scimitar',        category: 'weapon', storeTypes: ['blacksmith','fence'], rarity: 'common',   basePrice: 25,   isMagic: false, maxQty: 2 },
  { name: 'Shortsword',      category: 'weapon', storeTypes: ['blacksmith','general','fence'], rarity: 'common',   basePrice: 10,   isMagic: false, maxQty: 3, racialBias: ['halfling','elf'] },
  { name: 'Trident',         category: 'weapon', storeTypes: ['blacksmith','shipwright','fence'], rarity: 'common',   basePrice: 5,    isMagic: false, maxQty: 2, biomes: ['coastal'] },
  { name: 'War Pick',        category: 'weapon', storeTypes: ['blacksmith','fence'], rarity: 'common',   basePrice: 5,    isMagic: false, maxQty: 2, racialBias: ['dwarf'] },
  { name: 'Warhammer',       category: 'weapon', storeTypes: ['blacksmith','fence'], rarity: 'common',   basePrice: 15,   isMagic: false, maxQty: 2, racialBias: ['dwarf'] },
  { name: 'Whip',            category: 'weapon', storeTypes: ['blacksmith','general','fence'], rarity: 'common',   basePrice: 2,    isMagic: false, maxQty: 2 },
  { name: 'Net',             category: 'weapon', storeTypes: ['general','shipwright','fence'], rarity: 'common',   basePrice: 1,    isMagic: false, maxQty: 3, biomes: ['coastal'] },

  // ── Martial Ranged Weapons ──────────────────────────────────────────────────
  { name: 'Hand Crossbow',   category: 'weapon', storeTypes: ['blacksmith','fence'], rarity: 'common',   basePrice: 75,   isMagic: false, maxQty: 1, racialBias: ['gnome','tiefling'] },
  { name: 'Heavy Crossbow',  category: 'weapon', storeTypes: ['blacksmith','fence'], rarity: 'common',   basePrice: 50,   isMagic: false, maxQty: 1 },
  { name: 'Longbow',         category: 'weapon', storeTypes: ['blacksmith','fence'], rarity: 'common',   basePrice: 50,   isMagic: false, maxQty: 2, racialBias: ['elf'] },

  // ── Light Armor ─────────────────────────────────────────────────────────────
  { name: 'Padded Armor',    category: 'armor',  storeTypes: ['armorer','blacksmith','general','fence'], rarity: 'common',   basePrice: 5,    isMagic: false, maxQty: 2 },
  { name: 'Leather Armor',   category: 'armor',  storeTypes: ['armorer','blacksmith','general','fence'], rarity: 'common',   basePrice: 10,   isMagic: false, maxQty: 2, racialBias: ['halfling','elf','tiefling'] },
  { name: 'Studded Leather Armor', category: 'armor', storeTypes: ['armorer','blacksmith','fence'], rarity: 'common', basePrice: 45, isMagic: false, maxQty: 2, racialBias: ['rogue','elf'] },

  // ── Medium Armor ────────────────────────────────────────────────────────────
  { name: 'Hide Armor',      category: 'armor',  storeTypes: ['armorer','blacksmith','general','fence'], rarity: 'common',   basePrice: 10,   isMagic: false, maxQty: 2, biomes: ['forest','arctic'] },
  { name: 'Chain Shirt',     category: 'armor',  storeTypes: ['armorer','blacksmith','fence'], rarity: 'common',   basePrice: 50,   isMagic: false, maxQty: 1 },
  { name: 'Scale Mail',      category: 'armor',  storeTypes: ['armorer','blacksmith','fence'], rarity: 'common',   basePrice: 50,   isMagic: false, maxQty: 1 },
  { name: 'Breastplate',     category: 'armor',  storeTypes: ['armorer','blacksmith','fence'], rarity: 'common',   basePrice: 400,  isMagic: false, maxQty: 1 },
  { name: 'Half Plate',      category: 'armor',  storeTypes: ['armorer','blacksmith','fence'], rarity: 'common',   basePrice: 750,  isMagic: false, maxQty: 1 },

  // ── Heavy Armor ─────────────────────────────────────────────────────────────
  { name: 'Ring Mail',       category: 'armor',  storeTypes: ['armorer','blacksmith','fence'], rarity: 'common',   basePrice: 30,   isMagic: false, maxQty: 1 },
  { name: 'Chain Mail',      category: 'armor',  storeTypes: ['armorer','blacksmith','fence'], rarity: 'common',   basePrice: 75,   isMagic: false, maxQty: 1, racialBias: ['dwarf'] },
  { name: 'Splint Armor',    category: 'armor',  storeTypes: ['armorer','blacksmith','fence'], rarity: 'common',   basePrice: 200,  isMagic: false, maxQty: 1 },
  { name: 'Plate Armor',     category: 'armor',  storeTypes: ['armorer','blacksmith','fence'], rarity: 'uncommon', basePrice: 1500, isMagic: false, maxQty: 1, racialBias: ['dwarf'] },
  { name: 'Shield',          category: 'armor',  storeTypes: ['armorer','blacksmith','general','fence'], rarity: 'common', basePrice: 10, isMagic: false, maxQty: 3, racialBias: ['dwarf'] },

  // ── Potions & Alchemist ─────────────────────────────────────────────────────
  { name: 'Potion of Healing',          category: 'potion', storeTypes: ['alchemist','herbalist','magic','general','fence'], rarity: 'common',    basePrice: 50,   isMagic: true,  maxQty: 5 },
  { name: 'Potion of Greater Healing',  category: 'potion', storeTypes: ['alchemist','herbalist','magic','fence'],           rarity: 'uncommon',  basePrice: 150,  isMagic: true,  maxQty: 3 },
  { name: 'Potion of Superior Healing', category: 'potion', storeTypes: ['alchemist','magic'],                               rarity: 'rare',      basePrice: 500,  isMagic: true,  maxQty: 2 },
  { name: 'Potion of Supreme Healing',  category: 'potion', storeTypes: ['magic'],                                           rarity: 'very rare', basePrice: 5000, isMagic: true,  maxQty: 1 },
  { name: 'Antitoxin',       category: 'potion', storeTypes: ['alchemist','herbalist','general','fence'], rarity: 'common',   basePrice: 50,   isMagic: false, maxQty: 3 },
  { name: "Alchemist's Fire", category: 'potion', storeTypes: ['alchemist','magic','fence'], rarity: 'common', basePrice: 50, isMagic: false, maxQty: 3 },
  { name: 'Acid',            category: 'potion', storeTypes: ['alchemist','magic','fence'], rarity: 'common',   basePrice: 25,   isMagic: false, maxQty: 3 },
  { name: 'Poison (Basic)',  category: 'potion', storeTypes: ['alchemist','fence'],         rarity: 'common',   basePrice: 100,  isMagic: false, maxQty: 2 },
  { name: 'Potion of Animal Friendship', category: 'potion', storeTypes: ['herbalist','magic'], rarity: 'uncommon', basePrice: 200, isMagic: true, maxQty: 2, biomes: ['forest'] },
  { name: 'Potion of Climbing',          category: 'potion', storeTypes: ['alchemist','magic','general'], rarity: 'uncommon', basePrice: 180, isMagic: true, maxQty: 2 },
  { name: 'Potion of Invisibility',      category: 'potion', storeTypes: ['magic'],         rarity: 'very rare', basePrice: 6000, isMagic: true, maxQty: 1 },
  { name: 'Potion of Fly',               category: 'potion', storeTypes: ['magic'],         rarity: 'very rare', basePrice: 5000, isMagic: true, maxQty: 1 },
  { name: 'Potion of Speed',             category: 'potion', storeTypes: ['magic'],         rarity: 'very rare', basePrice: 4000, isMagic: true, maxQty: 1 },
  { name: 'Potion of Giant Strength',    category: 'potion', storeTypes: ['magic'],         rarity: 'uncommon',  basePrice: 500,  isMagic: true, maxQty: 1 },
  { name: 'Potion of Water Breathing',   category: 'potion', storeTypes: ['alchemist','magic','shipwright'], rarity: 'uncommon', basePrice: 300, isMagic: true, maxQty: 2, biomes: ['coastal'] },
  { name: 'Potion of Resistance',        category: 'potion', storeTypes: ['magic'],         rarity: 'uncommon',  basePrice: 300,  isMagic: true, maxQty: 2 },

  // ── Adventuring Gear ────────────────────────────────────────────────────────
  { name: 'Backpack',        category: 'gear', storeTypes: ['general','fence'], rarity: 'common', basePrice: 2,   isMagic: false, maxQty: 3 },
  { name: 'Bedroll',         category: 'gear', storeTypes: ['general','fence'], rarity: 'common', basePrice: 1,   isMagic: false, maxQty: 3 },
  { name: 'Blanket',         category: 'gear', storeTypes: ['general','fence'], rarity: 'common', basePrice: 0.5, isMagic: false, maxQty: 4 },
  { name: 'Candle',          category: 'gear', storeTypes: ['general','fence'], rarity: 'common', basePrice: 0.01, isMagic: false, maxQty: 10 },
  { name: 'Climber\'s Kit',  category: 'gear', storeTypes: ['general','fence'], rarity: 'common', basePrice: 25,  isMagic: false, maxQty: 2, biomes: ['mountain'] },
  { name: 'Crowbar',         category: 'gear', storeTypes: ['general','blacksmith','fence'], rarity: 'common', basePrice: 2, isMagic: false, maxQty: 2 },
  { name: 'Flask',           category: 'gear', storeTypes: ['general','alchemist','fence'], rarity: 'common', basePrice: 0.02, isMagic: false, maxQty: 5 },
  { name: 'Flint and Steel', category: 'gear', storeTypes: ['general','fence'], rarity: 'common', basePrice: 0.5, isMagic: false, maxQty: 4 },
  { name: 'Grappling Hook',  category: 'gear', storeTypes: ['general','blacksmith','shipwright','fence'], rarity: 'common', basePrice: 2, isMagic: false, maxQty: 2 },
  { name: 'Hammer',          category: 'gear', storeTypes: ['general','blacksmith','fence'], rarity: 'common', basePrice: 1, isMagic: false, maxQty: 3 },
  { name: 'Healer\'s Kit',   category: 'gear', storeTypes: ['herbalist','general','alchemist','fence'], rarity: 'common', basePrice: 5, isMagic: false, maxQty: 3 },
  { name: 'Holy Water',      category: 'gear', storeTypes: ['herbalist','general','magic'], rarity: 'common', basePrice: 25, isMagic: false, maxQty: 3 },
  { name: 'Hunting Trap',    category: 'gear', storeTypes: ['general','blacksmith','fence'], rarity: 'common', basePrice: 5, isMagic: false, maxQty: 2, biomes: ['forest'] },
  { name: 'Lantern, Bullseye', category: 'gear', storeTypes: ['general','fence'], rarity: 'common', basePrice: 10, isMagic: false, maxQty: 2 },
  { name: 'Lantern, Hooded', category: 'gear', storeTypes: ['general','fence'], rarity: 'common', basePrice: 5, isMagic: false, maxQty: 2 },
  { name: 'Manacles',        category: 'gear', storeTypes: ['general','blacksmith','fence'], rarity: 'common', basePrice: 2, isMagic: false, maxQty: 2 },
  { name: 'Mirror, Steel',   category: 'gear', storeTypes: ['general','fence'], rarity: 'common', basePrice: 5, isMagic: false, maxQty: 1 },
  { name: 'Oil (flask)',     category: 'gear', storeTypes: ['general','alchemist','fence'], rarity: 'common', basePrice: 0.1, isMagic: false, maxQty: 5 },
  { name: 'Rations (1 day)', category: 'gear', storeTypes: ['general','fence'], rarity: 'common', basePrice: 0.5, isMagic: false, maxQty: 10 },
  { name: 'Rope, Hemp (50 ft)', category: 'gear', storeTypes: ['general','shipwright','fence'], rarity: 'common', basePrice: 1, isMagic: false, maxQty: 4 },
  { name: 'Rope, Silk (50 ft)', category: 'gear', storeTypes: ['general','fence'], rarity: 'common', basePrice: 10, isMagic: false, maxQty: 2 },
  { name: 'Shovel',          category: 'gear', storeTypes: ['general','fence'], rarity: 'common', basePrice: 2, isMagic: false, maxQty: 2 },
  { name: 'Signal Whistle',  category: 'gear', storeTypes: ['general','shipwright','fence'], rarity: 'common', basePrice: 0.05, isMagic: false, maxQty: 5 },
  { name: 'Tent, Two-Person', category: 'gear', storeTypes: ['general','fence'], rarity: 'common', basePrice: 2, isMagic: false, maxQty: 2 },
  { name: 'Tinderbox',       category: 'gear', storeTypes: ['general','fence'], rarity: 'common', basePrice: 0.5, isMagic: false, maxQty: 3 },
  { name: 'Torch',           category: 'gear', storeTypes: ['general','fence'], rarity: 'common', basePrice: 0.01, isMagic: false, maxQty: 10 },
  { name: 'Waterskin',       category: 'gear', storeTypes: ['general','fence'], rarity: 'common', basePrice: 0.2, isMagic: false, maxQty: 4 },
  { name: 'Spellbook',       category: 'gear', storeTypes: ['magic','general'], rarity: 'common', basePrice: 50, isMagic: false, maxQty: 2, racialBias: ['elf','gnome'] },
  { name: 'Component Pouch', category: 'gear', storeTypes: ['magic','alchemist','general'], rarity: 'common', basePrice: 25, isMagic: false, maxQty: 2 },
  { name: 'Holy Symbol',     category: 'gear', storeTypes: ['general','magic','jeweler'], rarity: 'common', basePrice: 5, isMagic: false, maxQty: 3 },
  { name: 'Magnifying Glass', category: 'gear', storeTypes: ['general','magic'], rarity: 'uncommon', basePrice: 100, isMagic: false, maxQty: 1, racialBias: ['gnome'] },
  { name: 'Spyglass',        category: 'gear', storeTypes: ['general','shipwright','magic'], rarity: 'uncommon', basePrice: 1000, isMagic: false, maxQty: 1, biomes: ['coastal'] },

  // ── Tools ───────────────────────────────────────────────────────────────────
  { name: "Alchemist's Supplies", category: 'tool', storeTypes: ['alchemist','general'],  rarity: 'common', basePrice: 50, isMagic: false, maxQty: 1, racialBias: ['gnome'] },
  { name: "Brewer's Supplies",    category: 'tool', storeTypes: ['general','fence'],       rarity: 'common', basePrice: 20, isMagic: false, maxQty: 1 },
  { name: "Carpenter's Tools",    category: 'tool', storeTypes: ['general','fence'],       rarity: 'common', basePrice: 8,  isMagic: false, maxQty: 1 },
  { name: "Cook's Utensils",      category: 'tool', storeTypes: ['general','fence'],       rarity: 'common', basePrice: 1,  isMagic: false, maxQty: 2 },
  { name: "Herbalism Kit",        category: 'tool', storeTypes: ['herbalist','general'],   rarity: 'common', basePrice: 5,  isMagic: false, maxQty: 2, biomes: ['forest'] },
  { name: "Jeweler's Tools",      category: 'tool', storeTypes: ['jeweler','general'],     rarity: 'common', basePrice: 25, isMagic: false, maxQty: 1, racialBias: ['gnome','dwarf'] },
  { name: "Leatherworker's Tools", category: 'tool', storeTypes: ['general','armorer','fence'], rarity: 'common', basePrice: 5, isMagic: false, maxQty: 1 },
  { name: "Mason's Tools",        category: 'tool', storeTypes: ['general','blacksmith'],  rarity: 'common', basePrice: 10, isMagic: false, maxQty: 1, racialBias: ['dwarf'] },
  { name: "Navigator's Tools",    category: 'tool', storeTypes: ['shipwright','general'],  rarity: 'common', basePrice: 25, isMagic: false, maxQty: 1, biomes: ['coastal'] },
  { name: "Painter's Supplies",   category: 'tool', storeTypes: ['general','fence'],       rarity: 'common', basePrice: 10, isMagic: false, maxQty: 1 },
  { name: "Smith's Tools",        category: 'tool', storeTypes: ['blacksmith','armorer','general'], rarity: 'common', basePrice: 20, isMagic: false, maxQty: 1, racialBias: ['dwarf'] },
  { name: "Thieves' Tools",       category: 'tool', storeTypes: ['fence','general'],       rarity: 'common', basePrice: 25, isMagic: false, maxQty: 2, racialBias: ['halfling','tiefling'] },
  { name: "Tinker's Tools",       category: 'tool', storeTypes: ['general','magic','fence'], rarity: 'common', basePrice: 50, isMagic: false, maxQty: 1, racialBias: ['gnome'] },
  { name: "Woodcarver's Tools",   category: 'tool', storeTypes: ['general','fence'],       rarity: 'common', basePrice: 1,  isMagic: false, maxQty: 1 },
  { name: "Disguise Kit",         category: 'tool', storeTypes: ['tailor','general','fence'], rarity: 'common', basePrice: 25, isMagic: false, maxQty: 1 },
  { name: "Forgery Kit",          category: 'tool', storeTypes: ['fence'],                 rarity: 'uncommon', basePrice: 15, isMagic: false, maxQty: 1 },
  { name: "Poisoner's Kit",       category: 'tool', storeTypes: ['alchemist','fence'],     rarity: 'uncommon', basePrice: 50, isMagic: false, maxQty: 1 },

  // ── Clothing ────────────────────────────────────────────────────────────────
  { name: 'Common Clothes',       category: 'clothing', storeTypes: ['tailor','general','fence'], rarity: 'common', basePrice: 0.5, isMagic: false, maxQty: 5 },
  { name: 'Traveler\'s Clothes',  category: 'clothing', storeTypes: ['tailor','general','fence'], rarity: 'common', basePrice: 2,   isMagic: false, maxQty: 3 },
  { name: 'Fine Clothes',         category: 'clothing', storeTypes: ['tailor','fence'],           rarity: 'common', basePrice: 15,  isMagic: false, maxQty: 2 },
  { name: 'Costume',              category: 'clothing', storeTypes: ['tailor','fence'],           rarity: 'common', basePrice: 5,   isMagic: false, maxQty: 2 },
  { name: 'Robe',                 category: 'clothing', storeTypes: ['tailor','magic','general'], rarity: 'common', basePrice: 1,   isMagic: false, maxQty: 2, racialBias: ['elf','tiefling'] },
  { name: 'Cloak',                category: 'clothing', storeTypes: ['tailor','general','fence'], rarity: 'common', basePrice: 1,   isMagic: false, maxQty: 3 },
  { name: 'Boots',                category: 'clothing', storeTypes: ['tailor','general','fence'], rarity: 'common', basePrice: 1,   isMagic: false, maxQty: 3 },

  // ── Trade Goods / Valuables ─────────────────────────────────────────────────
  { name: 'Quartz Crystal (gem)', category: 'trade', storeTypes: ['jeweler','magic','fence'], rarity: 'common',   basePrice: 50,   isMagic: false, maxQty: 3 },
  { name: 'Jade (gem)',           category: 'trade', storeTypes: ['jeweler','magic','fence'], rarity: 'uncommon', basePrice: 100,  isMagic: false, maxQty: 2 },
  { name: 'Garnet (gem)',         category: 'trade', storeTypes: ['jeweler','fence'],         rarity: 'uncommon', basePrice: 100,  isMagic: false, maxQty: 2 },
  { name: 'Amethyst (gem)',       category: 'trade', storeTypes: ['jeweler','magic','fence'], rarity: 'uncommon', basePrice: 100,  isMagic: false, maxQty: 2, racialBias: ['dwarf','elf'] },
  { name: 'Pearl (gem)',          category: 'trade', storeTypes: ['jeweler','magic','fence'], rarity: 'uncommon', basePrice: 100,  isMagic: false, maxQty: 2, biomes: ['coastal'] },
  { name: 'Topaz (gem)',          category: 'trade', storeTypes: ['jeweler','fence'],         rarity: 'uncommon', basePrice: 500,  isMagic: false, maxQty: 2 },
  { name: 'Sapphire (gem)',       category: 'trade', storeTypes: ['jeweler','fence'],         rarity: 'rare',     basePrice: 1000, isMagic: false, maxQty: 1 },
  { name: 'Ruby (gem)',           category: 'trade', storeTypes: ['jeweler','fence'],         rarity: 'rare',     basePrice: 1000, isMagic: false, maxQty: 1 },
  { name: 'Diamond (gem)',        category: 'trade', storeTypes: ['jeweler','magic'],         rarity: 'very rare', basePrice: 5000, isMagic: false, maxQty: 1 },
  { name: 'Gold Ring',            category: 'trade', storeTypes: ['jeweler','fence'],         rarity: 'common',   basePrice: 25,   isMagic: false, maxQty: 3 },
  { name: 'Silver Necklace',      category: 'trade', storeTypes: ['jeweler','fence'],         rarity: 'common',   basePrice: 10,   isMagic: false, maxQty: 3 },
  { name: 'Jeweled Brooch',       category: 'trade', storeTypes: ['jeweler','fence'],         rarity: 'uncommon', basePrice: 250,  isMagic: false, maxQty: 2 },

  // ── Shipwright ───────────────────────────────────────────────────────────────
  { name: 'Block and Tackle',     category: 'gear', storeTypes: ['shipwright'],  rarity: 'common', basePrice: 1,  isMagic: false, maxQty: 2, biomes: ['coastal'] },
  { name: "Navigator's Tools",    category: 'tool', storeTypes: ['shipwright'],  rarity: 'common', basePrice: 25, isMagic: false, maxQty: 2, biomes: ['coastal'] },
  { name: 'Fishing Tackle',       category: 'gear', storeTypes: ['shipwright','general','fence'], rarity: 'common', basePrice: 1, isMagic: false, maxQty: 3, biomes: ['coastal'] },

  // ── Magic Items (Magic Shop) ─────────────────────────────────────────────────
  { name: '+1 Weapon',           category: 'magic', storeTypes: ['magic','blacksmith','armorer','fence'], rarity: 'uncommon', basePrice: 500,   isMagic: true, maxQty: 1 },
  { name: '+2 Weapon',           category: 'magic', storeTypes: ['magic','blacksmith','armorer','fence'], rarity: 'rare',     basePrice: 4000,  isMagic: true, maxQty: 1 },
  { name: '+1 Shield',           category: 'magic', storeTypes: ['magic','armorer','blacksmith'],         rarity: 'uncommon', basePrice: 500,   isMagic: true, maxQty: 1 },
  { name: '+1 Armor',            category: 'magic', storeTypes: ['magic','armorer','blacksmith'],         rarity: 'rare',     basePrice: 4000,  isMagic: true, maxQty: 1 },
  { name: '+2 Armor',            category: 'magic', storeTypes: ['magic','armorer'],                      rarity: 'very rare', basePrice: 20000, isMagic: true, maxQty: 1 },
  { name: 'Bag of Holding',      category: 'magic', storeTypes: ['magic','fence'],                        rarity: 'uncommon', basePrice: 4000,  isMagic: true, maxQty: 1 },
  { name: 'Boots of Speed',      category: 'magic', storeTypes: ['magic'],                                rarity: 'rare',     basePrice: 8000,  isMagic: true, maxQty: 1 },
  { name: 'Boots of Elvenkind',  category: 'magic', storeTypes: ['magic'],                                rarity: 'uncommon', basePrice: 2500,  isMagic: true, maxQty: 1, racialBias: ['elf'] },
  { name: 'Cloak of Protection', category: 'magic', storeTypes: ['magic'],                                rarity: 'uncommon', basePrice: 3500,  isMagic: true, maxQty: 1 },
  { name: 'Cloak of Elvenkind',  category: 'magic', storeTypes: ['magic'],                                rarity: 'uncommon', basePrice: 5000,  isMagic: true, maxQty: 1, racialBias: ['elf'] },
  { name: 'Eyes of the Eagle',   category: 'magic', storeTypes: ['magic'],                                rarity: 'uncommon', basePrice: 2500,  isMagic: true, maxQty: 1 },
  { name: 'Gauntlets of Ogre Power', category: 'magic', storeTypes: ['magic'],                           rarity: 'uncommon', basePrice: 4000,  isMagic: true, maxQty: 1 },
  { name: 'Gloves of Thievery',  category: 'magic', storeTypes: ['magic','fence'],                        rarity: 'uncommon', basePrice: 3000,  isMagic: true, maxQty: 1, racialBias: ['halfling','tiefling'] },
  { name: 'Hat of Disguise',     category: 'magic', storeTypes: ['magic','fence'],                        rarity: 'uncommon', basePrice: 2000,  isMagic: true, maxQty: 1 },
  { name: 'Headband of Intellect', category: 'magic', storeTypes: ['magic'],                             rarity: 'uncommon', basePrice: 4000,  isMagic: true, maxQty: 1, racialBias: ['gnome','elf'] },
  { name: 'Necklace of Fireballs', category: 'magic', storeTypes: ['magic'],                             rarity: 'rare',     basePrice: 5000,  isMagic: true, maxQty: 1 },
  { name: 'Pearl of Power',      category: 'magic', storeTypes: ['magic'],                                rarity: 'uncommon', basePrice: 6000,  isMagic: true, maxQty: 1, racialBias: ['elf'] },
  { name: 'Ring of Protection',  category: 'magic', storeTypes: ['magic'],                                rarity: 'rare',     basePrice: 3500,  isMagic: true, maxQty: 1 },
  { name: 'Ring of Feather Falling', category: 'magic', storeTypes: ['magic'],                           rarity: 'rare',     basePrice: 2000,  isMagic: true, maxQty: 1 },
  { name: 'Ring of Spell Storing', category: 'magic', storeTypes: ['magic'],                             rarity: 'rare',     basePrice: 24000, isMagic: true, maxQty: 1 },
  { name: 'Ring of Swimming',    category: 'magic', storeTypes: ['magic','shipwright'],                   rarity: 'uncommon', basePrice: 3000,  isMagic: true, maxQty: 1, biomes: ['coastal'] },
  { name: 'Rod of the Pact Keeper', category: 'magic', storeTypes: ['magic'],                            rarity: 'uncommon', basePrice: 4000,  isMagic: true, maxQty: 1 },
  { name: 'Sending Stones',      category: 'magic', storeTypes: ['magic'],                                rarity: 'uncommon', basePrice: 1000,  isMagic: true, maxQty: 1 },
  { name: 'Staff of the Adder',  category: 'magic', storeTypes: ['magic'],                                rarity: 'uncommon', basePrice: 2000,  isMagic: true, maxQty: 1 },
  { name: 'Staff of Healing',    category: 'magic', storeTypes: ['magic'],                                rarity: 'rare',     basePrice: 16000, isMagic: true, maxQty: 1 },
  { name: 'Wand of Magic Missiles', category: 'magic', storeTypes: ['magic'],                            rarity: 'uncommon', basePrice: 4000,  isMagic: true, maxQty: 1, racialBias: ['elf','gnome'] },
  { name: 'Wand of Fireballs',   category: 'magic', storeTypes: ['magic'],                                rarity: 'rare',     basePrice: 12000, isMagic: true, maxQty: 1 },
  { name: 'Wand of Lightning Bolts', category: 'magic', storeTypes: ['magic'],                           rarity: 'rare',     basePrice: 12000, isMagic: true, maxQty: 1 },
  { name: 'Wand of the War Mage', category: 'magic', storeTypes: ['magic'],                              rarity: 'uncommon', basePrice: 3000,  isMagic: true, maxQty: 1, racialBias: ['elf'] },
  { name: 'Scroll of Detect Magic', category: 'magic', storeTypes: ['magic','alchemist'],               rarity: 'common',   basePrice: 25,    isMagic: true, maxQty: 3, racialBias: ['elf','gnome'] },
  { name: 'Scroll of Identify',  category: 'magic', storeTypes: ['magic','alchemist'],                   rarity: 'common',   basePrice: 25,    isMagic: true, maxQty: 3 },
  { name: 'Scroll of Fireball',  category: 'magic', storeTypes: ['magic'],                                rarity: 'uncommon', basePrice: 150,   isMagic: true, maxQty: 2 },
  { name: 'Scroll of Fly',       category: 'magic', storeTypes: ['magic'],                                rarity: 'rare',     basePrice: 500,   isMagic: true, maxQty: 1 },
  { name: 'Scroll of Teleportation', category: 'magic', storeTypes: ['magic'],                           rarity: 'very rare', basePrice: 5000,  isMagic: true, maxQty: 1 },
  { name: 'Immovable Rod',       category: 'magic', storeTypes: ['magic'],                                rarity: 'uncommon', basePrice: 5000,  isMagic: true, maxQty: 1 },
  { name: 'Rope of Climbing',    category: 'magic', storeTypes: ['magic','general','shipwright'],         rarity: 'uncommon', basePrice: 2000,  isMagic: true, maxQty: 1 },
  { name: 'Driftglobe',          category: 'magic', storeTypes: ['magic','general'],                      rarity: 'uncommon', basePrice: 750,   isMagic: true, maxQty: 1 },
];

// ─── Helper Functions ─────────────────────────────────────────────────────────

export function isRarityAllowed(itemRarity: Rarity, maxRarity: Rarity): boolean {
  return RARITY_ORDER.indexOf(itemRarity) <= RARITY_ORDER.indexOf(maxRarity);
}

export function getItemPool(
  storeType: StoreType,
  maxRarity: Rarity,
  allowMagic: boolean
): ItemTemplate[] {
  return ITEMS.filter(item => {
    if (!item.storeTypes.includes(storeType)) return false;
    if (!isRarityAllowed(item.rarity, maxRarity)) return false;
    if (!allowMagic && item.isMagic) return false;
    return true;
  });
}

export function weightedSelect<T extends { racialBias?: string[]; biomes?: string[] }>(
  pool: T[],
  race: string,
  biome: string,
  count: number
): T[] {
  if (pool.length === 0) return [];

  const weights = pool.map(item => {
    let w = 1.0;
    if (item.racialBias?.includes(race.toLowerCase())) w *= 3;
    if (item.biomes?.includes(biome.toLowerCase())) w *= 2;
    return w;
  });

  const selected: T[] = [];
  const available = [...pool];
  const availableWeights = [...weights];

  const n = Math.min(count, available.length);
  for (let i = 0; i < n; i++) {
    const total = availableWeights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    let idx = 0;
    for (; idx < availableWeights.length - 1; idx++) {
      r -= availableWeights[idx];
      if (r <= 0) break;
    }
    selected.push(available[idx]);
    available.splice(idx, 1);
    availableWeights.splice(idx, 1);
  }

  return selected;
}

export function rollQuantity(item: ItemTemplate, settlementSize: SettlementSize): number {
  const max = item.maxQty ?? 1;
  if (max === 1) return 1;
  // Larger settlements stock more
  const sizeMultiplier: Record<SettlementSize, number> = {
    hamlet: 0.3, village: 0.5, town: 0.7, city: 0.9, metropolis: 1.0,
  };
  const qty = Math.max(1, Math.round(Math.random() * max * sizeMultiplier[settlementSize]));
  return Math.min(qty, max);
}

export function applyPriceVariance(base: number): number {
  // ±15% variance
  const factor = 0.85 + Math.random() * 0.30;
  const price = base * factor;
  // Round to nearest sensible denomination
  if (price < 1) return Math.round(price * 10) / 10;
  if (price < 10) return Math.round(price);
  if (price < 100) return Math.round(price / 5) * 5;
  return Math.round(price / 10) * 10;
}

export function fencePrice(base: number): number {
  return applyPriceVariance(base * 0.5);
}
