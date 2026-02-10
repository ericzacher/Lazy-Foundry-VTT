/**
 * Procedural Map Generator - Foundry VTT Compatible
 * 
 * Uses rot-js for dungeon/cave generation and sharp for PNG rendering.
 * Produces Foundry VTT-compatible scene data including walls, lights, and doors.
 */
import * as ROT from 'rot-js';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

// ============================================================
// Foundry VTT Data Types
// ============================================================

export interface FoundryWall {
  c: [number, number, number, number]; // [x0, y0, x1, y1] in pixels
  move: number;   // 0=none, 1=normal
  sense: number;  // 0=none, 1=normal (blocks vision)
  sound: number;  // 0=none, 1=normal
  door: number;   // 0=none, 1=door, 2=secret
  ds: number;     // 0=closed, 1=open, 2=locked
  dir: number;    // 0=both directions
  light: number;  // 0=none, 1=normal (blocks light)
}

export interface FoundryLight {
  x: number;      // x position in pixels
  y: number;      // y position in pixels
  config: {
    dim: number;      // dim light radius in grid units
    bright: number;   // bright light radius in grid units
    angle: number;    // emission angle (360 = full circle)
    color: string;    // hex color e.g. "#ff9329"
    alpha: number;    // color intensity 0-1
    animation: {
      type: string;   // "torch", "pulse", "flickering", etc.
      speed: number;  // 1-10
      intensity: number; // 1-10
    };
  };
  rotation: number;
  hidden: boolean;
}

export interface FoundrySceneData {
  name: string;
  width: number;       // total scene width in pixels
  height: number;      // total scene height in pixels
  grid: {
    type: number;      // 1 = square grid
    size: number;      // grid size in pixels (e.g. 100)
    color: string;     // grid line color
    alpha: number;     // grid line opacity
  };
  backgroundColor: string;
  tokenVision: boolean;
  fog: {
    exploration: boolean;
  };
  walls: FoundryWall[];
  lights: FoundryLight[];
  padding: number;
}

// ============================================================
// Internal Types
// ============================================================

interface RoomData {
  id: number;
  x: number;      // grid x of top-left
  y: number;      // grid y of top-left
  width: number;  // width in grid cells
  height: number; // height in grid cells
  centerX: number;
  centerY: number;
}

interface DoorData {
  x: number;  // grid x
  y: number;  // grid y
}

export interface GeneratedMap {
  imageBuffer: Buffer;
  fileName: string;
  foundryScene: FoundrySceneData;
  rooms: RoomData[];
  gridWidth: number;
  gridHeight: number;
  gridSize: number;
}

// ============================================================
// Color Palette
// ============================================================

const COLORS = {
  wall: { r: 40, g: 36, b: 32 },       // dark stone
  floor: { r: 180, g: 160, b: 130 },    // sandy stone
  corridor: { r: 160, g: 140, b: 110 }, // slightly darker stone
  door: { r: 139, g: 90, b: 43 },       // wood brown
  grid: { r: 100, g: 90, b: 80 },       // subtle grid lines
  roomHighlight: { r: 200, g: 180, b: 150 }, // lighter room center
};

// ============================================================
// Main Generation Functions
// ============================================================

export async function generateDungeonMap(
  gridWidth: number = 40,
  gridHeight: number = 30,
  gridSize: number = 100,
  mapName: string = 'Generated Dungeon'
): Promise<GeneratedMap> {
  // Generate dungeon layout with rot-js Digger
  const digger = new ROT.Map.Digger(gridWidth, gridHeight, {
    roomWidth: [4, 9],
    roomHeight: [3, 6],
    corridorLength: [2, 6],
    dugPercentage: 0.4,
  });

  const tileMap: number[][] = Array.from({ length: gridHeight }, () =>
    Array(gridWidth).fill(0) // 0 = wall
  );

  digger.create((x, y, value) => {
    // rot-js: 0 = floor, 1 = wall (inverted from our convention)
    tileMap[y][x] = value === 0 ? 1 : 0; // 1 = floor for us
  });

  // Extract rooms from the digger
  const rotRooms = digger.getRooms();
  const rooms: RoomData[] = rotRooms.map((room, idx) => ({
    id: idx,
    x: room.getLeft(),
    y: room.getTop(),
    width: room.getRight() - room.getLeft() + 1,
    height: room.getBottom() - room.getTop() + 1,
    centerX: Math.floor((room.getLeft() + room.getRight()) / 2),
    centerY: Math.floor((room.getTop() + room.getBottom()) / 2),
  }));

  // Find doors from corridors connecting rooms
  const doors: DoorData[] = [];
  for (const room of rotRooms) {
    room.getDoors((x, y) => {
      // Check if this door position hasn't been added yet
      if (!doors.some(d => d.x === x && d.y === y)) {
        doors.push({ x, y });
      }
    });
  }

  // Generate Foundry VTT data
  const foundryScene = buildFoundryScene(tileMap, doors, rooms, gridWidth, gridHeight, gridSize, mapName);

  // Render PNG image
  const imageBuffer = await renderMapImage(tileMap, doors, rooms, gridWidth, gridHeight, gridSize);

  return {
    imageBuffer,
    fileName: `${Date.now()}-dungeon.png`,
    foundryScene,
    rooms,
    gridWidth,
    gridHeight,
    gridSize,
  };
}

