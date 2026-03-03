import { Map as MapEntity } from '../entities/Map';
import { FoundrySyncService } from './foundrySync';

// ============================================================
// Types
// ============================================================

interface POIData {
  name: string;
  description: string;
  type: string;
  location?: string;
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

interface AIRoom {
  name: string;
  description: string;
  features: string[];
  connections: string[];
}

interface POIPlacement {
  poi: POIData;
  room: RoomData;
  x: number;
  y: number;
}

// ============================================================
// POI Type → Icon Color
// ============================================================

const POI_TYPE_COLORS: Record<string, string> = {
  treasure: '#FFD700',
  hazard: '#FF4444',
  landmark: '#4488FF',
  secret: '#AA44FF',
  quest: '#44FF44',
  trap: '#FF8800',
  npc: '#44DDFF',
  location: '#4488FF',
};

function getPOIIconColor(type: string): string {
  const normalized = type.toLowerCase().trim();
  return POI_TYPE_COLORS[normalized] || '#FFFFFF';
}

// ============================================================
// Room Assignment
// ============================================================

/**
 * Match POIs to procedural rooms.
 *
 * Strategy:
 * 1. Match poi.location to an AI room name (case-insensitive) → use same index into gridRooms
 * 2. Fallback: round-robin across available rooms (skip first/spawn room)
 */
function assignPOIsToRooms(
  pois: POIData[],
  aiRooms: AIRoom[],
  gridRooms: RoomData[],
  gridSize: number
): POIPlacement[] {
  const placements: POIPlacement[] = [];

  // Available rooms for fallback (skip first room = spawn)
  const fallbackRooms = gridRooms.length > 1 ? gridRooms.slice(1) : gridRooms;
  let fallbackIdx = 0;

  for (const poi of pois) {
    let room: RoomData | undefined;

    // Try name-based match via AI room index
    if (poi.location) {
      const locationLower = poi.location.toLowerCase().trim();
      const aiIndex = aiRooms.findIndex((r) => {
        const roomNameLower = r.name.toLowerCase().trim();
        return (
          roomNameLower === locationLower ||
          roomNameLower.includes(locationLower) ||
          locationLower.includes(roomNameLower)
        );
      });

      if (aiIndex >= 0 && aiIndex < gridRooms.length) {
        room = gridRooms[aiIndex];
      }
    }

    // Fallback: round-robin
    if (!room && fallbackRooms.length > 0) {
      room = fallbackRooms[fallbackIdx % fallbackRooms.length];
      fallbackIdx++;
    }

    if (!room) continue;

    // Offset slightly from center to avoid overlapping encounter tokens
    const x = (room.centerX + 0.3) * gridSize;
    const y = (room.centerY + 0.3) * gridSize;

    placements.push({ poi, room, x, y });
  }

  return placements;
}

// ============================================================
// Journal HTML Builder
// ============================================================

function buildPOIJournalContent(poi: POIData): string {
  const typeLabel = poi.type.charAt(0).toUpperCase() + poi.type.slice(1);
  const paragraphs = poi.description
    .split('\n')
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join('');

  return `
    <h1>${poi.name}</h1>
    <p><strong>Type:</strong> ${typeLabel}</p>
    ${poi.location ? `<p><strong>Location:</strong> ${poi.location}</p>` : ''}
    <hr>
    ${paragraphs || `<p>${poi.description}</p>`}
  `.trim();
}

// ============================================================
// Main Function
// ============================================================

/**
 * Place POI notes on a Foundry scene.
 *
 * For each POI:
 * 1. Create a JournalEntry with rich HTML description
 * 2. Create a Note (map pin) on the scene linked to that JournalEntry
 */
export async function placePOINotesOnScene(
  map: MapEntity,
  foundrySyncService: FoundrySyncService
): Promise<{ journalIds: string[]; noteIds: string[] }> {
  const journalIds: string[] = [];
  const noteIds: string[] = [];

  if (!map.foundrySceneId) {
    console.log('[POIPlacement] Map has no foundrySceneId, skipping');
    return { journalIds, noteIds };
  }

  const mapDetails = map.details as any;
  const pois: POIData[] = mapDetails?.pointsOfInterest || [];

  if (pois.length === 0) {
    console.log(`[POIPlacement] No POIs in map "${map.name}"`);
    return { journalIds, noteIds };
  }

  const foundryData = map.foundryData as any;
  const gridRooms: RoomData[] = foundryData?.rooms || [];
  const gridSize: number = foundryData?.grid?.size || 100;
  const aiRooms: AIRoom[] = mapDetails?.rooms || [];

  if (gridRooms.length === 0) {
    console.warn(`[POIPlacement] No rooms in foundryData for map "${map.name}", skipping POI placement`);
    return { journalIds, noteIds };
  }

  const placements = assignPOIsToRooms(pois, aiRooms, gridRooms, gridSize);

  console.log(
    `[POIPlacement] Placing ${placements.length} POI(s) on map "${map.name}" (${gridRooms.length} rooms available)`
  );

  for (const placement of placements) {
    try {
      // Create JournalEntry
      const journalResult = await foundrySyncService.createJournalEntry({
        name: placement.poi.name,
        content: buildPOIJournalContent(placement.poi),
      });

      if (!journalResult.success || !journalResult.data?._id) {
        console.warn(`[POIPlacement] Failed to create journal for POI "${placement.poi.name}": ${journalResult.error}`);
        continue;
      }

      journalIds.push(journalResult.data._id);

      // Create Note (map pin) on scene
      const noteResult = await foundrySyncService.createNote(map.foundrySceneId, {
        entryId: journalResult.data._id,
        x: Math.round(placement.x),
        y: Math.round(placement.y),
        text: placement.poi.name,
        fontSize: 24,
        textColor: '#FFFFFF',
        textAnchor: 1,
        iconSize: 40,
        iconColor: getPOIIconColor(placement.poi.type),
      });

      if (noteResult.success && noteResult.data?._id) {
        noteIds.push(noteResult.data._id);
        console.log(
          `[POIPlacement] Placed "${placement.poi.name}" (${placement.poi.type}) at (${Math.round(placement.x)}, ${Math.round(placement.y)}) in room ${placement.room.id}`
        );
      } else {
        console.warn(`[POIPlacement] Failed to create note for POI "${placement.poi.name}": ${noteResult.error}`);
      }
    } catch (error) {
      console.error(`[POIPlacement] Error placing POI "${placement.poi.name}":`, error);
    }
  }

  console.log(
    `[POIPlacement] Done: ${noteIds.length}/${pois.length} POI(s) placed on map "${map.name}"`
  );

  return { journalIds, noteIds };
}
