// D&D 5e PHB + TCoE + Popular Sourcebook Data

export interface Subrace {
  name: string;
  abilityBonuses: Record<string, number>;
  traits: string[];
  languages?: string[];
  speed?: number;
  darkvision?: number;
}

export interface Race {
  name: string;
  speed: number;
  abilityBonuses: Record<string, number>;
  languages: string[];
  traits: string[];
  darkvision?: number;
  subraces?: Subrace[];
  source?: string;
}

export interface ClassEquipmentOption {
  label: string;
  items: string[];
}

export interface SuggestedArray {
  label: string;
  scores: Record<string, number>;
}

export interface DndClass {
  name: string;
  hitDie: number;
  savingThrows: string[];
  armorProf: string[];
  weaponProf: string[];
  skillChoiceCount: number;
  skillOptions: string[];
  startingGoldD6s: number;
  equipmentOptions: ClassEquipmentOption[];
  suggestedArrays: SuggestedArray[];
  subclasses: string[];
  level1Subclass: boolean;
  source?: string;
}

export interface Background {
  name: string;
  skills: string[];
  toolProf: string[];
  languages: number;
  startingEquipment: string[];
  startingGold: number;
  feature: string;
}

export interface Skill {
  key: string;
  name: string;
  ability: string;
}

// ─── RACES ────────────────────────────────────────────────────────────────────