export async function generateCaveMap(
  gridWidth: number = 40,
  gridHeight: number = 30,
  gridSize: number = 100,
  mapName: string = 'Generated Cave'
): Promise<GeneratedMap> {
  // Use Cellular automaton for cave-like maps
  const cellular = new ROT.Map.Cellular(gridWidth, gridHeight, {
    born: [5, 6, 7, 8],
    survive: [4, 5, 6, 7, 8],
  });

  cellular.randomize(0.48);

  // Run several generations for smoother caves
  for (let i = 0; i < 4; i++) {
    cellular.create();
  }

  const tileMap: number[][] = Array.from({ length: gridHeight }, () =>
    Array(gridWidth).fill(0)
  );

  cellular.create((x, y, value) => {
    tileMap[y][x] = value; // 1 = floor, 0 = wall (matches our convention)
  });

  // Ensure edges are always walls
  for (let x = 0; x < gridWidth; x++) {
    tileMap[0][x] = 0;
    tileMap[gridHeight - 1][x] = 0;
  }
  for (let y = 0; y < gridHeight; y++) {
    tileMap[y][0] = 0;
    tileMap[y][gridWidth - 1] = 0;
  }

  // Find cave "rooms" by flood-filling connected floor areas
  const rooms = findCaveRooms(tileMap, gridWidth, gridHeight);
  const doors: DoorData[] = []; // Caves typically don't have doors

  const foundryScene = buildFoundryScene(tileMap, doors, rooms, gridWidth, gridHeight, gridSize, mapName);
  const imageBuffer = await renderMapImage(tileMap, doors, rooms, gridWidth, gridHeight, gridSize);

  return {
    imageBuffer,
    fileName: `${Date.now()}-cave.png`,
    foundryScene,
    rooms,
    gridWidth,
    gridHeight,
    gridSize,
  };
}

/**
 * Choose the right generator based on map type
 */
export async function generateMap(
  mapType: string,
  gridWidth: number = 40,
  gridHeight: number = 30,
  gridSize: number = 100,
  mapName: string = 'Generated Map'
): Promise<GeneratedMap> {
  // Validate and cap dimensions to prevent memory issues
  const maxDimension = 80;
  const safeWidth = Math.min(Math.max(gridWidth, 20), maxDimension);
  const safeHeight = Math.min(Math.max(gridHeight, 20), maxDimension);

  switch (mapType.toLowerCase()) {
    case 'cave':
    case 'wilderness':
      return generateCaveMap(safeWidth, safeHeight, gridSize, mapName);
    
    case 'dungeon':
    case 'castle':
    case 'tavern':
    case 'building':
      return generateDungeonMap(safeWidth, safeHeight, gridSize, mapName);
    
    case 'town':
    case 'city':
      // Towns and cities use dungeon generator but with more rooms
      return generateDungeonMap(safeWidth, safeHeight, gridSize, mapName);
    
    case 'other':
    default:
      // Default to dungeon for unknown types
      return generateDungeonMap(safeWidth, safeHeight, gridSize, mapName);
  }
}

// ============================================================
// Foundry Scene Builder
// ============================================================

