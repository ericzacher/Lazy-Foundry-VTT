import { AppDataSource } from '../config/database';
import { Session } from '../entities/Session';
import { Map } from '../entities/Map';
import { FoundrySyncService } from './foundrySync';
import { GeneratedEncounter } from './ai';

const sessionRepository = () => AppDataSource.getRepository(Session);
const mapRepository = () => AppDataSource.getRepository(Map);

// Size to grid units mapping
const SIZE_TO_GRID_UNITS: Record<string, number> = {
  tiny: 0.5,
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
  tokenName: string;
  x: number;
  y: number;
  enemy: ExpandedEnemy;
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
 * Select rooms for encounter placement
 * Filters rooms by minimum size and sorts by distance from origin
 */
function selectRoomsForEncounters(
  rooms: RoomData[],
  encounterCount: number
): RoomData[] {
  // Skip the first room (player spawn area)
  const availableRooms = rooms.slice(1);

  // Filter rooms by minimum size (4x4 grid units)
  const suitable = availableRooms.filter(
    (r) => r.width >= 4 && r.height >= 4
  );

  if (suitable.length === 0) {
    // Fallback to all available rooms if none are large enough
    return availableRooms.slice(0, encounterCount);
  }

  // Sort by distance from origin (furthest first for enemy placement)
  const sorted = suitable.sort((a, b) => {
    const distA = Math.sqrt(a.centerX ** 2 + a.centerY ** 2);
    const distB = Math.sqrt(b.centerX ** 2 + b.centerY ** 2);
    return distB - distA;
  });

  return sorted.slice(0, Math.min(sorted.length, encounterCount));
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
 * Create Foundry actor data from enemy
 */
function createActorFromEnemy(enemy: ExpandedEnemy): {
  name: string;
  type: string;
  system: Record<string, unknown>;
} {
  return {
    name: enemy.name,
    type: 'npc',
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
  map: Map,
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
      const positions = calculateTokenPositions(expandedEnemies, room, gridSize);

      for (const position of positions) {
        const actorData = createActorFromEnemy(position.enemy);
        const actorResult = await foundrySyncService.createActor(actorData);

        if (actorResult.success && actorResult.data?._id) {
          placements.push({
            actorId: actorResult.data._id,
            tokenName: position.enemy.name,
            x: position.x,
            y: position.y,
            enemy: position.enemy,
          });
          console.log(
            `[EncounterPlacement] Created actor for ${position.enemy.name} at (${Math.round(position.x)}, ${Math.round(position.y)})`
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
    let targetMap: Map | null = null;
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
        const actorData = createActorFromEnemy(position.enemy);
        const actorResult = await foundrySyncService.createActor(actorData);

        if (actorResult.success && actorResult.data?._id) {
          placements.push({
            actorId: actorResult.data._id,
            tokenName: position.enemy.name,
            x: position.x,
            y: position.y,
            enemy: position.enemy,
          });
          console.log(
            `[EncounterPlacement] Created actor for ${position.enemy.name} at (${Math.round(position.x)}, ${Math.round(position.y)})`
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