export const RACES: Race[] = [
  // ── PHB ──
  {
    name: 'Human',
    speed: 30,
    abilityBonuses: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
    languages: ['Common', 'One extra language of your choice'],
    traits: ['Extra Language'],
    source: 'PHB',
  },
  {
    name: 'Elf',
    speed: 30,
    abilityBonuses: { dex: 2 },
    languages: ['Common', 'Elvish'],
    traits: ['Darkvision 60ft', 'Keen Senses (Perception proficiency)', 'Fey Ancestry', 'Trance'],
    darkvision: 60,
    source: 'PHB',
    subraces: [
      { name: 'High Elf', abilityBonuses: { int: 1 }, traits: ['Extra Language', 'Wizard Cantrip'] },
      { name: 'Wood Elf', abilityBonuses: { wis: 1 }, traits: ['Fleet of Foot (speed 35ft)', 'Mask of the Wild'], speed: 35 },
      { name: 'Drow', abilityBonuses: { cha: 1 }, traits: ['Superior Darkvision 120ft', 'Sunlight Sensitivity', 'Drow Magic'], darkvision: 120 },
    ],
  },
  {
    name: 'Dwarf',
    speed: 25,
    abilityBonuses: { con: 2 },
    languages: ['Common', 'Dwarvish'],
    traits: ['Darkvision 60ft', 'Dwarven Resilience', 'Stonecunning', 'Tool Proficiency'],
    darkvision: 60,
    source: 'PHB',
    subraces: [
      { name: 'Hill Dwarf', abilityBonuses: { wis: 1 }, traits: ['Dwarven Toughness (+1 HP per level)'] },
      { name: 'Mountain Dwarf', abilityBonuses: { str: 2 }, traits: ['Dwarven Armor Training (light & medium armor)'] },
    ],
  },
  {
    name: 'Halfling',
    speed: 25,
    abilityBonuses: { dex: 2 },
    languages: ['Common', 'Halfling'],
    traits: ['Lucky', 'Brave', 'Halfling Nimbleness'],
    source: 'PHB',
    subraces: [
      { name: 'Lightfoot', abilityBonuses: { cha: 1 }, traits: ['Naturally Stealthy'] },
      { name: 'Stout', abilityBonuses: { con: 1 }, traits: ['Stout Resilience (advantage vs poison)'] },
    ],
  },
  {
    name: 'Dragonborn',
    speed: 30,
    abilityBonuses: { str: 2, cha: 1 },
    languages: ['Common', 'Draconic'],
    traits: ['Breath Weapon', 'Damage Resistance'],
    source: 'PHB',
  },
  {
    name: 'Gnome',
    speed: 25,
    abilityBonuses: { int: 2 },
    languages: ['Common', 'Gnomish'],
    traits: ['Darkvision 60ft', 'Gnome Cunning'],
    darkvision: 60,
    source: 'PHB',
    subraces: [
      { name: 'Forest Gnome', abilityBonuses: { dex: 1 }, traits: ['Natural Illusionist', 'Speak with Small Beasts'] },
      { name: 'Rock Gnome', abilityBonuses: { con: 1 }, traits: ["Artificer's Lore", 'Tinker'] },
    ],
  },
  {
    name: 'Half-Elf',
    speed: 30,
    abilityBonuses: { cha: 2 },
    languages: ['Common', 'Elvish', 'One extra language'],
    traits: ['Darkvision 60ft', 'Fey Ancestry', 'Skill Versatility (2 skill proficiencies)', '+1 to two ability scores of your choice'],
    darkvision: 60,
    source: 'PHB',
  },
  {
    name: 'Half-Orc',
    speed: 30,
    abilityBonuses: { str: 2, con: 1 },
    languages: ['Common', 'Orc'],
    traits: ['Darkvision 60ft', 'Menacing (Intimidation proficiency)', 'Relentless Endurance', 'Savage Attacks'],
    darkvision: 60,
    source: 'PHB',
  },
  {
    name: 'Tiefling',
    speed: 30,
    abilityBonuses: { int: 1, cha: 2 },
    languages: ['Common', 'Infernal'],
    traits: ['Darkvision 60ft', 'Hellish Resistance (fire)', 'Infernal Legacy'],
    darkvision: 60,
    source: 'PHB',
  },

  // ── Volo's Guide / MPMM ──
  {
    name: 'Aasimar',
    speed: 30,
    abilityBonuses: { cha: 2 },
    languages: ['Common', 'Celestial'],
    traits: ['Darkvision 60ft', 'Celestial Resistance (necrotic & radiant)', 'Healing Hands', 'Light Bearer (Light cantrip)'],
    darkvision: 60,
    source: "Volo's Guide",
    subraces: [
      { name: 'Protector', abilityBonuses: { wis: 1 }, traits: ['Radiant Soul (fly speed + radiant damage)'] },
      { name: 'Scourge', abilityBonuses: { con: 1 }, traits: ['Radiant Consumption (damage aura)'] },
      { name: 'Fallen', abilityBonuses: { str: 1 }, traits: ['Necrotic Shroud (frighten creatures)'] },
    ],
  },
  {
    name: 'Firbolg',
    speed: 30,
    abilityBonuses: { wis: 2, str: 1 },
    languages: ['Common', 'Elvish', 'Giant'],
    traits: ['Firbolg Magic (Detect Magic + Disguise Self)', 'Hidden Step (invisibility 1/short rest)', 'Powerful Build', 'Speech of Beast and Leaf'],
    source: "Volo's Guide",
  },
  {
    name: 'Goliath',
    speed: 30,
    abilityBonuses: { str: 2, con: 1 },
    languages: ['Common', 'Giant'],
    traits: ['Natural Athlete (Athletics proficiency)', "Stone's Endurance (reduce damage 1/short rest)", 'Powerful Build', 'Mountain Born (cold resistance, high altitude)'],
    source: "Volo's Guide",
  },
  {
    name: 'Kenku',
    speed: 30,
    abilityBonuses: { dex: 2, wis: 1 },
    languages: ['Common', 'Auran'],
    traits: ['Expert Forgery', 'Kenku Training (2 skills: Acrobatics/Deception/Stealth/Sleight of Hand)', 'Mimicry (can copy sounds and voices)'],
    source: "Volo's Guide",
  },
  {
    name: 'Tabaxi',
    speed: 30,
    abilityBonuses: { dex: 2, cha: 1 },
    languages: ['Common', 'One extra language'],
    traits: ['Darkvision 60ft', 'Feline Agility (double speed 1/rest)', "Cat's Claws (climb speed 20ft, 1d4 unarmed)", "Cat's Talent (Perception + Stealth proficiency)"],
    darkvision: 60,
    source: "Volo's Guide",
  },

  // ── Elemental Evil / MPMM ──
  {
    name: 'Genasi',
    speed: 30,
    abilityBonuses: { con: 2 },
    languages: ['Common', 'Primordial'],
    traits: ['Elemental Affinity'],
    source: 'Elemental Evil',
    subraces: [
      { name: 'Air Genasi', abilityBonuses: { dex: 1 }, traits: ['Unending Breath (hold breath indefinitely)', 'Mingle with the Wind (Levitate 1/long rest)'] },
      { name: 'Earth Genasi', abilityBonuses: { str: 1 }, traits: ['Earth Walk (move across difficult terrain from stone/earth)', 'Merge with Stone (Pass Without Trace 1/long rest)'] },
      { name: 'Fire Genasi', abilityBonuses: { int: 1 }, traits: ['Darkvision 60ft', 'Fire Resistance', 'Reach to the Blaze (Produce Flame + Burning Hands 1/long rest)'], darkvision: 60 },
      { name: 'Water Genasi', abilityBonuses: { wis: 1 }, traits: ['Acid Resistance', 'Amphibious (breathe air + water)', 'Swim speed 30ft', 'Call to the Wave (Shape Water + Create/Destroy Water)'] },
    ],
  },

  // ── Eberron / TCoE ──
  {
    name: 'Warforged',
    speed: 30,
    abilityBonuses: { con: 2, str: 1 },
    languages: ['Common', 'One extra language'],
    traits: ['Constructed Resilience (immunity to disease, no need to eat/drink/breathe, adv vs poison)', "Sentry's Rest (6 hours inactive = long rest)", 'Integrated Protection (natural armor)', 'Specialized Design (1 skill + 1 tool proficiency)'],
    source: 'Eberron / TCoE',
  },
  {
    name: 'Changeling',
    speed: 30,
    abilityBonuses: { cha: 2, dex: 1 },
    languages: ['Common', 'Two extra languages'],
    traits: ['Shapechanger (alter appearance as action)', 'Changeling Instincts (2 skills from Deception/Insight/Intimidation/Persuasion)'],
    source: 'Eberron / TCoE',
  },

  // ── Wild Beyond the Witchlight ──
  {
    name: 'Fairy',
    speed: 30,
    abilityBonuses: { dex: 1, wis: 1 },
    languages: ['Common', 'Sylvan'],
    traits: ['Flight (30ft, can hover)', 'Fey (creature type)', 'Fairy Magic (Druidcraft, Faerie Fire 1/long rest, Enlarge/Reduce 1/long rest)'],
    source: "Wild Beyond the Witchlight",
  },

  // ── Van Richten's Guide ──
  {
    name: 'Dhampir',
    speed: 30,
    abilityBonuses: { cha: 2, dex: 1 },
    languages: ['Common', 'One extra language'],
    traits: ['Darkvision 60ft', 'Deathless Nature (no need to breathe, advantage vs disease)', 'Spider Climb (climb speed = walk speed)', 'Vampiric Bite (1d4 piercing, regain HP = proficiency bonus)'],
    darkvision: 60,
    source: "Van Richten's Guide",
  },

  // ── TCoE ──
  {
    name: 'Custom Lineage',
    speed: 30,
    abilityBonuses: {},
    languages: ['Common', 'One extra language'],
    traits: ['+2 to one ability score of your choice', 'Darkvision 60ft OR one skill proficiency', 'One feat of your choice', '(TCoE: fully customizable — assign ASIs freely)'],
    darkvision: 60,
    source: 'TCoE',
  },
];