function buildFoundryScene(
  tileMap: number[][],
  doors: DoorData[],
  rooms: RoomData[],
  gridWidth: number,
  gridHeight: number,
  gridSize: number,
  name: string
): FoundrySceneData {
  const pixelWidth = gridWidth * gridSize;
  const pixelHeight = gridHeight * gridSize;

  const walls = generateWalls(tileMap, doors, gridWidth, gridHeight, gridSize);
  const lights = generateLights(rooms, gridSize);

  return {
    name,
    width: pixelWidth,
    height: pixelHeight,
    grid: {
      type: 1,         // Square grid
      size: gridSize,
      color: '#000000',
      alpha: 0.2,
    },
    backgroundColor: '#222222',
    tokenVision: true,
    fog: {
      exploration: true,
    },
    walls,
    lights,
    padding: 0,
  };
}

// ============================================================
// Wall Generation (Foundry VTT compatible)
// ============================================================

function generateWalls(
  tileMap: number[][],
  doors: DoorData[],
  gridWidth: number,
  gridHeight: number,
  gridSize: number
): FoundryWall[] {
  const walls: FoundryWall[] = [];
  const doorSet = new Set(doors.map(d => `${d.x},${d.y}`));

  // Track which edges we've already added walls for to avoid duplicates
  const addedEdges = new Set<string>();

  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      if (tileMap[y][x] !== 1) continue; // Only process floor tiles

      // Check all 4 edges of this floor tile for adjacent walls
      const edges: Array<{
        x1: number; y1: number; x2: number; y2: number;
        neighborX: number; neighborY: number;
      }> = [
        // Top edge
        { x1: x, y1: y, x2: x + 1, y2: y, neighborX: x, neighborY: y - 1 },
        // Bottom edge
        { x1: x, y1: y + 1, x2: x + 1, y2: y + 1, neighborX: x, neighborY: y + 1 },
        // Left edge
        { x1: x, y1: y, x2: x, y2: y + 1, neighborX: x - 1, neighborY: y },
        // Right edge
        { x1: x + 1, y1: y, x2: x + 1, y2: y + 1, neighborX: x + 1, neighborY: y },
      ];

      for (const edge of edges) {
        const isOutOfBounds =
          edge.neighborX < 0 || edge.neighborX >= gridWidth ||
          edge.neighborY < 0 || edge.neighborY >= gridHeight;
        
        const neighborIsWall = isOutOfBounds || tileMap[edge.neighborY][edge.neighborX] === 0;
        
        if (!neighborIsWall) continue;

        // Create an edge key to prevent duplicates
        const edgeKey = [
          Math.min(edge.x1, edge.x2), Math.min(edge.y1, edge.y2),
          Math.max(edge.x1, edge.x2), Math.max(edge.y1, edge.y2)
        ].join(',');

        if (addedEdges.has(edgeKey)) continue;
        addedEdges.add(edgeKey);

        // Check if this edge is near a door position
        const isDoor = doorSet.has(`${edge.neighborX},${edge.neighborY}`) ||
                       doorSet.has(`${x},${y}`);

        const pixelCoords: [number, number, number, number] = [
          edge.x1 * gridSize,
          edge.y1 * gridSize,
          edge.x2 * gridSize,
          edge.y2 * gridSize,
        ];

        walls.push({
          c: pixelCoords,
          move: 1,                // Blocks movement
          sense: isDoor ? 0 : 1,  // Doors don't block vision when open concept
          sound: 1,
          door: isDoor ? 1 : 0,   // 1 = door
          ds: isDoor ? 0 : 0,     // 0 = closed
          dir: 0,                 // Both directions
          light: isDoor ? 0 : 1,  // Doors don't block light
        });
      }
    }
  }

  // Merge collinear wall segments for cleaner data
  return mergeWalls(walls);
}

/**
 * Merge consecutive collinear wall segments of the same type to reduce wall count
 */
function mergeWalls(walls: FoundryWall[]): FoundryWall[] {
  // Separate doors from regular walls (don't merge doors)
  const doorWalls = walls.filter(w => w.door > 0);
  const regularWalls = walls.filter(w => w.door === 0);

  // Group walls by orientation and alignment
  const horizontal = regularWalls.filter(w => w.c[1] === w.c[3]); // same y
  const vertical = regularWalls.filter(w => w.c[0] === w.c[2]);   // same x

  const mergedHorizontal = mergeAligned(horizontal, 'horizontal');
  const mergedVertical = mergeAligned(vertical, 'vertical');

  return [...mergedHorizontal, ...mergedVertical, ...doorWalls];
}

