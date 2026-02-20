import { AppDataSource } from '../config/database';
import { Session } from '../entities/Session';
import { Map as MapEntity } from '../entities/Map';
import { FoundrySyncService } from './foundrySync';
import { GeneratedEncounter } from './ai';
import { generateMonsterSilhouette } from './tokenGenerator';

const sessionRepository = () => AppDataSource.getRepository(Session);
const mapRepository = () => AppDataSource.getRepository(MapEntity);

// Size to grid units mapping
const SIZE_TO_GRID_UNITS: Record<string, number> = {
  tiny: 1,
  small: 1,
  medium: 1,
  large: 2,
  huge: 3,
  gargantuan: 4,
};

// ============================================================
// Interfaces
// ============================================================

export interface ExpandedEnemy {
  name: string;
  cr: string;
  size: string;
  hp: number;
  ac: number;
}

interface TokenPosition {
  x: number; // pixel coordinates
  y: number; // pixel coordinates
  enemy: ExpandedEnemy;
}

interface RoomData {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface EncounterTokenPlacement {
  actorId: string;
  tokenId?: string;
  tokenName: string;
  encounterIndex: number;
  encounterName: string;
  x: number;
  y: number;
  enemy: ExpandedEnemy;
  textureSrc?: string;
}

export interface CreatedCombat {
  combatId: string;
  encounterName: string;
  combatantCount: number;
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Add random jitter to position for natural placement
 * Returns a value between -0.3 and +0.3
 */
function jitter(): number {
  return (Math.random() - 0.5) * 0.6;
}

/**
 * Infer enemy size from CR or name
 */
export function inferEnemySize(enemy: { name: string; cr?: string }): string {
  const name = enemy.name.toLowerCase();

  // Size keywords in name
  if (name.includes('tiny') || name.includes('sprite') || name.includes('pixie')) {
    return 'tiny';
  }
  if (name.includes('small') || name.includes('goblin') || name.includes('kobold')) {
    return 'small';
  }
  if (name.includes('large') || name.includes('ogre') || name.includes('troll')) {
    return 'large';
  }
  if (name.includes('huge') || name.includes('giant') || name.includes('dragon')) {
    return 'huge';
  }
  if (name.includes('gargantuan') || name.includes('tarrasque')) {
    return 'gargantuan';
  }

  // Default to medium
  return 'medium';
}

// ============================================================
// Monster Token Resolution (Compendium + Silhouette Fallback)
// ============================================================

/**
 * Normalize a monster name for compendium matching:
 * - Strip trailing numbers (e.g. "Goblin 1" -> "Goblin")
 * - Strip leading articles
 * - Lowercase + trim
 */
export function normalizeMonsterName(name: string): string {
  return name
    .replace(/\s+\d+$/, '')          // strip trailing numbers
    .replace(/^(the|a|an)\s+/i, '')  // strip leading articles
    .trim()
    .toLowerCase();
}

/**
 * Common AI-generated name -> SRD compendium name mappings.
 */
const MONSTER_NAME_ALIASES: Record<string, string> = {
  'skeletal warrior': 'skeleton',
  'skeleton warrior': 'skeleton',
  'skeleton archer': 'skeleton',
  'skeletal archer': 'skeleton',
  'bandit leader': 'bandit captain',
  'bandit chief': 'bandit captain',
  'goblin warrior': 'goblin',
  'goblin archer': 'goblin',
  'goblin chief': 'goblin boss',
  'goblin leader': 'goblin boss',
  'orc warrior': 'orc',
  'orc raider': 'orc',
  'wolf alpha': 'dire wolf',
  'alpha wolf': 'dire wolf',
  'giant spider': 'giant spider',
  'giant rat': 'giant rat',
  'large spider': 'giant spider',
  'large rat': 'giant rat',
  'zombie warrior': 'zombie',
  'zombie soldier': 'zombie',
  'dark cultist': 'cultist',
  'evil cultist': 'cultist',
  'cult fanatic': 'cult fanatic',
  'fire elemental': 'fire elemental',
  'water elemental': 'water elemental',
  'earth elemental': 'earth elemental',
  'air elemental': 'air elemental',
  'young dragon': 'young red dragon',
  'cave bear': 'brown bear',
  'wild bear': 'brown bear',
  'black bear': 'brown bear',
  'dire bear': 'brown bear',
  'venomous snake': 'poisonous snake',
  'giant snake': 'giant constrictor snake',
  'wraith lord': 'wraith',
  'shadow assassin': 'shadow',
  'dark shadow': 'shadow',
};

/**
 * Keyword-based creature type inference from monster name.
 * Maps to the 14 silhouette types defined in tokenGenerator.
 */
export function inferCreatureType(name: string): string {
  const n = name.toLowerCase();

  // Check in priority order (more specific first)
  if (/dragon|drake|wyvern|wyrm/.test(n)) return 'dragon';
  if (/skeleton|zombie|ghoul|ghost|specter|spectre|wraith|lich|wight|mummy|vampire|undead|revenant/.test(n)) return 'undead';
  if (/devil|demon|fiend|imp|succubus|incubus|balor|pit fiend|hezrou|vrock/.test(n)) return 'fiend';
  if (/angel|celestial|deva|planetar|solar|archon|couatl/.test(n)) return 'celestial';
  if (/sprite|pixie|fairy|fey|dryad|satyr|nymph|hag|eladrin/.test(n)) return 'fey';
  if (/elemental|fire|water|earth|air|magma|ice|steam|lightning|mephit|genie|djinn|efreet/.test(n)) return 'elemental';
  if (/golem|construct|animated|shield guardian|homunculus|modron/.test(n)) return 'construct';
  if (/beholder|mind flayer|aboleth|illithid|aberration|slaad|gibbering|otyugh|flumph|intellect devourer/.test(n)) return 'aberration';
  if (/giant|ogre|troll|ettin|cyclops|hill giant|frost giant|fire giant|stone giant|storm giant|cloud giant/.test(n)) return 'giant';
  if (/ooze|slime|jelly|pudding|gelatinous|blob/.test(n)) return 'ooze';
  if (/treant|blight|shambling|myconid|vegepygmy|plant/.test(n)) return 'plant';
  if (/chimera|griffon|griffin|manticore|owlbear|displacer|bulette|hydra|basilisk|cockatrice|worg|roc|kraken|purple worm|ankheg|carrion|rust monster|phase spider|hook horror/.test(n)) return 'monstrosity';
  if (/wolf|bear|rat|spider|snake|bat|hawk|eagle|lion|tiger|panther|boar|horse|ape|crocodile|shark|scorpion|elk|deer|ox|cat|toad|frog|raven|vulture|owl|octopus|crab|beast/.test(n)) return 'beast';

  // Default: humanoid covers goblin, kobold, orc, bandit, guard, cultist, etc.
  return 'humanoid';
}

/** Token resolution result */
export interface MonsterTokenInfo {
  img?: string;
  textureSrc?: string;
  prototypeToken?: {
    texture: { src: string };
    width: number;
    height: number;
  };
}

/**
 * Resolve the best available token image for a monster.
 *
 * Tier 1: Search dnd5e.monsters compendium (normalized name, then aliases)
 * Tier 2: Generate a creature-type SVG silhouette colored by CR
 */
export async function resolveMonsterToken(
  enemy: ExpandedEnemy,
  foundrySyncService: FoundrySyncService
): Promise<MonsterTokenInfo> {
  const baseName = normalizeMonsterName(enemy.name);

  // Tier 1a: Direct compendium lookup with normalized name
  try {
    const match = await foundrySyncService.searchCompendium('dnd5e.monsters', baseName);
    if (match) {
      return {
        img: match.img,
        textureSrc: match.prototypeToken.texture.src,
        prototypeToken: match.prototypeToken,
      };
    }
  } catch (err) {
    console.warn(`[EncounterPlacement] Compendium search failed for "${baseName}":`, err);
  }

  // Tier 1b: Try alias mapping
  const alias = MONSTER_NAME_ALIASES[baseName];
  if (alias) {
    try {
      const match = await foundrySyncService.searchCompendium('dnd5e.monsters', alias);
      if (match) {
        console.log(`[EncounterPlacement] Alias match: "${baseName}" -> "${alias}"`);
        return {
          img: match.img,
          textureSrc: match.prototypeToken.texture.src,
          prototypeToken: match.prototypeToken,
        };
      }
    } catch (err) {
      console.warn(`[EncounterPlacement] Alias compendium search failed for "${alias}":`, err);
    }
  }

  // Tier 2: Generate silhouette
  try {
    const creatureType = inferCreatureType(enemy.name);
    const silhouettePath = await generateMonsterSilhouette(enemy.name, creatureType, enemy.cr);
    return {
      img: silhouettePath,
      textureSrc: silhouettePath,
    };
  } catch (err) {
    console.warn(`[EncounterPlacement] Silhouette generation failed for "${enemy.name}":`, err);
  }

  return {};
}

/**
 * Flatten enemies by count, creating individual enemies with numbered names
 */
function expandEnemyCount(enemies: Array<{
  name: string;
  count: number;
  cr?: string;
  hitPoints?: number;
  armorClass?: number;
  size?: string;
}>): ExpandedEnemy[] {
  const result: ExpandedEnemy[] = [];

  for (const enemy of enemies) {
    const count = enemy.count || 1;
    const size = enemy.size || inferEnemySize(enemy);

    for (let i = 0; i < count; i++) {
      result.push({
        name: count > 1 ? `${enemy.name} ${i + 1}` : enemy.name,
        cr: enemy.cr || '0',
        size,
        hp: enemy.hitPoints || 1,
        ac: enemy.armorClass || 10,
      });
    }
  }

  return result;
}

/**
 * Select rooms for encounter placement.
 * Ensures each encounter gets a DIFFERENT room when possible.
 * Sorts rooms by size (largest first) so bigger fights get bigger rooms.
 */
function selectRoomsForEncounters(
  rooms: RoomData[],
  encounterCount: number
): RoomData[] {
  // Skip the first room (player spawn area)
  const availableRooms = rooms.slice(1);

  if (availableRooms.length === 0) {
    console.warn('[EncounterPlacement] No rooms available after skipping spawn room');
    return [];
  }

  // Prefer rooms >= 3x3 (relaxed from 4x4 to include more rooms)
  let candidates = availableRooms.filter(
    (r) => r.width >= 3 && r.height >= 3
  );

  // If not enough suitable rooms, include all rooms
  if (candidates.length < encounterCount) {
    candidates = availableRooms;
  }

  // Sort by room area (largest first) so encounters fit better
  candidates.sort((a, b) => (b.width * b.height) - (a.width * a.height));

  // If we have enough rooms, return one per encounter (no sharing)
  if (candidates.length >= encounterCount) {
    // Spread encounters across different rooms by spacing them out
    const step = Math.max(1, Math.floor(candidates.length / encounterCount));
    const selected: RoomData[] = [];
    for (let i = 0; i < encounterCount; i++) {
      const idx = Math.min(i * step, candidates.length - 1);
      // Avoid duplicates if step causes overlap
      const room = candidates[idx] && !selected.includes(candidates[idx])
        ? candidates[idx]
        : candidates.find((r) => !selected.includes(r));
      if (room) selected.push(room);
    }

    console.log(
      `[EncounterPlacement] Selected ${selected.length} unique room(s) for ${encounterCount} encounter(s) ` +
      `(from ${candidates.length} candidates, ${availableRooms.length} total rooms)`
    );
    return selected;
  }

  // Fewer rooms than encounters — return all and let round-robin handle it
  console.log(
    `[EncounterPlacement] Only ${candidates.length} room(s) for ${encounterCount} encounter(s), some will share`
  );
  return candidates;
}

/**
 * Calculate token positions for a group of enemies in a room
 */
function calculateTokenPositions(
  enemies: ExpandedEnemy[],
  room: RoomData,
  gridSize: number
): TokenPosition[] {
  const positions: TokenPosition[] = [];

  if (enemies.length === 1) {
    // Single enemy: center placement with jitter
    positions.push({
      x: (room.centerX + jitter()) * gridSize,
      y: (room.centerY + jitter()) * gridSize,
      enemy: enemies[0],
    });
  } else if (enemies.length <= 4) {
    // Circular formation for 2-4 enemies
    const radius = Math.max(room.width, room.height) * 0.25 * gridSize;

    enemies.forEach((enemy, i) => {
      const angle = (i / enemies.length) * 2 * Math.PI;
      positions.push({
        x: room.centerX * gridSize + radius * Math.cos(angle),
        y: room.centerY * gridSize + radius * Math.sin(angle),
        enemy,
      });
    });
  } else {
    // Grid formation for 5+ enemies
    const cols = Math.ceil(Math.sqrt(enemies.length));
    const maxSize = Math.max(
      ...enemies.map((e) => SIZE_TO_GRID_UNITS[e.size] || 1)
    );
    const spacing = maxSize * 1.2 * gridSize;

    enemies.forEach((enemy, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const offsetX = (col - cols / 2) * spacing;
      const offsetY =
        (row - Math.ceil(enemies.length / cols) / 2) * spacing;

      positions.push({
        x: room.centerX * gridSize + offsetX + jitter() * gridSize,
        y: room.centerY * gridSize + offsetY + jitter() * gridSize,
        enemy,
      });
    });
  }

  return positions;
}

/**
 * Create Foundry actor data from enemy, with optional token image info.
 */
function createActorFromEnemy(enemy: ExpandedEnemy, tokenInfo?: MonsterTokenInfo): {
  name: string;
  type: string;
  img?: string;
  prototypeToken?: { texture: { src: string }; width: number; height: number };
  system: Record<string, unknown>;
} {
  return {
    name: enemy.name,
    type: 'npc',
    ...(tokenInfo?.img ? { img: tokenInfo.img } : {}),
    ...(tokenInfo?.prototypeToken ? { prototypeToken: tokenInfo.prototypeToken } : {}),
    system: {
      attributes: {
        hp: {
          value: enemy.hp,
          max: enemy.hp,
        },
        ac: {
          value: enemy.ac,
        },
      },
      details: {
        cr: enemy.cr,
        type: {
          value: 'custom',
        },
      },
    },
  };
}

// ============================================================
// Main Functions
// ============================================================

/**
 * Place encounter tokens on a Foundry scene using map data directly.
 *
 * This bypasses the session-based flow entirely, reading encounters
 * from map.details.encounters and rooms from map.foundryData.rooms.
 * This is the primary path used by bulk sync.
 */
export async function placeEncounterTokensFromMap(
  map: MapEntity,
  foundrySyncService: FoundrySyncService
): Promise<EncounterTokenPlacement[]> {
  const placements: EncounterTokenPlacement[] = [];

  try {
    if (!map.foundrySceneId) {
      console.log('[EncounterPlacement] Map has no foundrySceneId, skipping');
      return placements;
    }

    const mapDetails = map.details as any;
    const encounters = mapDetails?.encounters || [];

    if (encounters.length === 0) {
      console.log(`[EncounterPlacement] No encounters in map "${map.name}"`);
      return placements;
    }

    const foundryData = map.foundryData as any;
    let rooms: RoomData[] = foundryData?.rooms || [];
    const gridSize = foundryData?.grid?.size || 100;

    // Fallback for older maps that don't have rooms stored in foundryData:
    // Create synthetic rooms from the map dimensions
    if (rooms.length === 0) {
      const sceneWidth = foundryData?.width || 3000;
      const sceneHeight = foundryData?.height || 3000;
      const gridW = Math.floor(sceneWidth / gridSize);
      const gridH = Math.floor(sceneHeight / gridSize);

      if (encounters.length <= 1) {
        // Single encounter: one room in the center
        rooms = [{
          id: 0,
          x: Math.floor(gridW * 0.25),
          y: Math.floor(gridH * 0.25),
          width: Math.floor(gridW * 0.5),
          height: Math.floor(gridH * 0.5),
          centerX: Math.floor(gridW / 2),
          centerY: Math.floor(gridH / 2),
        }];
      } else {
        // Multiple encounters: divide map into quadrants
        const halfW = Math.floor(gridW / 2);
        const halfH = Math.floor(gridH / 2);
        const quadrants = [
          { x: 2, y: 2 },
          { x: halfW + 2, y: 2 },
          { x: 2, y: halfH + 2 },
          { x: halfW + 2, y: halfH + 2 },
        ];
        rooms = quadrants.slice(0, encounters.length).map((q, i) => ({
          id: i,
          x: q.x,
          y: q.y,
          width: halfW - 4,
          height: halfH - 4,
          centerX: q.x + Math.floor((halfW - 4) / 2),
          centerY: q.y + Math.floor((halfH - 4) / 2),
        }));
      }

      console.log(
        `[EncounterPlacement] No rooms in foundryData for map "${map.name}", using ${rooms.length} fallback room(s) from map dimensions`
      );
    }

    console.log(
      `[EncounterPlacement] Processing ${encounters.length} encounter(s) in ${rooms.length} room(s) for map "${map.name}"`
    );
    console.log(
      `[EncounterPlacement] Encounter keys: ${encounters.map((e: any) => Object.keys(e).join(',')).join(' | ')}`
    );

    const selectedRooms = selectRoomsForEncounters(rooms, encounters.length);

    for (let encIdx = 0; encIdx < encounters.length; encIdx++) {
      const encounter = encounters[encIdx];

      let enemyList: Array<{
        name: string;
        count: number;
        cr?: string;
        hitPoints?: number;
        armorClass?: number;
        size?: string;
      }> = [];

      if (encounter.enemies && Array.isArray(encounter.enemies)) {
        if (typeof encounter.enemies[0] === 'string') {
          enemyList = encounter.enemies.map((name: string) => ({
            name,
            count: 1,
            cr: '0',
            hitPoints: 1,
            armorClass: 10,
          }));
        } else {
          enemyList = encounter.enemies;
        }
      }

      if (enemyList.length === 0) {
        console.log(
          `[EncounterPlacement] Encounter ${encIdx} has no enemies, skipping`
        );
        continue;
      }

      console.log(
        `[EncounterPlacement] Encounter ${encIdx}: ${enemyList.length} enemy type(s): ${enemyList.map(e => `${e.name} x${e.count}`).join(', ')}`
      );

      const expandedEnemies = expandEnemyCount(enemyList);

      // Sanity cap: a single encounter shouldn't produce more than 12 tokens
      if (expandedEnemies.length > 12) {
        console.warn(
          `[EncounterPlacement] Encounter ${encIdx} expanded to ${expandedEnemies.length} tokens, capping at 12`
        );
        expandedEnemies.length = 12;
      }
      const room = selectedRooms[encIdx % selectedRooms.length];
      console.log(
        `[EncounterPlacement] Encounter ${encIdx} "${encounter.name || ''}" → room ${room.id} ` +
        `(${room.width}x${room.height} at ${room.centerX},${room.centerY})`
      );
      const positions = calculateTokenPositions(expandedEnemies, room, gridSize);

      for (const position of positions) {
        // Resolve token image (compendium lookup -> silhouette fallback)
        const tokenInfo = await resolveMonsterToken(position.enemy, foundrySyncService);
        const actorData = createActorFromEnemy(position.enemy, tokenInfo);
        const actorResult = await foundrySyncService.createActor(actorData);

        if (actorResult.success && actorResult.data?._id) {
          placements.push({
            actorId: actorResult.data._id,
            tokenName: position.enemy.name,
            encounterIndex: encIdx,
            encounterName: encounter.name || `Encounter ${encIdx + 1}`,
            x: position.x,
            y: position.y,
            enemy: position.enemy,
            textureSrc: tokenInfo.textureSrc,
          });
          console.log(
            `[EncounterPlacement] Created actor for ${position.enemy.name} (encounter ${encIdx}) at (${Math.round(position.x)}, ${Math.round(position.y)}) img=${tokenInfo.textureSrc || 'none'}`
          );
        } else {
          console.error(
            `[EncounterPlacement] Failed to create actor for ${position.enemy.name}:`,
            actorResult.error
          );
        }
      }
    }

    console.log(
      `[EncounterPlacement] Completed placement of ${placements.length} token(s) for map "${map.name}"`
    );
  } catch (error) {
    console.error('[EncounterPlacement] Error placing tokens from map:', error);
  }

  return placements;
}

/**
 * Place encounter tokens on a Foundry scene (session-based, legacy)
 *
 * This function:
 * 1. Loads session and map data
 * 2. Expands encounter enemies by count
 * 3. Selects appropriate rooms for placement
 * 4. Calculates token positions
 * 5. Creates actors and returns placement data
 */
export async function placeEncounterTokens(
  sessionId: string,
  sceneId: string,
  foundrySyncService: FoundrySyncService
): Promise<EncounterTokenPlacement[]> {
  const placements: EncounterTokenPlacement[] = [];

  try {
    // Load session with scenario data
    const session = await sessionRepository().findOne({
      where: { id: sessionId },
    });

    if (!session?.scenario) {
      console.log('[EncounterPlacement] No scenario found for session');
      return placements;
    }

    // Get scenario encounters
    const scenario = session.scenario as any;
    const encounters = scenario.encounters || [];

    if (encounters.length === 0) {
      console.log('[EncounterPlacement] No encounters in scenario');
      return placements;
    }

    // Find the map associated with this session
    let targetMap: MapEntity | null = null;
    if (session.mapIds?.length > 0) {
      for (const mapId of session.mapIds) {
        const map = await mapRepository().findOne({
          where: { id: mapId },
        });
        if (map?.foundrySceneId === sceneId) {
          targetMap = map;
          break;
        }
      }
    }

    if (!targetMap?.foundryData) {
      console.log('[EncounterPlacement] No map with foundryData found');
      return placements;
    }

    // Extract room data from map
    const foundryData = targetMap.foundryData as any;
    const rooms: RoomData[] = foundryData.rooms || [];
    const gridSize = foundryData.grid?.size || 100;

    if (rooms.length === 0) {
      console.log('[EncounterPlacement] No rooms found in map data');
      return placements;
    }

    console.log(
      `[EncounterPlacement] Processing ${encounters.length} encounter(s) with ${rooms.length} room(s)`
    );

    // Process each encounter
    for (let encIdx = 0; encIdx < encounters.length; encIdx++) {
      const encounter = encounters[encIdx];

      // Handle both GeneratedEncounter and basic encounter formats
      let enemyList: Array<{
        name: string;
        count: number;
        cr?: string;
        hitPoints?: number;
        armorClass?: number;
        size?: string;
      }> = [];

      if (encounter.enemies && Array.isArray(encounter.enemies)) {
        if (typeof encounter.enemies[0] === 'string') {
          // Basic encounter format: enemies is string array
          enemyList = encounter.enemies.map((name: string) => ({
            name,
            count: 1,
            cr: '0',
            hitPoints: 1,
            armorClass: 10,
          }));
        } else {
          // Detailed encounter format: enemies have full data
          enemyList = encounter.enemies;
        }
      }

      if (enemyList.length === 0) {
        console.log(
          `[EncounterPlacement] Encounter ${encIdx} has no enemies, skipping`
        );
        continue;
      }

      // Expand enemies by count
      const expandedEnemies = expandEnemyCount(enemyList);

      // Select a room for this encounter (round-robin)
      const selectedRooms = selectRoomsForEncounters(
        rooms,
        encounters.length
      );
      const room = selectedRooms[encIdx % selectedRooms.length];

      // Calculate token positions
      const positions = calculateTokenPositions(
        expandedEnemies,
        room,
        gridSize
      );

      // Create actors for each enemy
      for (const position of positions) {
        const tokenInfo = await resolveMonsterToken(position.enemy, foundrySyncService);
        const actorData = createActorFromEnemy(position.enemy, tokenInfo);
        const actorResult = await foundrySyncService.createActor(actorData);

        if (actorResult.success && actorResult.data?._id) {
          placements.push({
            actorId: actorResult.data._id,
            tokenName: position.enemy.name,
            encounterIndex: encIdx,
            encounterName: encounter.name || `Encounter ${encIdx + 1}`,
            x: position.x,
            y: position.y,
            enemy: position.enemy,
            textureSrc: tokenInfo.textureSrc,
          });
          console.log(
            `[EncounterPlacement] Created actor for ${position.enemy.name} (encounter ${encIdx}) at (${Math.round(position.x)}, ${Math.round(position.y)}) img=${tokenInfo.textureSrc || 'none'}`
          );
        } else {
          console.error(
            `[EncounterPlacement] Failed to create actor for ${position.enemy.name}:`,
            actorResult.error
          );
        }
      }
    }

    console.log(
      `[EncounterPlacement] Completed placement of ${placements.length} token(s)`
    );
  } catch (error) {
    console.error('[EncounterPlacement] Error placing tokens:', error);
  }

  return placements;
}

// ============================================================
// Combat Encounter Creation
// ============================================================

/**
 * Create Foundry Combat encounters from placed tokens on a map.
 *
 * Groups placements by their encounterIndex (set during placement),
 * creates a Combat document for each encounter, and adds all
 * placed tokens as Combatants in the combat tracker.
 *
 * @param map - The map entity with foundrySceneId and encounters in details
 * @param placements - Token placements returned from placeEncounterTokensFromMap
 * @param foundrySyncService - The Foundry sync service instance
 * @returns Array of created Combat encounter references
 */
export async function createCombatEncounters(
  map: MapEntity,
  placements: EncounterTokenPlacement[],
  foundrySyncService: FoundrySyncService
): Promise<CreatedCombat[]> {
  const createdCombats: CreatedCombat[] = [];

  if (!map.foundrySceneId || placements.length === 0) {
    return createdCombats;
  }

  try {
    // Group placements by encounterIndex — this is set during placement
    // and survives even if some actors/tokens fail to create
    const encounterGroups = new globalThis.Map<number, {
      name: string;
      placements: EncounterTokenPlacement[];
    }>();

    for (const placement of placements) {
      const idx = placement.encounterIndex;
      if (!encounterGroups.has(idx)) {
        encounterGroups.set(idx, {
          name: placement.encounterName,
          placements: [],
        });
      }
      encounterGroups.get(idx)!.placements.push(placement);
    }

    console.log(
      `[EncounterPlacement] Grouped ${placements.length} placement(s) into ${encounterGroups.size} encounter(s)`
    );

    // Create a Combat for each encounter group that has placements with tokenIds
    for (const [encIdx, group] of encounterGroups) {
      const validPlacements = group.placements.filter((p) => p.tokenId && p.actorId);

      if (validPlacements.length === 0) {
        console.log(
          `[EncounterPlacement] Skipping combat for "${group.name}" (enc ${encIdx}): no placements with tokenIds`
        );
        continue;
      }

      // Create the Combat document
      const combatResult = await foundrySyncService.createCombat(map.foundrySceneId);

      if (!combatResult.success || !combatResult.data?._id) {
        console.error(
          `[EncounterPlacement] Failed to create combat for "${group.name}":`,
          combatResult.error
        );
        continue;
      }

      const combatId = combatResult.data._id;

      // Add all tokens as combatants
      const combatantData = validPlacements.map((p) => ({
        actorId: p.actorId,
        tokenId: p.tokenId!,
        sceneId: map.foundrySceneId!,
        name: p.tokenName,
      }));

      const combatantResult = await foundrySyncService.createCombatants(
        combatId,
        combatantData
      );

      if (combatantResult.success) {
        createdCombats.push({
          combatId,
          encounterName: group.name,
          combatantCount: validPlacements.length,
        });
        console.log(
          `[EncounterPlacement] Combat "${group.name}" created with ${validPlacements.length} combatant(s)`
        );
      } else {
        console.error(
          `[EncounterPlacement] Failed to add combatants to combat "${group.name}":`,
          combatantResult.error
        );
      }
    }

    console.log(
      `[EncounterPlacement] Created ${createdCombats.length} combat encounter(s) for map "${map.name}"`
    );
  } catch (error) {
    console.error('[EncounterPlacement] Error creating combat encounters:', error);
  }

  return createdCombats;
}