// ─── CLASSES ──────────────────────────────────────────────────────────────────

export const CLASSES: DndClass[] = [
  {
    name: 'Artificer',
    hitDie: 8,
    savingThrows: ['con', 'int'],
    armorProf: ['Light', 'Medium', 'Shields'],
    weaponProf: ['Simple', 'Martial'],
    skillChoiceCount: 2,
    skillOptions: ['arc', 'his', 'inv', 'med', 'nat', 'prc', 'slt'],
    startingGoldD6s: 5,
    equipmentOptions: [
      { label: 'Two hand crossbows + 20 bolts + thieves\' tools + dungeoneer\'s pack', items: ['2 Hand Crossbows', '20 Bolts', "Thieves' Tools", "Dungeoneer's Pack"] },
      { label: 'Any two simple weapons + thieves\' tools + dungeoneer\'s pack', items: ['2 Simple Weapons', "Thieves' Tools", "Dungeoneer's Pack"] },
    ],
    suggestedArrays: [
      { label: 'Alchemist / Support', scores: { int: 15, con: 14, dex: 13, wis: 12, cha: 10, str: 8 } },
      { label: 'Battle Smith / Artillerist', scores: { int: 15, con: 14, str: 13, dex: 12, wis: 10, cha: 8 } },
    ],
    subclasses: ['Alchemist (TCoE)', 'Armorer (TCoE)', 'Artillerist (TCoE)', 'Battle Smith (TCoE)'],
    level1Subclass: false,
    source: 'TCoE',
  },
  {
    name: 'Barbarian',
    hitDie: 12,
    savingThrows: ['str', 'con'],
    armorProf: ['Light', 'Medium', 'Shields'],
    weaponProf: ['Simple', 'Martial'],
    skillChoiceCount: 2,
    skillOptions: ['ani', 'ath', 'itm', 'nat', 'prc', 'sur'],
    startingGoldD6s: 2,
    equipmentOptions: [
      { label: 'Greataxe + 2 handaxes + explorer\'s pack + 4 javelins', items: ['Greataxe', '2 Handaxes', "Explorer's Pack", '4 Javelins'] },
      { label: 'Any martial melee weapon + 2 handaxes + explorer\'s pack', items: ['Martial Melee Weapon', '2 Handaxes', "Explorer's Pack"] },
    ],
    suggestedArrays: [
      { label: 'Reckless Attacker', scores: { str: 15, con: 14, dex: 13, wis: 12, int: 10, cha: 8 } },
    ],
    subclasses: [
      'Path of the Berserker (PHB)', 'Path of the Totem Warrior (PHB)',
      'Path of the Ancestral Guardian (XGtE)', 'Path of the Storm Herald (XGtE)', 'Path of the Zealot (XGtE)',
      'Path of the Beast (TCoE)', 'Path of Wild Magic (TCoE)',
    ],
    level1Subclass: false,
  },
  {
    name: 'Bard',
    hitDie: 8,
    savingThrows: ['dex', 'cha'],
    armorProf: ['Light'],
    weaponProf: ['Simple', 'Hand Crossbow', 'Longsword', 'Rapier', 'Shortsword'],
    skillChoiceCount: 3,
    skillOptions: ['acr', 'ani', 'arc', 'ath', 'dec', 'his', 'ins', 'itm', 'inv', 'med', 'nat', 'prc', 'prf', 'per', 'rel', 'slt', 'ste', 'sur'],
    startingGoldD6s: 5,
    equipmentOptions: [
      { label: 'Rapier + diplomat\'s pack + lute', items: ['Rapier', "Diplomat's Pack", 'Lute'] },
      { label: 'Longsword + entertainer\'s pack + lute', items: ['Longsword', "Entertainer's Pack", 'Lute'] },
      { label: 'Any simple weapon + entertainer\'s pack + lute', items: ['Simple Weapon', "Entertainer's Pack", 'Lute'] },
    ],
    suggestedArrays: [
      { label: 'Face & Performer', scores: { cha: 15, dex: 14, con: 13, wis: 12, int: 10, str: 8 } },
      { label: 'Lore Bard', scores: { cha: 15, int: 14, dex: 13, con: 12, wis: 10, str: 8 } },
    ],
    subclasses: [
      'College of Lore (PHB)', 'College of Valor (PHB)',
      'College of Glamour (XGtE)', 'College of Swords (XGtE)', 'College of Whispers (XGtE)',
      'College of Creation (TCoE)', 'College of Eloquence (TCoE)',
    ],
    level1Subclass: false,
  },
  {
    name: 'Cleric',
    hitDie: 8,
    savingThrows: ['wis', 'cha'],
    armorProf: ['Light', 'Medium', 'Shields'],
    weaponProf: ['Simple'],
    skillChoiceCount: 2,
    skillOptions: ['his', 'ins', 'med', 'per', 'rel'],
    startingGoldD6s: 5,
    equipmentOptions: [
      { label: 'Mace + chain mail + shield + holy symbol', items: ['Mace', 'Chain Mail', 'Shield', 'Holy Symbol', "Priest's Pack"] },
      { label: 'Warhammer (if proficient) + scale mail + holy symbol', items: ['Warhammer', 'Scale Mail', 'Shield', 'Holy Symbol', "Priest's Pack"] },
    ],
    suggestedArrays: [
      { label: 'Healer / Caster', scores: { wis: 15, con: 14, str: 13, cha: 12, dex: 10, int: 8 } },
      { label: 'Armored War Cleric', scores: { str: 15, wis: 14, con: 13, cha: 12, dex: 10, int: 8 } },
    ],
    subclasses: [
      'Arcana Domain (PHB)', 'Death Domain (PHB)', 'Knowledge Domain (PHB)', 'Life Domain (PHB)',
      'Light Domain (PHB)', 'Nature Domain (PHB)', 'Tempest Domain (PHB)', 'Trickery Domain (PHB)', 'War Domain (PHB)',
      'Forge Domain (XGtE)', 'Grave Domain (XGtE)',
      'Order Domain (TCoE)', 'Peace Domain (TCoE)', 'Twilight Domain (TCoE)',
    ],
    level1Subclass: true,
  },
  {
    name: 'Druid',
    hitDie: 8,
    savingThrows: ['int', 'wis'],
    armorProf: ['Light (non-metal)', 'Medium (non-metal)', 'Shields (non-metal)'],
    weaponProf: ['Clubs', 'Daggers', 'Darts', 'Javelins', 'Maces', 'Quarterstaffs', 'Scimitars', 'Sickles', 'Slings', 'Spears'],
    skillChoiceCount: 2,
    skillOptions: ['arc', 'ani', 'ins', 'med', 'nat', 'prc', 'rel', 'sur'],
    startingGoldD6s: 2,
    equipmentOptions: [
      { label: 'Wooden shield + scimitar + explorer\'s pack + druidic focus', items: ['Wooden Shield', 'Scimitar', "Explorer's Pack", 'Druidic Focus'] },
      { label: 'Any simple weapon + leather armor + explorer\'s pack + druidic focus', items: ['Simple Weapon', 'Leather Armor', "Explorer's Pack", 'Druidic Focus'] },
    ],
    suggestedArrays: [
      { label: 'Wild Shape / Caster', scores: { wis: 15, con: 14, dex: 13, int: 12, cha: 10, str: 8 } },
    ],
    subclasses: [
      'Circle of the Land (PHB)', 'Circle of the Moon (PHB)',
      'Circle of Dreams (XGtE)', 'Circle of the Shepherd (XGtE)',
      'Circle of Spores (TCoE)', 'Circle of Stars (TCoE)', 'Circle of Wildfire (TCoE)',
    ],
    level1Subclass: false,
  },
  {
    name: 'Fighter',
    hitDie: 10,
    savingThrows: ['str', 'con'],
    armorProf: ['All Armor', 'Shields'],
    weaponProf: ['Simple', 'Martial'],
    skillChoiceCount: 2,
    skillOptions: ['acr', 'ani', 'ath', 'his', 'ins', 'itm', 'prc', 'sur'],
    startingGoldD6s: 5,
    equipmentOptions: [
      { label: 'Chain mail + longsword + shield + 2 handaxes + dungeoneer\'s pack', items: ['Chain Mail', 'Longsword', 'Shield', '2 Handaxes', "Dungeoneer's Pack"] },
      { label: 'Leather armor + longbow + 20 arrows + 2 shortswords + dungeoneer\'s pack', items: ['Leather Armor', 'Longbow', '20 Arrows', '2 Shortswords', "Dungeoneer's Pack"] },
    ],
    suggestedArrays: [
      { label: 'Strength Build', scores: { str: 15, con: 14, dex: 13, wis: 12, int: 10, cha: 8 } },
      { label: 'Dexterity / Archer', scores: { dex: 15, con: 14, wis: 13, str: 12, int: 10, cha: 8 } },
    ],
    subclasses: [
      'Battle Master (PHB)', 'Champion (PHB)', 'Eldritch Knight (PHB)',
      'Arcane Archer (XGtE)', 'Cavalier (XGtE)', 'Samurai (XGtE)',
      'Psi Warrior (TCoE)', 'Rune Knight (TCoE)',
    ],
    level1Subclass: false,
  },
  {
    name: 'Monk',
    hitDie: 8,
    savingThrows: ['str', 'dex'],
    armorProf: [],
    weaponProf: ['Simple', 'Shortswords'],
    skillChoiceCount: 2,
    skillOptions: ['acr', 'ath', 'his', 'ins', 'rel', 'ste'],
    startingGoldD6s: 5,
    equipmentOptions: [
      { label: 'Shortsword + dungeoneer\'s pack + 10 darts', items: ['Shortsword', "Dungeoneer's Pack", '10 Darts'] },
      { label: 'Any simple weapon + explorer\'s pack + 10 darts', items: ['Simple Weapon', "Explorer's Pack", '10 Darts'] },
    ],
    suggestedArrays: [
      { label: 'Way of the Open Hand', scores: { dex: 15, wis: 14, con: 13, str: 12, int: 10, cha: 8 } },
    ],
    subclasses: [
      'Way of the Four Elements (PHB)', 'Way of the Open Hand (PHB)', 'Way of Shadow (PHB)',
      'Way of the Drunken Master (XGtE)', 'Way of the Kensei (XGtE)', 'Way of the Sun Soul (XGtE)',
      'Way of Mercy (TCoE)', 'Way of the Astral Self (TCoE)',
    ],
    level1Subclass: false,
  },
  {
    name: 'Paladin',
    hitDie: 10,
    savingThrows: ['wis', 'cha'],
    armorProf: ['All Armor', 'Shields'],
    weaponProf: ['Simple', 'Martial'],
    skillChoiceCount: 2,
    skillOptions: ['ath', 'ins', 'itm', 'med', 'per', 'rel'],
    startingGoldD6s: 5,
    equipmentOptions: [
      { label: 'Longsword + shield + 5 javelins + priest\'s pack + holy symbol + chain mail', items: ['Longsword', 'Shield', '5 Javelins', "Priest's Pack", 'Holy Symbol', 'Chain Mail'] },
      { label: 'Any martial weapon + any simple weapon + priest\'s pack + chain mail + holy symbol', items: ['Martial Weapon', 'Simple Weapon', "Priest's Pack", 'Chain Mail', 'Holy Symbol'] },
    ],
    suggestedArrays: [
      { label: 'Oath Champion', scores: { str: 15, cha: 14, con: 13, wis: 12, dex: 10, int: 8 } },
    ],
    subclasses: [
      'Oath of Devotion (PHB)', 'Oath of the Ancients (PHB)', 'Oath of Vengeance (PHB)',
      'Oath of Conquest (XGtE)', 'Oath of Redemption (XGtE)',
      'Oath of Glory (TCoE)', 'Oath of the Watchers (TCoE)',
    ],
    level1Subclass: false,
  },
  {
    name: 'Ranger',
    hitDie: 10,
    savingThrows: ['str', 'dex'],
    armorProf: ['Light', 'Medium', 'Shields'],
    weaponProf: ['Simple', 'Martial'],
    skillChoiceCount: 3,
    skillOptions: ['ani', 'ath', 'ins', 'inv', 'nat', 'prc', 'ste', 'sur'],
    startingGoldD6s: 5,
    equipmentOptions: [
      { label: 'Scale mail + 2 shortswords + dungeoneer\'s pack + longbow + quiver of 20 arrows', items: ['Scale Mail', '2 Shortswords', "Dungeoneer's Pack", 'Longbow', '20 Arrows'] },
      { label: 'Leather armor + 2 shortswords + explorer\'s pack + longbow + 20 arrows', items: ['Leather Armor', '2 Shortswords', "Explorer's Pack", 'Longbow', '20 Arrows'] },
    ],
    suggestedArrays: [
      { label: 'Ranged / Scout', scores: { dex: 15, wis: 14, con: 13, str: 12, int: 10, cha: 8 } },
      { label: 'Melee Ranger', scores: { str: 15, dex: 14, wis: 13, con: 12, int: 10, cha: 8 } },
    ],
    subclasses: [
      'Beast Master (PHB)', 'Hunter (PHB)',
      'Gloom Stalker (XGtE)', 'Horizon Walker (XGtE)', 'Monster Slayer (XGtE)',
      'Fey Wanderer (TCoE)', 'Swarmkeeper (TCoE)',
    ],
    level1Subclass: false,
  },
  {
    name: 'Rogue',
    hitDie: 8,
    savingThrows: ['dex', 'int'],
    armorProf: ['Light'],
    weaponProf: ['Simple', 'Hand Crossbow', 'Longsword', 'Rapier', 'Shortsword', "Thieves' Tools"],
    skillChoiceCount: 4,
    skillOptions: ['acr', 'ath', 'dec', 'ins', 'itm', 'inv', 'prc', 'prf', 'per', 'slt', 'ste'],
    startingGoldD6s: 4,
    equipmentOptions: [
      { label: 'Rapier + shortbow + 20 arrows + burglar\'s pack + leather armor + 2 daggers + thieves\' tools', items: ['Rapier', 'Shortbow', '20 Arrows', "Burglar's Pack", 'Leather Armor', '2 Daggers', "Thieves' Tools"] },
      { label: 'Shortsword + shortbow + 20 arrows + dungeoneer\'s pack + leather armor + 2 daggers + thieves\' tools', items: ['Shortsword', 'Shortbow', '20 Arrows', "Dungeoneer's Pack", 'Leather Armor', '2 Daggers', "Thieves' Tools"] },
    ],
    suggestedArrays: [
      { label: 'Arcane Trickster', scores: { dex: 15, int: 14, con: 13, wis: 12, cha: 10, str: 8 } },
      { label: 'Assassin / Thief', scores: { dex: 15, con: 14, int: 13, wis: 12, cha: 10, str: 8 } },
    ],
    subclasses: [
      'Arcane Trickster (PHB)', 'Assassin (PHB)', 'Thief (PHB)',
      'Inquisitive (XGtE)', 'Mastermind (XGtE)', 'Scout (XGtE)', 'Swashbuckler (XGtE)',
      'Phantom (TCoE)', 'Soulknife (TCoE)',
    ],
    level1Subclass: false,
  },
  {
    name: 'Sorcerer',
    hitDie: 6,
    savingThrows: ['con', 'cha'],
    armorProf: [],
    weaponProf: ['Daggers', 'Darts', 'Slings', 'Quarterstaffs', 'Light Crossbows'],
    skillChoiceCount: 2,
    skillOptions: ['arc', 'dec', 'ins', 'itm', 'per', 'rel'],
    startingGoldD6s: 3,
    equipmentOptions: [
      { label: 'Light crossbow + 20 bolts + component pouch + dungeoneer\'s pack + 2 daggers', items: ['Light Crossbow', '20 Bolts', 'Component Pouch', "Dungeoneer's Pack", '2 Daggers'] },
      { label: 'Any simple weapon + component pouch + explorer\'s pack + 2 daggers', items: ['Simple Weapon', 'Component Pouch', "Explorer's Pack", '2 Daggers'] },
    ],
    suggestedArrays: [
      { label: 'Blaster Sorcerer', scores: { cha: 15, con: 14, dex: 13, wis: 12, int: 10, str: 8 } },
    ],
    subclasses: [
      'Draconic Bloodline (PHB)', 'Wild Magic (PHB)',
      'Divine Soul (XGtE)', 'Shadow Magic (XGtE)', 'Storm Sorcery (XGtE)',
      'Aberrant Mind (TCoE)', 'Clockwork Soul (TCoE)',
    ],
    level1Subclass: true,
  },
  {
    name: 'Warlock',
    hitDie: 8,
    savingThrows: ['wis', 'cha'],
    armorProf: ['Light'],
    weaponProf: ['Simple'],
    skillChoiceCount: 2,
    skillOptions: ['arc', 'dec', 'his', 'itm', 'inv', 'nat', 'rel'],
    startingGoldD6s: 4,
    equipmentOptions: [
      { label: 'Light crossbow + 20 bolts + component pouch + scholar\'s pack + leather armor + simple weapon + 2 daggers', items: ['Light Crossbow', '20 Bolts', 'Component Pouch', "Scholar's Pack", 'Leather Armor', 'Simple Weapon', '2 Daggers'] },
      { label: 'Any simple weapon + component pouch + dungeoneer\'s pack + leather armor + 2 daggers', items: ['Simple Weapon', 'Component Pouch', "Dungeoneer's Pack", 'Leather Armor', '2 Daggers'] },
    ],
    suggestedArrays: [
      { label: 'Eldritch Blaster', scores: { cha: 15, con: 14, dex: 13, wis: 12, int: 10, str: 8 } },
    ],
    subclasses: [
      'The Archfey (PHB)', 'The Fiend (PHB)', 'The Great Old One (PHB)',
      'The Celestial (XGtE)', 'The Hexblade (XGtE)',
      'The Fathomless (TCoE)', 'The Genie (TCoE)',
    ],
    level1Subclass: true,
  },
  {
    name: 'Wizard',
    hitDie: 6,
    savingThrows: ['int', 'wis'],
    armorProf: [],
    weaponProf: ['Daggers', 'Darts', 'Slings', 'Quarterstaffs', 'Light Crossbows'],
    skillChoiceCount: 2,
    skillOptions: ['arc', 'his', 'ins', 'inv', 'med', 'rel'],
    startingGoldD6s: 4,
    equipmentOptions: [
      { label: 'Quarterstaff + component pouch + scholar\'s pack + spellbook', items: ['Quarterstaff', 'Component Pouch', "Scholar's Pack", 'Spellbook'] },
      { label: 'Any simple weapon + arcane focus + explorer\'s pack + spellbook', items: ['Simple Weapon', 'Arcane Focus', "Explorer's Pack", 'Spellbook'] },
    ],
    suggestedArrays: [
      { label: 'Generalist Wizard', scores: { int: 15, con: 14, dex: 13, wis: 12, cha: 10, str: 8 } },
      { label: 'Abjurer / War Mage', scores: { int: 15, con: 14, wis: 13, dex: 12, cha: 10, str: 8 } },
    ],
    subclasses: [
      'School of Abjuration (PHB)', 'School of Conjuration (PHB)', 'School of Divination (PHB)',
      'School of Enchantment (PHB)', 'School of Evocation (PHB)', 'School of Illusion (PHB)',
      'School of Necromancy (PHB)', 'School of Transmutation (PHB)',
      'War Magic (XGtE)',
      'Bladesinging (TCoE)', 'Order of Scribes (TCoE)',
    ],
    level1Subclass: false,
  },
];