function mergeAligned(walls: FoundryWall[], direction: 'horizontal' | 'vertical'): FoundryWall[] {
  if (walls.length === 0) return [];

  // Group by the shared coordinate
  const groups = new Map<number, FoundryWall[]>();
  for (const wall of walls) {
    const key = direction === 'horizontal' ? wall.c[1] : wall.c[0];
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(wall);
  }

  const merged: FoundryWall[] = [];

  for (const [, group] of groups) {
    // Sort by the varying coordinate
    const sorted = group.sort((a, b) => {
      if (direction === 'horizontal') return a.c[0] - b.c[0];
      return a.c[1] - b.c[1];
    });

    let current = { ...sorted[0], c: [...sorted[0].c] as [number, number, number, number] };

    for (let i = 1; i < sorted.length; i++) {
      const next = sorted[i];
      const canMerge = direction === 'horizontal'
        ? current.c[2] === next.c[0] && current.c[3] === next.c[1]
        : current.c[3] === next.c[1] && current.c[2] === next.c[0];

      if (canMerge && current.move === next.move && current.sense === next.sense) {
        // Extend current wall
        current.c[2] = next.c[2];
        current.c[3] = next.c[3];
      } else {
        merged.push(current);
        current = { ...next, c: [...next.c] as [number, number, number, number] };
      }
    }
    merged.push(current);
  }

  return merged;
}

// ============================================================
// Light Generation (Foundry VTT compatible)
// ============================================================

function generateLights(rooms: RoomData[], gridSize: number): FoundryLight[] {
  const lights: FoundryLight[] = [];

  for (const room of rooms) {
    // Place a torch light at the center of each room
    const centerPixelX = (room.centerX + 0.5) * gridSize;
    const centerPixelY = (room.centerY + 0.5) * gridSize;

    // Radius based on room size
    const roomRadius = Math.max(room.width, room.height);
    const dimRadius = Math.min(roomRadius, 8);
    const brightRadius = Math.max(Math.floor(dimRadius / 2), 2);

    lights.push({
      x: centerPixelX,
      y: centerPixelY,
      config: {
        dim: dimRadius,
        bright: brightRadius,
        angle: 360,
        color: '#ff9329',   // warm torch color
        alpha: 0.4,
        animation: {
          type: 'torch',
          speed: 5,
          intensity: 5,
        },
      },
      rotation: 0,
      hidden: false,
    });

    // For larger rooms, add corner torches
    if (room.width >= 6 && room.height >= 5) {
      const corners = [
        { x: room.x + 1, y: room.y + 1 },
        { x: room.x + room.width - 2, y: room.y + 1 },
        { x: room.x + 1, y: room.y + room.height - 2 },
        { x: room.x + room.width - 2, y: room.y + room.height - 2 },
      ];

      for (const corner of corners) {
        lights.push({
          x: (corner.x + 0.5) * gridSize,
          y: (corner.y + 0.5) * gridSize,
          config: {
            dim: 4,
            bright: 2,
            angle: 360,
            color: '#ff9329',
            alpha: 0.3,
            animation: {
              type: 'torch',
              speed: 4,
              intensity: 4,
            },
          },
          rotation: 0,
          hidden: false,
        });
      }
    }
  }

  return lights;
}

// ============================================================
// Cave Room Detection
// ============================================================

function findCaveRooms(tileMap: number[][], gridWidth: number, gridHeight: number): RoomData[] {
  const visited: boolean[][] = Array.from({ length: gridHeight }, () =>
    Array(gridWidth).fill(false)
  );
  const rooms: RoomData[] = [];
  let roomId = 0;

  for (let y = 1; y < gridHeight - 1; y++) {
    for (let x = 1; x < gridWidth - 1; x++) {
      if (tileMap[y][x] === 1 && !visited[y][x]) {
        // BFS flood fill to find connected floor area
        const cells: Array<{ x: number; y: number }> = [];
        const queue: Array<{ x: number; y: number }> = [{ x, y }];
        visited[y][x] = true;

        while (queue.length > 0) {
          const cell = queue.shift()!;
          cells.push(cell);

          const neighbors = [
            { x: cell.x - 1, y: cell.y },
            { x: cell.x + 1, y: cell.y },
            { x: cell.x, y: cell.y - 1 },
            { x: cell.x, y: cell.y + 1 },
          ];

          for (const n of neighbors) {
            if (
              n.x >= 0 && n.x < gridWidth &&
              n.y >= 0 && n.y < gridHeight &&
              !visited[n.y][n.x] &&
              tileMap[n.y][n.x] === 1
            ) {
              visited[n.y][n.x] = true;
              queue.push(n);
            }
          }
        }

        // Only consider clusters of at least 6 cells as "rooms"
        if (cells.length >= 6) {
          const minX = Math.min(...cells.map(c => c.x));
          const maxX = Math.max(...cells.map(c => c.x));
          const minY = Math.min(...cells.map(c => c.y));
          const maxY = Math.max(...cells.map(c => c.y));

          rooms.push({
            id: roomId++,
            x: minX,
            y: minY,
            width: maxX - minX + 1,
            height: maxY - minY + 1,
            centerX: Math.floor((minX + maxX) / 2),
            centerY: Math.floor((minY + maxY) / 2),
          });
        }
      }
    }
  }

  return rooms;
}

