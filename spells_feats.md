● The planning agent has finished with a
  comprehensive plan. I still need to exit plan
  mode before I can write PLAN.md or run any git
  commands. Approving this just lets me start
  writing — it doesn't auto-implement anything.
  ⎿  User rejected Claude's plan:
     ╭────────────────────────────────────────────╮
     │ Plan: Level-Dependent Character Creation   │
     │ (Spells + ASI/Feats)                       │
     │                                            │
     │ Context                                    │
     │                                            │
     │ Character creator currently always builds  │
     │ level-1 characters with no spellcasting or │
     │  level features. User wants the wizard to  │
     │ be aware of party level: show a            │
     │ spell-selection step for spellcasting      │
     │ classes and a level-features step (ASI or  │
     │ Feat) for classes that have reached ASI    │
     │ milestone levels. Character level should   │
     │ default to the campaign's partyLevel.      │
     │                                            │
     │ Affected Files                             │
     │                                            │
     │ 1. /web/src/types/index.ts — Add AsiChoice │
     │  interface; extend CharacterData           │
     │ 2. /web/src/data/dnd5e.ts — Add            │
     │ spellcasting tables, ASI levels, feats,    │
     │ helper fns                                 │
     │ 3. /web/src/data/spells.ts — New file: PHB │
     │  cantrips + leveled spell list             │
     │ 4. /web/src/pages/CharacterCreator.tsx —   │
     │ Dynamic steps, 2 new step components,      │
     │ level state                                │
     │ 5. /api/src/routes/characters.ts — Accept  │
     │ level/spells/ASIs, build actor accordingly │
     │ 6. /api/src/routes/invite.ts — Add         │
     │ partyLevel to portal response              │
     │                                            │
     │ ---                                        │
     │ Step 1 — /web/src/types/index.ts           │
     │                                            │
     │ Add before CharacterData:                  │
     │ export interface AsiChoice {               │
     │   type: 'asi' | 'feat';                    │
     │   asi?: Partial<Record<keyof               │
     │ AbilityScores, number>>; // values sum to  │
     │ 2                                          │
     │   feat?: string;                           │
     │ }                                          │
     │ Extend CharacterData with optional fields  │
     │ (no migration needed — stored as JSON):    │
     │ level?: number;             // 1–20,       │
     │ defaults to 1                              │
     │ selectedCantrips?: string[];               │
     │ selectedSpells?: string[];                 │
     │ asiChoices?: AsiChoice[];   // one entry   │
     │ per ASI milestone reached                  │
     │                                            │
     │ ---                                        │
     │ Step 2 — /web/src/data/dnd5e.ts            │
     │                                            │
     │ Add these exports at the bottom of the     │
     │ file:                                      │
     │                                            │
     │ ASI milestone levels per class             │
     │                                            │
     │ export const ASI_LEVELS: Record<string,    │
     │ number[]> = {                              │
     │   Barbarian: [4,8,12,16,19], Bard:         │
     │ [4,8,12,16,19],                            │
     │   Cleric: [4,8,12,16,19], Druid:           │
     │ [4,8,12,16,19],                            │
     │   Fighter: [4,6,8,12,14,16,19],    //      │
     │ extra ASIs                                 │
     │   Monk: [4,8,10,12,16,19],                 │
     │   Paladin: [4,8,12,16,19], Ranger:         │
     │ [4,8,12,16,19],                            │
     │   Rogue: [4,8,10,12,16,18],        //      │
     │ extra ASIs                                 │
     │   Sorcerer: [4,8,12,16,19], Warlock:       │
     │ [4,8,12,16,19],                            │
     │   Wizard: [4,8,12,16,19],                  │
     │ };                                         │
     │                                            │
     │ Spellcasting class type                    │
     │                                            │
     │ export type SpellcastingType = 'full' |    │
     │ 'half' | 'pact' | 'none';                  │
     │ export const SPELLCASTING_CLASS:           │
     │ Record<string, SpellcastingType> = {       │
     │   Bard: 'full', Cleric: 'full', Druid:     │
     │ 'full', Sorcerer: 'full', Wizard: 'full',  │
     │   Paladin: 'half', Ranger: 'half',         │
     │   Warlock: 'pact',                         │
     │ };                                         │
     │                                            │
     │ Cantrips known by class/level              │
     │                                            │
     │ export function getCantripCount(className: │
     │  string, level: number): number {          │
     │   const table: Record<string, number[]> =  │
     │ {                                          │
     │     // index = level-1                     │
     │     Bard:                                  │
     │ [2,2,2,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4], │
     │     Cleric:                                │
     │ [3,3,3,4,4,4,4,4,4,5,5,5,5,5,5,5,5,5,5,5], │
     │     Druid:                                 │
     │ [2,2,2,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4], │
     │     Sorcerer:                              │
     │ [4,4,4,5,5,5,5,5,5,6,6,6,6,6,6,6,6,6,6,6], │
     │     Warlock:                               │
     │ [2,2,2,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4], │
     │     Wizard:                                │
     │ [3,3,3,4,4,4,4,4,4,5,5,5,5,5,5,5,5,5,5,5], │
     │   };                                       │
     │   return table[className]?.[Math.min(level │
     │  - 1, 19)] ?? 0;                           │
     │ }                                          │
     │                                            │
     │ Spells known (for known-casters; -1 means  │
     │ prepared)                                  │
     │                                            │
     │ export function getSpellsKnown(className:  │
     │ string, level: number): number {           │
     │   // -1 = prepared caster (Cleric, Druid,  │
     │ Paladin, Wizard — they pick at session)    │
     │   const knownTable: Record<string,         │
     │ number[]> = {                              │
     │     Bard:     [4,5,6,7,8,9,10,11,12,14,15, │
     │ 15,16,18,19,19,20,22,22,22],               │
     │     Ranger:   [0,2,3,3,4,4,5,5,6,6,7,7,8,8 │
     │ ,9,9,10,10,11,11],                         │
     │     Sorcerer: [2,3,4,5,6,7,8,9,10,11,12,12 │
     │ ,13,13,14,14,15,15,15,15],                 │
     │     Warlock:  [2,3,4,5,6,7,8,9,10,10,11,11 │
     │ ,12,12,14,15,15,16,16,16],                 │
     │   };                                       │
     │   const prepared =                         │
     │ ['Cleric','Druid','Paladin','Wizard'];     │
     │   if (prepared.includes(className)) return │
     │  -1;                                       │
     │   return                                   │
     │ knownTable[className]?.[Math.min(level -   │
     │ 1, 19)] ?? 0;                              │
     │ }                                          │
     │                                            │
     │ Spell slots table (full caster, 1–20)      │
     │                                            │
     │ export const FULL_CASTER_SLOTS: number[][] │
     │  = [                                       │
     │   /* l1  */ [2,0,0,0,0,0,0,0,0],           │
     │   /* l2  */ [3,0,0,0,0,0,0,0,0],           │
     │   /* l3  */ [4,2,0,0,0,0,0,0,0],           │
     │   /* l4  */ [4,3,0,0,0,0,0,0,0],           │
     │   /* l5  */ [4,3,2,0,0,0,0,0,0],           │
     │   /* l6  */ [4,3,3,0,0,0,0,0,0],           │
     │   /* l7  */ [4,3,3,1,0,0,0,0,0],           │
     │   /* l8  */ [4,3,3,2,0,0,0,0,0],           │
     │   /* l9  */ [4,3,3,3,1,0,0,0,0],           │
     │   /* l10 */ [4,3,3,3,2,0,0,0,0],           │
     │   /* l11 */ [4,3,3,3,2,1,0,0,0],           │
     │   /* l12 */ [4,3,3,3,2,1,0,0,0],           │
     │   /* l13 */ [4,3,3,3,2,1,1,0,0],           │
     │   /* l14 */ [4,3,3,3,2,1,1,0,0],           │
     │   /* l15 */ [4,3,3,3,2,1,1,1,0],           │
     │   /* l16 */ [4,3,3,3,2,1,1,1,0],           │
     │   /* l17 */ [4,3,3,3,2,1,1,1,1],           │
     │   /* l18 */ [4,3,3,3,3,1,1,1,1],           │
     │   /* l19 */ [4,3,3,3,3,2,1,1,1],           │
     │   /* l20 */ [4,3,3,3,3,2,2,1,1],           │
     │ ];                                         │
     │ // Half caster slots (Paladin, Ranger) —   │
     │ starts at level 2                          │
     │ export const HALF_CASTER_SLOTS: number[][] │
     │  = [/* similar table */];                  │
     │ // Pact magic (Warlock)                    │
     │ export const PACT_SLOTS: { slots: number;  │
     │ level: number }[] = [                      │
     │   /* l1 */ { slots:1, level:1 }, /* l2 */  │
     │ { slots:2, level:1 },                      │
     │   /* l3 */ { slots:2, level:2 }, /* l4 */  │
     │ { slots:2, level:2 },                      │
     │   /* l5 */ { slots:2, level:3 },           │
     │   // ... through level 20                  │
     │ ];                                         │
     │                                            │
     │ Helper functions                           │
     │                                            │
     │ export function isSpellcaster(className:   │
     │ string): boolean {                         │
     │   return className in SPELLCASTING_CLASS;  │
     │ }                                          │
     │ export function                            │
     │ getAsiLevelsForClass(className: string,    │
     │ characterLevel: number): number[] {        │
     │   return (ASI_LEVELS[className] ??         │
     │ ASI_LEVELS.Barbarian).filter(l => l <=     │
     │ characterLevel);                           │
     │ }                                          │
     │ export function                            │
     │ isPreparedCaster(className: string):       │
     │ boolean {                                  │
     │   return ['Cleric','Druid','Paladin','Wiza │
     │ rd'].includes(className);                  │
     │ }                                          │
     │ export function                            │
     │ getMaxSpellLevel(className: string, level: │
     │  number): number {                         │
     │   // Full casters: ceil(level/2), Half     │
     │ casters: ceil(level/4), Warlock: per table │
     │   if (!isSpellcaster(className)) return 0; │
     │   const type =                             │
     │ SPELLCASTING_CLASS[className];             │
     │   if (type === 'full')  return Math.min(9, │
     │  Math.ceil(level / 2));                    │
     │   if (type === 'half')  return Math.min(5, │
     │  Math.ceil(level / 4));                    │
     │   if (type === 'pact')  return level < 3 ? │
     │  1 : level < 5 ? 2 : level < 7 ? 3 : level │
     │  < 9 ? 4 : 5;                              │
     │   return 0;                                │
     │ }                                          │
     │                                            │
     │ PHB Feats (34 PHB feats, abbreviated)      │
     │                                            │
     │ export interface Feat { name: string;      │
     │ description: string; }                     │
     │ export const FEATS: Feat[] = [             │
     │   { name: 'Alert', description: '+5        │
     │ initiative, cannot be surprised while      │
     │ conscious' },                              │
     │   { name: 'Athlete', description: '+1 STR  │
     │ or DEX; improved climbing and jumping' },  │
     │   { name: 'Actor', description: '+1 CHA;   │
     │ advantage on Deception/Performance while   │
     │ disguised' },                              │
     │   { name: 'Charger', description: 'Bonus   │
     │ action attack or shove after Dash' },      │
     │   { name: 'Crossbow Expert', description:  │
     │ 'Ignore loading, no disadvantage at melee  │
     │ range' },                                  │
     │   { name: 'Defensive Duelist',             │
     │ description: 'Reaction: +proficiency to AC │
     │  vs one melee attack (finesse weapon)' },  │
     │   { name: 'Dual Wielder', description: '+1 │
     │  AC with two weapons; dual wield non-light │
     │  weapons' },                               │
     │   { name: 'Dungeon Delver', description:   │
     │ 'Advantage on secret door and trap         │
     │ detection/saves' },                        │
     │   { name: 'Durable', description: '+1 CON; │
     │  min roll on Hit Dice recovery equals      │
     │ 2×CON mod' },                              │
     │   { name: 'Elemental Adept', description:  │
     │ 'Spells of chosen type ignore resistance;  │
     │ minimum 2 on dice' },                      │
     │   { name: 'Grappler', description: '+1     │
     │ STR; advantage on grappled creatures;      │
     │ attempt to pin' },                         │
     │   { name: 'Great Weapon Master',           │
     │ description: '-5 to hit for +10 damage;    │
     │ bonus attack after crit or kill' },        │
     │   { name: 'Healer', description:           │
     │ 'Stabilize gives 1 HP; healer kit restores │
     │  1d6+4+HD HP' },                           │
     │   { name: 'Heavily Armored', description:  │
     │ '+1 STR; proficiency with heavy armor' },  │
     │   { name: 'Heavy Armor Master',            │
     │ description: '+1 STR; nonmagical attacks   │
     │ deal 3 less damage in heavy armor' },      │
     │   { name: 'Inspiring Leader', description: │
     │  'Grant temporary HP equal to level+CHA    │
     │ mod to 6 creatures' },                     │
     │   { name: 'Keen Mind', description: '+1    │
     │ INT; always know north/time; perfect       │
     │ recall of past month' },                   │
     │   { name: 'Lightly Armored', description:  │
     │ '+1 STR or DEX; proficiency with light     │
     │ armor' },                                  │
     │   { name: 'Linguist', description: '+1     │
     │ INT; learn 3 languages; create ciphers' }, │
     │   { name: 'Lucky', description: '3 luck    │
     │ points per long rest: reroll attack,       │
     │ ability check, or saving throw' },         │
     │   { name: 'Mage Slayer', description:      │
     │ 'Reaction attack vs nearby caster;         │
     │ disadvantage on concentration saves' },    │
     │   { name: 'Magic Initiate', description:   │
     │ 'Learn 2 cantrips + 1 1st-level spell from │
     │  any class' },                             │
     │   { name: 'Martial Adept', description:    │
     │ 'Learn 2 maneuvers; 1 superiority die      │
     │ (d6)' },                                   │
     │   { name: 'Medium Armor Master',           │
     │ description: '+1 STR or DEX; DEX bonus to  │
     │ AC uncapped (max +3)' },                   │
     │   { name: 'Mobile', description: '+10      │
     │ speed; Dash ignores difficult terrain; no  │
     │ opportunity attack on attacked targets' }, │
     │   { name: 'Moderately Armored',            │
     │ description: '+1 STR or DEX; proficiency   │
     │ with medium armor and shields' },          │
     │   { name: 'Mounted Combatant',             │
     │ description: 'Advantage vs unmounted       │
     │ targets; redirect attacks to mount' },     │
     │   { name: 'Observant', description: '+1    │
     │ INT or WIS; +5 passive                     │
     │ Perception/Investigation; lip-read' },     │
     │   { name: 'Polearm Master', description:   │
     │ 'Bonus action butt-end attack; opportunity │
     │  attacks on reach' },                      │
     │   { name: 'Resilient', description: '+1 to │
     │  chosen ability; gain proficiency in its   │
     │ saving throw' },                           │
     │   { name: 'Ritual Caster', description:    │
     │ 'Learn and cast ritual spells from a       │
     │ chosen class list' },                      │
     │   { name: 'Savage Attacker', description:  │
     │ 'Reroll weapon damage dice once per turn,  │
     │ keep higher' },                            │
     │   { name: 'Sentinel', description:         │
     │ 'Opportunity attacks reduce speed to 0;    │
     │ ignore Disengage; reaction vs nearby       │
     │ attacker' },                               │
     │   { name: 'Sharpshooter', description: '-5 │
     │  to hit for +10 damage; ignore cover; no   │
     │ disadvantage at long range' },             │
     │   { name: 'Shield Master', description:    │
     │ 'Bonus action shove after attack; +2 DEX   │
     │ save if shielded' },                       │
     │   { name: 'Skilled', description:          │
     │ 'Proficiency in any 3 skills or tools' },  │
     │   { name: 'Skulker', description: '+1 DEX; │
     │  hide in dim light; missed attacks don\'t  │
     │ reveal position' },                        │
     │   { name: 'Spell Sniper', description:     │
     │ 'Double range; ignore half/three-quarters  │
     │ cover; extra cantrip' },                   │
     │   { name: 'Tavern Brawler', description:   │
     │ '+1 STR or CON; improvised/unarmed         │
     │ attacks; bonus grapple on hit' },          │
     │   { name: 'Tough', description: 'HP        │
     │ increases by 2×level (and +2 per future    │
     │ level)' },                                 │
     │   { name: 'War Caster', description:       │
     │ 'Advantage on concentration saves; somatic │
     │  components with hands full; opportunity   │
     │ spell attacks' },                          │
     │   { name: 'Weapon Master', description:    │
     │ '+1 STR or DEX; proficiency with 4         │
     │ weapons' },                                │
     │ ];                                         │
     │                                            │
     │ ---                                        │
     │ Step 3 — /web/src/data/spells.ts (New      │
     │ file)                                      │
     │                                            │
     │ export interface SpellEntry {              │
     │   name: string;                            │
     │   level: number;      // 0 = cantrip       │
     │   school: string;                          │
     │   castingTime: string;                     │
     │   range: string;                           │
     │   components: string;                      │
     │   duration: string;                        │
     │   classes: string[];  // e.g. ['Wizard',   │
     │ 'Sorcerer']                                │
     │   description: string;                     │
     │ }                                          │
     │                                            │
     │ export const SPELLS: SpellEntry[] = [      │
     │   // Cantrips                              │
     │   { name: 'Fire Bolt', level: 0, school:   │
     │ 'Evocation', castingTime: '1 action',      │
     │ range: '120 ft',                           │
     │     components: 'V, S', duration:          │
     │ 'Instantaneous', classes:                  │
     │ ['Wizard','Sorcerer'],                     │
     │     description: 'Ranged spell attack,     │
     │ 1d10 fire damage (scales with level).' },  │
     │   // ... (all PHB cantrips + 1st-5th level │
     │  spells for all core classes)              │
     │ ];                                         │
     │                                            │
     │ // Convenience helpers                     │
     │ export function                            │
     │ getSpellsForClass(className: string):      │
     │ SpellEntry[] {                             │
     │   return SPELLS.filter(s =>                │
     │ s.classes.includes(className));            │
     │ }                                          │
     │ export function                            │
     │ getCantripsForClass(className: string):    │
     │ SpellEntry[] {                             │
     │   return SPELLS.filter(s => s.level === 0  │
     │ && s.classes.includes(className));         │
     │ }                                          │
     │ export function                            │
     │ getSpellsByLevel(className: string,        │
     │ spellLevel: number): SpellEntry[] {        │
     │   return SPELLS.filter(s => s.level ===    │
     │ spellLevel &&                              │
     │ s.classes.includes(className));            │
     │ }                                          │
     │                                            │
     │ Spells to include: all PHB cantrips +      │
     │ levels 1–5 spells for Bard, Cleric, Druid, │
     │  Paladin, Ranger, Sorcerer, Warlock,       │
     │ Wizard (~180 spells total).                │
     │                                            │
     │ ---                                        │
     │ Step 4 —                                   │
     │ /web/src/pages/CharacterCreator.tsx        │
     │                                            │
     │ 4a. Imports                                │
     │                                            │
     │ Add: isSpellcaster, getAsiLevelsForClass,  │
     │ getCantripCount, getSpellsKnown,           │
     │ getMaxSpellLevel, isPreparedCaster, FEATS  │
     │ from ../data/dnd5e                         │
     │ Add: getSpellsForClass,                    │
     │ getCantripsForClass, getSpellsByLevel from │
     │  ../data/spells                            │
     │ Add: AsiChoice from ../types               │
     │                                            │
     │ 4b. DEFAULT_CHARACTER                      │
     │                                            │
     │ Add level: 1, selectedCantrips: [],        │
     │ selectedSpells: [], asiChoices: []         │
     │                                            │
     │ 4c. Dynamic step list (replaces static     │
     │ STEPS)                                     │
     │                                            │
     │ function getActiveSteps(className: string, │
     │  level: number): string[] {                │
     │   const steps = ['Race', 'Class',          │
     │ 'Background', 'Ability Scores', 'Skills',  │
     │ 'Equipment'];                              │
     │   if (className &&                         │
     │ isSpellcaster(className))                  │
     │ steps.push('Spells');                      │
     │   if (className &&                         │
     │ getAsiLevelsForClass(className,            │
     │ level).length > 0) steps.push('Level       │
     │ Features');                                │
     │   steps.push('Details & Review');          │
     │   return steps;                            │
     │ }                                          │
     │                                            │
     │ Replace STEPS.length references with       │
     │ activeSteps.length (computed from          │
     │ character.class and character.level).      │
     │ Replace step-number-based rendering with   │
     │ step-name-based:                           │
     │ const activeSteps =                        │
     │ getActiveSteps(character.class,            │
     │ character.level ?? 1);                     │
     │ const currentStepName = activeSteps[step - │
     │  1];                                       │
     │ Then render: {currentStepName === 'Spells' │
     │  && <StepSpells ... />} etc.               │
     │                                            │
     │ 4d. Level selector in StepClass            │
     │                                            │
     │ At the bottom of the existing class step   │
     │ component, add:                            │
     │ <div className="mt-6 p-4 bg-gray-800       │
     │ rounded-lg border border-gray-700">        │
     │   <label className="block text-sm          │
     │ text-gray-400 mb-2">Character              │
     │ Level</label>                              │
     │   <div className="flex items-center        │
     │ gap-3">                                    │
     │     <button onClick={() => setCharacter(c  │
     │ => ({...c, level: Math.max(1,              │
     │ (c.level??1)-1)}))}                        │
     │       className="w-8 h-8 rounded           │
     │ bg-gray-700 text-white hover:bg-gray-600   │
     │ font-bold">−</button>                      │
     │     <span className="text-2xl font-bold    │
     │ text-white w-8                             │
     │ text-center">{character.level ?? 1}</span> │
     │     <button onClick={() => setCharacter(c  │
     │ => ({...c, level: Math.min(20,             │
     │ (c.level??1)+1)}))}                        │
     │       className="w-8 h-8 rounded           │
     │ bg-gray-700 text-white hover:bg-gray-600   │
     │ font-bold">+</button>                      │
     │     <span className="text-sm text-gray-500 │
     │  ml-2">Proficiency Bonus: +{Math.ceil((cha │
     │ racter.level??1)/4)+1}</span>              │
     │   </div>                                   │
     │ </div>                                     │
     │                                            │
     │ 4e. Load partyLevel from portal            │
     │                                            │
     │ In the existing useEffect that loads       │
     │ player portal, extend to also set level:   │
     │ api.getPlayerPortal(playerId).then(data => │
     │  {                                         │
     │   if (data.player.foundryUserId) {         │
     │     setCharacter(c => ({ ...c,             │
     │ foundryUserId: data.player.foundryUserId   │
     │ }));                                       │
     │   }                                        │
     │   if (data.campaign.partyLevel) {          │
     │     setCharacter(c => ({ ...c, level:      │
     │ data.campaign.partyLevel }));              │
     │   }                                        │
     │ }).catch(() => {});                        │
     │ (Requires adding partyLevel to portal      │
     │ response — see Step 6.)                    │
     │                                            │
     │ 4f. New StepSpells component               │
     │                                            │
     │ function StepSpells({ character,           │
     │ setCharacter }) {                          │
     │   const [spellLevelFilter,                 │
     │ setSpellLevelFilter] = useState(1);        │
     │   const level = character.level ?? 1;      │
     │   const cantripCount =                     │
     │ getCantripCount(character.class, level);   │
     │   const maxSpellLevel =                    │
     │ getMaxSpellLevel(character.class, level);  │
     │   const spellsKnown =                      │
     │ getSpellsKnown(character.class, level);    │
     │   const selectedCantrips =                 │
     │ character.selectedCantrips ?? [];          │
     │   const selectedSpells =                   │
     │ character.selectedSpells ?? [];            │
     │                                            │
     │   // Cantrip grid                          │
     │   // Spell level tabs (1 to maxSpellLevel) │
     │   // For known casters: enforce count; for │
     │  prepared: show "you prepare X" info       │
     │   return (                                 │
     │     <div>                                  │
     │       <h2>Spells</h2>                      │
     │       {/* Cantrips section */}             │
     │       {/* Leveled spells section */}       │
     │     </div>                                 │
     │   );                                       │
     │ }                                          │
     │                                            │
     │ 4g. New StepLevelFeatures component        │
     │                                            │
     │ function StepLevelFeatures({ character,    │
     │ setCharacter }) {                          │
     │   const level = character.level ?? 1;      │
     │   const asiMilestones =                    │
     │ getAsiLevelsForClass(character.class,      │
     │ level);                                    │
     │   const asiChoices = character.asiChoices  │
     │ ?? [];                                     │
     │                                            │
     │   return (                                 │
     │     <div>                                  │
     │       <h2>Level Features</h2>              │
     │       <p>You have {asiMilestones.length}   │
     │ Ability Score Improvement(s) or Feat       │
     │ choice(s).</p>                             │
     │       {asiMilestones.map((milestoneLevel,  │
     │ i) => (                                    │
     │         <AsiOrFeatCard                     │
     │           key={milestoneLevel}             │
     │           index={i}                        │
     │           milestoneLevel={milestoneLevel}  │
     │           choice={asiChoices[i]}           │
     │           onChoice={choice => {            │
     │             const newChoices =             │
     │ [...asiChoices];                           │
     │             newChoices[i] = choice;        │
     │             setCharacter(c => ({...c,      │
     │ asiChoices: newChoices}));                 │
     │           }}                               │
     │         />                                 │
     │       ))}                                  │
     │     </div>                                 │
     │   );                                       │
     │ }                                          │
     │                                            │
     │ Each AsiOrFeatCard has two tabs: "ASI"     │
     │ (with +/- per ability, max total 2) and    │
     │ "Feat" (searchable list of FEATS).         │
     │                                            │
     │ 4h. canProceed() — extend for new steps    │
     │                                            │
     │ Replace step-number switch with step-name  │
     │ switch:                                    │
     │ const canProceed = (): boolean => {        │
     │   switch (currentStepName) {               │
     │     case 'Race': ...                       │
     │     case 'Class': ...                      │
     │     case 'Spells': {                       │
     │       const cantripCount =                 │
     │ getCantripCount(character.class,           │
     │ character.level ?? 1);                     │
     │       const selectedCantrips =             │
     │ character.selectedCantrips ?? [];          │
     │       if (selectedCantrips.length !==      │
     │ cantripCount) return false;                │
     │       const spellsKnown =                  │
     │ getSpellsKnown(character.class,            │
     │ character.level ?? 1);                     │
     │       if (spellsKnown > 0) {               │
     │         // Known caster: must pick exactly │
     │  spellsKnown spells                        │
     │         return (character.selectedSpells   │
     │ ?? []).length === spellsKnown;             │
     │       }                                    │
     │       return true; // Prepared casters:    │
     │ always OK                                  │
     │     }                                      │
     │     case 'Level Features': {               │
     │       const asiMilestones =                │
     │ getAsiLevelsForClass(character.class,      │
     │ character.level ?? 1);                     │
     │       return asiMilestones.every((_, i) => │
     │  {                                         │
     │         const c = (character.asiChoices ?? │
     │  [])[i];                                   │
     │         if (!c) return false;              │
     │         if (c.type === 'feat') return      │
     │ !!c.feat;                                  │
     │         const total = Object.values(c.asi  │
     │ ?? {}).reduce((a, b) => a + b, 0);         │
     │         return total === 2;                │
     │       });                                  │
     │     }                                      │
     │     default: return true;                  │
     │   }                                        │
     │ };                                         │
     │                                            │
     │ 4i. Update handleAIGenerate and handleSync │
     │                                            │
     │ - handleAIGenerate: jump to                │
     │ activeSteps.length instead of hardcoded 7  │
     │ - handleSync: apply ASI bonuses to         │
     │ finalScores before sending:                │
     │ for (const choice of character.asiChoices  │
     │ ?? []) {                                   │
     │   if (choice.type === 'asi' && choice.asi) │
     │  {                                         │
     │     for (const [key, val] of               │
     │ Object.entries(choice.asi)) {              │
     │       (finalScores as                      │
     │ Record<string,number>)[key] += val;        │
     │     }                                      │
     │   }                                        │
     │ }                                          │
     │                                            │
     │ ---                                        │
     │ Step 5 — /api/src/routes/characters.ts     │
     │                                            │
     │ 5a. Extend CharacterData interface         │
     │                                            │
     │ level?: number;                            │
     │ selectedCantrips?: string[];               │
     │ selectedSpells?: string[];                 │
     │ // asiChoices applied on frontend before   │
     │ sending (finalScores already includes ASI) │
     │                                            │
     │ 5b. In /sync handler                       │
     │                                            │
     │ Set level on class item:                   │
     │ system: { ...(classEntry.system), levels:  │
     │ data.level ?? 1 }                          │
     │                                            │
     │ Multi-level HP:                            │
     │ const level = data.level ?? 1;             │
     │ const maxHp = hitDie + conMod; // level 1  │
     │ const avgPerLevel = Math.max(1,            │
     │ Math.floor(hitDie / 2) + 1 + conMod);      │
     │ const totalHp = maxHp + (level - 1) *      │
     │ avgPerLevel;                               │
     │ const hp = data.hpRoll !== undefined ?     │
     │ data.hpRoll : Math.max(level, totalHp);    │
     │                                            │
     │ Resolve spells from compendium:            │
     │ for (const spellName of                    │
     │ [...(data.selectedCantrips ?? []),         │
     │ ...(data.selectedSpells ?? [])]) {         │
     │   const item = await foundrySyncService.fi │
     │ ndCompendiumItem('dnd5e.spells',           │
     │ spellName);                                │
     │   if (item) {                              │
     │     const entry = { ...item };             │
     │     delete (entry as                       │
     │ Record<string,unknown>)._id;               │
     │     resolvedItems.push(entry);             │
     │   } else {                                 │
     │     resolvedItems.push({ name: spellName,  │
     │ type: 'spell',                             │
     │       system: { description: { value: ''   │
     │ }, level: 0, school: 'evocation' } });     │
     │   }                                        │
     │ }                                          │
     │                                            │
     │ Build spell slots (if spellcaster) and add │
     │  to actor system:                          │
     │ function buildSpellSlots(className:        │
     │ string, level: number): Record<string, {   │
     │ value: number; max: number }> {            │
     │   // Returns { spell1: {value:2,max:2},    │
     │ spell2: ..., etc. } from FULL_CASTER_SLOTS │
     │  / PACT logic                              │
     │ }                                          │
     │ // Add to actorData.system: spells:        │
     │ buildSpellSlots(data.class, level)         │
     │                                            │
     │ Update biography:                          │
     │ Change Level 1 in biography to Level       │
     │ ${data.level ?? 1}.                        │
     │                                            │
     │ ---                                        │
     │ Step 6 — /api/src/routes/invite.ts         │
     │                                            │
     │ In GET /portal/:playerId handler, add      │
     │ partyLevel to the campaign response:       │
     │ campaign: {                                │
     │   name: campaign.name,                     │
     │   setting: campaign.setting,               │
     │   description: campaign.description,       │
     │   worldLore: campaign.worldLore,           │
     │   partyLevel: campaign.partyLevel,   //    │
     │ ADD THIS                                   │
     │ },                                         │
     │                                            │
     │ Also update PlayerPortalData type in       │
     │ /web/src/types/index.ts to include         │
     │ partyLevel?: number in the nested campaign │
     │  type.                                     │
     │                                            │
     │ ---                                        │
     │ Verification                               │
     │                                            │
     │ 1. Open invite link for a campaign at      │
     │ partyLevel 4 (e.g., Fighter)               │
     │ 2. Character Creator: level auto-sets to 4 │
     │ 3. Class = Wizard → "Spells" step appears; │
     │  pick 4 cantrips + 2 first-level spells +  │
     │ 2 second-level spells                      │
     │ 4. "Level Features" step appears (level 4  │
     │ milestone reached); assign ASI +2 INT or   │
     │ pick a Feat                                │
     │ 5. Sync → actor in Foundry has: level 4,   │
     │ HP = (8+conMod)+(3×avg), spells in spell   │
     │ list, ASI applied to INT                   │
     │                                            │
     │ For non-spellcaster (Fighter level 4):     │
     │ - No Spells step                           │
     │ - Level Features step appears with 1 ASI   │
     │ milestone                                  │
     │ - After sync: Fighter actor at level 4     │
     │ with correct HP                            │
     │                                            │
     │ For level 1 Fighter:                       │
     │ - No Spells step, no Level Features step — │
     │  wizard stays at original 7 steps          │
     │                                            │
     │ For level 1 Wizard:                        │
     │ - Spells step appears; pick 3 cantrips + 2 │
     │  first-level spells                        │
     │ - No Level Features (level 1 = no ASI yet) │
     ╰────────────────────────────────────────────╯