// ─── BACKGROUNDS ──────────────────────────────────────────────────────────────

export const BACKGROUNDS: Background[] = [
  {
    name: 'Acolyte',
    skills: ['ins', 'rel'],
    toolProf: [],
    languages: 2,
    startingEquipment: ['Holy Symbol', 'Prayer Book', '5 Sticks of Incense', 'Vestments', 'Common Clothes', 'Pouch'],
    startingGold: 15,
    feature: 'Shelter of the Faithful',
  },
  {
    name: 'Charlatan',
    skills: ['dec', 'slt'],
    toolProf: ['Disguise Kit', 'Forgery Kit'],
    languages: 0,
    startingEquipment: ['Fine Clothes', 'Disguise Kit', 'Con Tools', 'Pouch'],
    startingGold: 15,
    feature: 'False Identity',
  },
  {
    name: 'Criminal',
    skills: ['dec', 'ste'],
    toolProf: ["Thieves' Tools", 'One Gaming Set'],
    languages: 0,
    startingEquipment: ['Crowbar', 'Dark Common Clothes with Hood', 'Pouch'],
    startingGold: 15,
    feature: 'Criminal Contact',
  },
  {
    name: 'Entertainer',
    skills: ['acr', 'prf'],
    toolProf: ['Disguise Kit', 'One Musical Instrument'],
    languages: 0,
    startingEquipment: ['Musical Instrument', "Admirer's Favor", 'Costume', 'Pouch'],
    startingGold: 15,
    feature: 'By Popular Demand',
  },
  {
    name: 'Folk Hero',
    skills: ['ani', 'sur'],
    toolProf: ["One type of artisan's tools", 'Vehicles (Land)'],
    languages: 0,
    startingEquipment: ["Artisan's Tools", 'Shovel', 'Iron Pot', 'Common Clothes', 'Pouch'],
    startingGold: 10,
    feature: 'Rustic Hospitality',
  },
  {
    name: 'Guild Artisan',
    skills: ['ins', 'per'],
    toolProf: ["One type of artisan's tools"],
    languages: 1,
    startingEquipment: ["Artisan's Tools", 'Letter of Introduction', "Traveler's Clothes", 'Pouch'],
    startingGold: 15,
    feature: 'Guild Membership',
  },
  {
    name: 'Hermit',
    skills: ['med', 'rel'],
    toolProf: ['Herbalism Kit'],
    languages: 1,
    startingEquipment: ['Scroll Case', 'Winter Blanket', 'Common Clothes', 'Herbalism Kit', 'Pouch'],
    startingGold: 5,
    feature: 'Discovery',
  },
  {
    name: 'Noble',
    skills: ['his', 'per'],
    toolProf: ['One Gaming Set'],
    languages: 1,
    startingEquipment: ['Fine Clothes', 'Signet Ring', 'Scroll of Pedigree', 'Purse'],
    startingGold: 25,
    feature: 'Position of Privilege',
  },
  {
    name: 'Outlander',
    skills: ['ath', 'sur'],
    toolProf: ['One Musical Instrument'],
    languages: 1,
    startingEquipment: ['Staff', 'Hunting Trap', 'Animal Trophy', "Traveler's Clothes", 'Pouch'],
    startingGold: 10,
    feature: 'Wanderer',
  },
  {
    name: 'Sage',
    skills: ['arc', 'his'],
    toolProf: [],
    languages: 2,
    startingEquipment: ['Bottle of Ink', 'Quill', 'Small Knife', 'Letter from Dead Colleague', 'Common Clothes', 'Pouch'],
    startingGold: 10,
    feature: 'Researcher',
  },
  {
    name: 'Sailor',
    skills: ['ath', 'prc'],
    toolProf: ["Navigator's Tools", 'Vehicles (Water)'],
    languages: 0,
    startingEquipment: ['Belaying Pin', '50ft Silk Rope', 'Lucky Charm', 'Common Clothes', 'Pouch'],
    startingGold: 10,
    feature: "Ship's Passage",
  },
  {
    name: 'Soldier',
    skills: ['ath', 'itm'],
    toolProf: ['One Gaming Set', 'Vehicles (Land)'],
    languages: 0,
    startingEquipment: ['Insignia of Rank', 'Trophy from Fallen Enemy', 'Bone Dice Set', 'Common Clothes', 'Pouch'],
    startingGold: 10,
    feature: 'Military Rank',
  },
  {
    name: 'Urchin',
    skills: ['slt', 'ste'],
    toolProf: ['Disguise Kit', "Thieves' Tools"],
    languages: 0,
    startingEquipment: ['Small Knife', 'Map of Home City', 'Pet Mouse', 'Token of Parents', 'Common Clothes', 'Pouch'],
    startingGold: 10,
    feature: 'City Secrets',
  },
];