// ============================================================
// PNG Image Rendering
// ============================================================

async function renderMapImage(
  tileMap: number[][],
  doors: DoorData[],
  rooms: RoomData[],
  gridWidth: number,
  gridHeight: number,
  gridSize: number
): Promise<Buffer> {
  const pixelWidth = gridWidth * gridSize;
  const pixelHeight = gridHeight * gridSize;

  // Create raw pixel buffer (RGBA)
  const channels = 4;
  const data = Buffer.alloc(pixelWidth * pixelHeight * channels);

  const doorSet = new Set(doors.map(d => `${d.x},${d.y}`));

  // Determine which room each floor tile belongs to (for slight color variation)
  const roomMap = new Map<string, number>();
  for (const room of rooms) {
    for (let ry = room.y; ry < room.y + room.height; ry++) {
      for (let rx = room.x; rx < room.x + room.width; rx++) {
        roomMap.set(`${rx},${ry}`, room.id);
      }
    }
  }

  // Fill each grid cell
  for (let gy = 0; gy < gridHeight; gy++) {
    for (let gx = 0; gx < gridWidth; gx++) {
      const isFloor = tileMap[gy][gx] === 1;
      const isDoor = doorSet.has(`${gx},${gy}`);
      const inRoom = roomMap.has(`${gx},${gy}`);

      let color: { r: number; g: number; b: number };
      if (isDoor) {
        color = COLORS.door;
      } else if (isFloor && inRoom) {
        color = COLORS.floor;
      } else if (isFloor) {
        color = COLORS.corridor;
      } else {
        color = COLORS.wall;
      }

      // Add subtle noise for texture
      const noise = Math.floor(Math.random() * 12) - 6;

      // Fill the grid cell pixels
      for (let py = 0; py < gridSize; py++) {
        for (let px = 0; px < gridSize; px++) {
          const pixelX = gx * gridSize + px;
          const pixelY = gy * gridSize + py;
          const idx = (pixelY * pixelWidth + pixelX) * channels;

          // Draw grid lines (1px border on bottom and right of each cell, only for floor)
          const isGridLine = isFloor && (px === gridSize - 1 || py === gridSize - 1);

          if (isGridLine) {
            data[idx + 0] = COLORS.grid.r;
            data[idx + 1] = COLORS.grid.g;
            data[idx + 2] = COLORS.grid.b;
            data[idx + 3] = 255;
          } else {
            data[idx + 0] = Math.max(0, Math.min(255, color.r + noise));
            data[idx + 1] = Math.max(0, Math.min(255, color.g + noise));
            data[idx + 2] = Math.max(0, Math.min(255, color.b + noise));
            data[idx + 3] = 255;
          }
        }
      }
    }
  }

  // Use sharp to create PNG from raw buffer
  const image = await sharp(data, {
    raw: {
      width: pixelWidth,
      height: pixelHeight,
      channels: channels as 4,
    },
  })
    .png({ compressionLevel: 6 })
    .toBuffer();

  return image;
}

// ============================================================
// File Save Utility
// ============================================================

export async function saveMapImage(
  imageBuffer: Buffer,
  mapId: string,
  fileName: string
): Promise<string> {
  const assetsDir = path.resolve('/app/assets/maps');

  // Ensure directory exists
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  const finalFileName = `${mapId}-${fileName}`;
  const filePath = path.join(assetsDir, finalFileName);

  await fs.promises.writeFile(filePath, imageBuffer);

  // Return the URL path for serving
  return `/api/assets/maps/${finalFileName}`;
}