// ─── SKILLS ───────────────────────────────────────────────────────────────────

export const SKILLS: Skill[] = [
  { key: 'acr', name: 'Acrobatics', ability: 'dex' },
  { key: 'ani', name: 'Animal Handling', ability: 'wis' },
  { key: 'arc', name: 'Arcana', ability: 'int' },
  { key: 'ath', name: 'Athletics', ability: 'str' },
  { key: 'dec', name: 'Deception', ability: 'cha' },
  { key: 'his', name: 'History', ability: 'int' },
  { key: 'ins', name: 'Insight', ability: 'wis' },
  { key: 'itm', name: 'Intimidation', ability: 'cha' },
  { key: 'inv', name: 'Investigation', ability: 'int' },
  { key: 'med', name: 'Medicine', ability: 'wis' },
  { key: 'nat', name: 'Nature', ability: 'int' },
  { key: 'prc', name: 'Perception', ability: 'wis' },
  { key: 'prf', name: 'Performance', ability: 'cha' },
  { key: 'per', name: 'Persuasion', ability: 'cha' },
  { key: 'rel', name: 'Religion', ability: 'int' },
  { key: 'slt', name: 'Sleight of Hand', ability: 'dex' },
  { key: 'ste', name: 'Stealth', ability: 'dex' },
  { key: 'sur', name: 'Survival', ability: 'wis' },
];

export const SKILL_MAP: Record<string, Skill> = Object.fromEntries(SKILLS.map(s => [s.key, s]));

// ─── ALIGNMENTS ───────────────────────────────────────────────────────────────

export const ALIGNMENTS = [
  'Lawful Good', 'Neutral Good', 'Chaotic Good',
  'Lawful Neutral', 'True Neutral', 'Chaotic Neutral',
  'Lawful Evil', 'Neutral Evil', 'Chaotic Evil',
];

// ─── ABILITY HELPERS ──────────────────────────────────────────────────────────

export const ABILITY_LABELS: Record<string, string> = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
};

export const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
export type AbilityKey = typeof ABILITY_KEYS[number];

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

export const POINT_BUY_COSTS: Record<number, number> = {
  8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9,
};

export const POINT_BUY_BUDGET = 27;

export function calcModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function modString(score: number): string {
  const m = calcModifier(score);
  return m >= 0 ? `+${m}` : `${m}`;
}

export function getRaceData(raceName: string): Race | undefined {
  return RACES.find(r => r.name === raceName);
}

export function getClassData(className: string): DndClass | undefined {
  return CLASSES.find(c => c.name === className);
}

export function getBackgroundData(bgName: string): Background | undefined {
  return BACKGROUNDS.find(b => b.name === bgName);
}

export function getSkillName(key: string): string {
  return SKILL_MAP[key]?.name ?? key;
}
