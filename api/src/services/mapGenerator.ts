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
// Color Palettes
// ============================================================

const COLORS = {
  wall: { r: 40, g: 36, b: 32 },       // dark stone
  floor: { r: 180, g: 160, b: 130 },    // sandy stone
  corridor: { r: 160, g: 140, b: 110 }, // slightly darker stone
  door: { r: 139, g: 90, b: 43 },       // wood brown
  grid: { r: 100, g: 90, b: 80 },       // subtle grid lines
  roomHighlight: { r: 200, g: 180, b: 150 }, // lighter room center
};

const CITY_COLORS = {
  street: { r: 160, g: 155, b: 140 },      // cobblestone grey
  building: { r: 90, g: 70, b: 55 },       // dark wood/stone walls
  buildingFloor: { r: 190, g: 170, b: 140 },// indoor floor
  plaza: { r: 195, g: 185, b: 160 },       // lighter open area
  grass: { r: 90, g: 130, b: 65 },         // park / garden patches
  water: { r: 70, g: 120, b: 160 },        // fountain / pond
  market: { r: 175, g: 145, b: 100 },      // market stall area
  door: { r: 139, g: 90, b: 43 },          // wood brown
  grid: { r: 120, g: 115, b: 105 },        // subtle grid lines
};

const BUILDING_COLORS = {
  wall: { r: 70, g: 55, b: 42 },           // timber frame
  floor: { r: 200, g: 180, b: 145 },       // wooden planks
  corridor: { r: 175, g: 160, b: 130 },    // hallway
  door: { r: 139, g: 90, b: 43 },          // wood door
  furniture: { r: 120, g: 85, b: 55 },     // furniture brown
  grid: { r: 110, g: 100, b: 85 },         // subtle grid lines
  rug: { r: 140, g: 50, b: 50 },           // decorative rug
  hearth: { r: 180, g: 80, b: 30 },        // fireplace glow
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
    
    case 'town':
    case 'city':
      return generateCityMap(safeWidth, safeHeight, gridSize, mapName);
    
    case 'building':
    case 'tavern':
      return generateBuildingMap(safeWidth, safeHeight, gridSize, mapName);

    case 'dungeon':
    case 'castle':
      return generateDungeonMap(safeWidth, safeHeight, gridSize, mapName);
    
    case 'other':
    default:
      return generateDungeonMap(safeWidth, safeHeight, gridSize, mapName);
  }
}

// ============================================================
// City / Town Map Generator
// ============================================================

/**
 * Generates a top-down city/town map with buildings, streets, and plazas.
 * Buildings are solid blocks with walls; streets are open passable terrain.
 */
export async function generateCityMap(
  gridWidth: number = 40,
  gridHeight: number = 30,
  gridSize: number = 100,
  mapName: string = 'Generated City'
): Promise<GeneratedMap> {
  // City tile types: 0=building(wall), 1=street(floor), 2=plaza, 3=grass, 4=water, 5=market
  const tileMap: number[][] = Array.from({ length: gridHeight }, () =>
    Array(gridWidth).fill(1) // Start with all streets
  );

  const rooms: RoomData[] = [];
  const doors: DoorData[] = [];
  let roomId = 0;

  // Step 1: Lay down main roads (horizontal and vertical arteries)
  const mainRoadH = Math.floor(gridHeight / 2) + Math.floor(Math.random() * 3) - 1;
  const mainRoadV = Math.floor(gridWidth / 2) + Math.floor(Math.random() * 3) - 1;

  // Step 2: Create a grid of city blocks separated by streets
  const streetWidth = 2;
  const minBlockSize = 5;
  const maxBlockSize = 9;

  // Generate variable-sized city blocks
  const blockStartsX: number[] = [0];
  let cx = streetWidth; // Start after left edge street
  while (cx < gridWidth - minBlockSize) {
    const blockW = minBlockSize + Math.floor(Math.random() * (maxBlockSize - minBlockSize + 1));
    if (cx + blockW + streetWidth >= gridWidth) break;
    blockStartsX.push(cx);
    cx += blockW + streetWidth;
  }

  const blockStartsY: number[] = [0];
  let cy = streetWidth;
  while (cy < gridHeight - minBlockSize) {
    const blockH = minBlockSize + Math.floor(Math.random() * (maxBlockSize - minBlockSize + 1));
    if (cy + blockH + streetWidth >= gridHeight) break;
    blockStartsY.push(cy);
    cy += blockH + streetWidth;
  }

  // Fill in building blocks
  for (let bi = 1; bi < blockStartsX.length; bi++) {
    for (let bj = 1; bj < blockStartsY.length; bj++) {
      const bx = blockStartsX[bi];
      const by = blockStartsY[bj];
      const nextBx = bi + 1 < blockStartsX.length ? blockStartsX[bi + 1] - streetWidth : gridWidth - streetWidth;
      const nextBy = bj + 1 < blockStartsY.length ? blockStartsY[bj + 1] - streetWidth : gridHeight - streetWidth;
      const bw = Math.min(nextBx - bx, maxBlockSize);
      const bh = Math.min(nextBy - by, maxBlockSize);

      if (bw < 3 || bh < 3) continue;

      // Randomly decide what this block is
      const roll = Math.random();
      if (roll < 0.1 && bw >= 4 && bh >= 4) {
        // Plaza / town square
        for (let py = by; py < by + bh && py < gridHeight; py++) {
          for (let px = bx; px < bx + bw && px < gridWidth; px++) {
            tileMap[py][px] = 2; // plaza
          }
        }
        // Maybe add a fountain (water) in center
        if (bw >= 5 && bh >= 5 && Math.random() < 0.6) {
          const fcx = bx + Math.floor(bw / 2);
          const fcy = by + Math.floor(bh / 2);
          if (fcx < gridWidth && fcy < gridHeight) tileMap[fcy][fcx] = 4; // water
          if (fcx + 1 < gridWidth && fcy < gridHeight) tileMap[fcy][fcx + 1] = 4;
          if (fcx < gridWidth && fcy + 1 < gridHeight) tileMap[fcy + 1][fcx] = 4;
          if (fcx + 1 < gridWidth && fcy + 1 < gridHeight) tileMap[fcy + 1][fcx + 1] = 4;
        }
        rooms.push({
          id: roomId++, x: bx, y: by, width: bw, height: bh,
          centerX: bx + Math.floor(bw / 2), centerY: by + Math.floor(bh / 2),
        });
      } else if (roll < 0.18) {
        // Park / garden
        for (let py = by; py < by + bh && py < gridHeight; py++) {
          for (let px = bx; px < bx + bw && px < gridWidth; px++) {
            tileMap[py][px] = 3; // grass
          }
        }
        rooms.push({
          id: roomId++, x: bx, y: by, width: bw, height: bh,
          centerX: bx + Math.floor(bw / 2), centerY: by + Math.floor(bh / 2),
        });
      } else if (roll < 0.28) {
        // Market area
        for (let py = by; py < by + bh && py < gridHeight; py++) {
          for (let px = bx; px < bx + bw && px < gridWidth; px++) {
            tileMap[py][px] = 5; // market
          }
        }
        rooms.push({
          id: roomId++, x: bx, y: by, width: bw, height: bh,
          centerX: bx + Math.floor(bw / 2), centerY: by + Math.floor(bh / 2),
        });
      } else {
        // Building block — subdivide into 1-3 buildings
        const numBuildings = bw >= 8 && bh >= 8 ? Math.floor(Math.random() * 2) + 2 :
                             bw >= 6 ? Math.floor(Math.random() * 2) + 1 : 1;
        
        if (numBuildings === 1) {
          // Single building filling the block
          fillBuilding(tileMap, bx, by, bw, bh, gridWidth, gridHeight, doors);
          rooms.push({
            id: roomId++, x: bx, y: by, width: bw, height: bh,
            centerX: bx + Math.floor(bw / 2), centerY: by + Math.floor(bh / 2),
          });
        } else {
          // Split block horizontally or vertically
          const splitHorizontal = bw > bh;
          if (splitHorizontal) {
            const split = Math.floor(bw * (0.4 + Math.random() * 0.2));
            fillBuilding(tileMap, bx, by, split - 1, bh, gridWidth, gridHeight, doors);
            rooms.push({
              id: roomId++, x: bx, y: by, width: split - 1, height: bh,
              centerX: bx + Math.floor((split - 1) / 2), centerY: by + Math.floor(bh / 2),
            });
            // Gap (alley)
            fillBuilding(tileMap, bx + split, by, bw - split, bh, gridWidth, gridHeight, doors);
            rooms.push({
              id: roomId++, x: bx + split, y: by, width: bw - split, height: bh,
              centerX: bx + split + Math.floor((bw - split) / 2), centerY: by + Math.floor(bh / 2),
            });
          } else {
            const split = Math.floor(bh * (0.4 + Math.random() * 0.2));
            fillBuilding(tileMap, bx, by, bw, split - 1, gridWidth, gridHeight, doors);
            rooms.push({
              id: roomId++, x: bx, y: by, width: bw, height: split - 1,
              centerX: bx + Math.floor(bw / 2), centerY: by + Math.floor((split - 1) / 2),
            });
            fillBuilding(tileMap, bx, by + split, bw, bh - split, gridWidth, gridHeight, doors);
            rooms.push({
              id: roomId++, x: bx, y: by + split, width: bw, height: bh - split,
              centerX: bx + Math.floor(bw / 2), centerY: by + split + Math.floor((bh - split) / 2),
            });
          }
        }
      }
    }
  }

  // Convert to standard tileMap for wall/scene generation:
  // For Foundry walls, buildings (0) are walls, everything else is passable
  const wallMap: number[][] = Array.from({ length: gridHeight }, () =>
    Array(gridWidth).fill(0)
  );
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      wallMap[y][x] = tileMap[y][x] === 0 ? 0 : 1; // 0=wall, 1=floor
    }
  }

  const foundryScene = buildFoundryScene(wallMap, doors, rooms, gridWidth, gridHeight, gridSize, mapName);
  foundryScene.tokenVision = false; // Cities are usually open
  foundryScene.fog.exploration = false;
  foundryScene.backgroundColor = '#8B9467'; // earthy green for surrounding terrain

  // Render with city colors
  const imageBuffer = await renderCityImage(tileMap, doors, gridWidth, gridHeight, gridSize);

  return {
    imageBuffer,
    fileName: `${Date.now()}-city.png`,
    foundryScene,
    rooms,
    gridWidth,
    gridHeight,
    gridSize,
  };
}

/** Helper: fill a rectangular area as a building (walls with optional interior) */
function fillBuilding(
  tileMap: number[][],
  bx: number, by: number, bw: number, bh: number,
  gridWidth: number, gridHeight: number,
  doors: DoorData[]
) {
  if (bw < 2 || bh < 2) return;

  for (let py = by; py < by + bh && py < gridHeight; py++) {
    for (let px = bx; px < bx + bw && px < gridWidth; px++) {
      // Walls on the edges, floor inside
      const isEdge = px === bx || px === bx + bw - 1 || py === by || py === by + bh - 1;
      tileMap[py][px] = isEdge ? 0 : 1; // 0=building wall, 1=interior/street
    }
  }

  // Add a door on a random side facing a street
  const side = Math.floor(Math.random() * 4);
  let dx: number, dy: number;
  switch (side) {
    case 0: // top
      dx = bx + 1 + Math.floor(Math.random() * Math.max(1, bw - 2));
      dy = by;
      break;
    case 1: // bottom
      dx = bx + 1 + Math.floor(Math.random() * Math.max(1, bw - 2));
      dy = by + bh - 1;
      break;
    case 2: // left
      dx = bx;
      dy = by + 1 + Math.floor(Math.random() * Math.max(1, bh - 2));
      break;
    default: // right
      dx = bx + bw - 1;
      dy = by + 1 + Math.floor(Math.random() * Math.max(1, bh - 2));
      break;
  }
  if (dx >= 0 && dx < gridWidth && dy >= 0 && dy < gridHeight) {
    tileMap[dy][dx] = 1; // Open the door tile
    doors.push({ x: dx, y: dy });
  }
}

/** Render city map with distinct colors for streets, buildings, plazas, etc. */
async function renderCityImage(
  tileMap: number[][],
  doors: DoorData[],
  gridWidth: number,
  gridHeight: number,
  gridSize: number
): Promise<Buffer> {
  const pixelWidth = gridWidth * gridSize;
  const pixelHeight = gridHeight * gridSize;
  const channels = 4;
  const data = Buffer.alloc(pixelWidth * pixelHeight * channels);
  const doorSet = new Set(doors.map(d => `${d.x},${d.y}`));

  for (let gy = 0; gy < gridHeight; gy++) {
    for (let gx = 0; gx < gridWidth; gx++) {
      const tile = tileMap[gy][gx];
      const isDoor = doorSet.has(`${gx},${gy}`);

      let color: { r: number; g: number; b: number };
      if (isDoor) {
        color = CITY_COLORS.door;
      } else {
        switch (tile) {
          case 0: color = CITY_COLORS.building; break;     // building wall
          case 2: color = CITY_COLORS.plaza; break;        // plaza
          case 3: color = CITY_COLORS.grass; break;        // park/garden
          case 4: color = CITY_COLORS.water; break;        // fountain/pond
          case 5: color = CITY_COLORS.market; break;       // market
          default: color = CITY_COLORS.street; break;      // street (1)
        }
      }

      const noise = Math.floor(Math.random() * 10) - 5;
      const isFloor = tile !== 0;

      for (let py = 0; py < gridSize; py++) {
        for (let px = 0; px < gridSize; px++) {
          const pixelX = gx * gridSize + px;
          const pixelY = gy * gridSize + py;
          const idx = (pixelY * pixelWidth + pixelX) * channels;

          const isGridLine = isFloor && (px === gridSize - 1 || py === gridSize - 1);

          // Add cobblestone pattern for streets
          let extraNoise = 0;
          if (tile === 1 && !isDoor) {
            // Cobblestone pattern: every ~8 pixels, slight color variation
            extraNoise = ((px + py) % 8 < 1) ? -15 : ((px * 3 + py * 7) % 13 < 1 ? 8 : 0);
          }

          if (isGridLine) {
            data[idx + 0] = CITY_COLORS.grid.r;
            data[idx + 1] = CITY_COLORS.grid.g;
            data[idx + 2] = CITY_COLORS.grid.b;
            data[idx + 3] = 255;
          } else {
            data[idx + 0] = Math.max(0, Math.min(255, color.r + noise + extraNoise));
            data[idx + 1] = Math.max(0, Math.min(255, color.g + noise + extraNoise));
            data[idx + 2] = Math.max(0, Math.min(255, color.b + noise + extraNoise));
            data[idx + 3] = 255;
          }
        }
      }
    }
  }

  return sharp(data, { raw: { width: pixelWidth, height: pixelHeight, channels: channels as 4 } })
    .png({ compressionLevel: 6 })
    .toBuffer();
}

// ============================================================
// Building Interior Map Generator
// ============================================================

/**
 * Generates a building interior map (tavern, shop, house, etc.)
 * Uses larger, more structured rooms with furniture-like features.
 */
export async function generateBuildingMap(
  gridWidth: number = 30,
  gridHeight: number = 25,
  gridSize: number = 100,
  mapName: string = 'Generated Building'
): Promise<GeneratedMap> {
  const tileMap: number[][] = Array.from({ length: gridHeight }, () =>
    Array(gridWidth).fill(0) // 0 = wall
  );

  const rooms: RoomData[] = [];
  const doors: DoorData[] = [];
  let roomId = 0;

  // Building outer walls - leave 2-cell border for exterior
  const margin = 2;
  const buildW = gridWidth - margin * 2;
  const buildH = gridHeight - margin * 2;

  // Fill exterior with "outside" (make it passable street)
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      // Outside area
      if (x < margin || x >= gridWidth - margin || y < margin || y >= gridHeight - margin) {
        tileMap[y][x] = 2; // 2 = exterior/street
      }
    }
  }

  // Create the building shell
  for (let y = margin; y < margin + buildH; y++) {
    for (let x = margin; x < margin + buildW; x++) {
      const isOuterWall = x === margin || x === margin + buildW - 1 ||
                          y === margin || y === margin + buildH - 1;
      tileMap[y][x] = isOuterWall ? 0 : 1; // 0=wall, 1=floor
    }
  }

  // Subdivide into rooms using BSP (Binary Space Partitioning)
  interface BSPNode {
    x: number; y: number; w: number; h: number;
    children?: [BSPNode, BSPNode];
  }

  function splitBSP(node: BSPNode, depth: number): void {
    if (depth <= 0 || node.w < 6 || node.h < 6) return;

    const canSplitH = node.w >= 8;
    const canSplitV = node.h >= 8;
    if (!canSplitH && !canSplitV) return;

    let splitHorizontal: boolean;
    if (!canSplitH) splitHorizontal = false;
    else if (!canSplitV) splitHorizontal = true;
    else splitHorizontal = Math.random() < 0.5;

    if (splitHorizontal) {
      const splitAt = node.x + 3 + Math.floor(Math.random() * (node.w - 6));
      const left: BSPNode = { x: node.x, y: node.y, w: splitAt - node.x, h: node.h };
      const right: BSPNode = { x: splitAt, y: node.y, w: node.x + node.w - splitAt, h: node.h };
      node.children = [left, right];

      // Draw dividing wall
      for (let y = node.y; y < node.y + node.h; y++) {
        if (y >= 0 && y < gridHeight && splitAt >= 0 && splitAt < gridWidth) {
          tileMap[y][splitAt] = 0;
        }
      }

      // Add door in the dividing wall
      const doorY = node.y + 1 + Math.floor(Math.random() * Math.max(1, node.h - 2));
      if (doorY >= 0 && doorY < gridHeight && splitAt >= 0 && splitAt < gridWidth) {
        tileMap[doorY][splitAt] = 1;
        doors.push({ x: splitAt, y: doorY });
      }

      splitBSP(left, depth - 1);
      splitBSP(right, depth - 1);
    } else {
      const splitAt = node.y + 3 + Math.floor(Math.random() * (node.h - 6));
      const top: BSPNode = { x: node.x, y: node.y, w: node.w, h: splitAt - node.y };
      const bottom: BSPNode = { x: node.x, y: splitAt, w: node.w, h: node.y + node.h - splitAt };
      node.children = [top, bottom];

      // Draw dividing wall
      for (let x = node.x; x < node.x + node.w; x++) {
        if (x >= 0 && x < gridWidth && splitAt >= 0 && splitAt < gridHeight) {
          tileMap[splitAt][x] = 0;
        }
      }

      // Add door
      const doorX = node.x + 1 + Math.floor(Math.random() * Math.max(1, node.w - 2));
      if (doorX >= 0 && doorX < gridWidth && splitAt >= 0 && splitAt < gridHeight) {
        tileMap[splitAt][doorX] = 1;
        doors.push({ x: doorX, y: splitAt });
      }

      splitBSP(top, depth - 1);
      splitBSP(bottom, depth - 1);
    }
  }

  function collectLeaves(node: BSPNode): BSPNode[] {
    if (!node.children) return [node];
    return [...collectLeaves(node.children[0]), ...collectLeaves(node.children[1])];
  }

  const root: BSPNode = { x: margin + 1, y: margin + 1, w: buildW - 2, h: buildH - 2 };
  const bspDepth = buildW >= 20 && buildH >= 16 ? 3 : 2;
  splitBSP(root, bspDepth);

  // Collect leaf rooms
  const leaves = collectLeaves(root);
  for (const leaf of leaves) {
    rooms.push({
      id: roomId++,
      x: leaf.x, y: leaf.y,
      width: leaf.w, height: leaf.h,
      centerX: leaf.x + Math.floor(leaf.w / 2),
      centerY: leaf.y + Math.floor(leaf.h / 2),
    });

    // Add furniture markers (tile value 3 = furniture, 4 = hearth/rug)
    // Fireplace in one room
    if (roomId === 1 && leaf.w >= 4 && leaf.h >= 4) {
      const hx = leaf.x + Math.floor(leaf.w / 2);
      const hy = leaf.y; // Against north wall (which is already a wall cell above)
      if (hy + 1 < gridHeight && hx < gridWidth && tileMap[hy][hx] === 1) {
        tileMap[hy][hx] = 4; // hearth
      }
    }

    // Tables/furniture in larger rooms
    if (leaf.w >= 5 && leaf.h >= 5 && Math.random() < 0.7) {
      const fx = leaf.x + Math.floor(leaf.w / 2);
      const fy = leaf.y + Math.floor(leaf.h / 2);
      if (fx < gridWidth && fy < gridHeight && tileMap[fy][fx] === 1) {
        tileMap[fy][fx] = 3; // furniture
        if (fx + 1 < gridWidth && tileMap[fy][fx + 1] === 1) tileMap[fy][fx + 1] = 3;
      }
    }
  }

  // Add main entrance door on south wall
  const entranceX = margin + Math.floor(buildW / 2);
  const entranceY = margin + buildH - 1;
  if (entranceX < gridWidth && entranceY < gridHeight) {
    tileMap[entranceY][entranceX] = 1;
    doors.push({ x: entranceX, y: entranceY });
  }

  // Build wall map (0 and any outer building wall = wall, rest = floor)
  const wallMap: number[][] = Array.from({ length: gridHeight }, () =>
    Array(gridWidth).fill(0)
  );
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      wallMap[y][x] = tileMap[y][x] === 0 ? 0 : 1;
    }
  }

  const foundryScene = buildFoundryScene(wallMap, doors, rooms, gridWidth, gridHeight, gridSize, mapName);
  const imageBuffer = await renderBuildingImage(tileMap, doors, gridWidth, gridHeight, gridSize);

  return {
    imageBuffer,
    fileName: `${Date.now()}-building.png`,
    foundryScene,
    rooms,
    gridWidth,
    gridHeight,
    gridSize,
  };
}

/** Render building interior with wood floors, furniture colors, etc. */
async function renderBuildingImage(
  tileMap: number[][],
  doors: DoorData[],
  gridWidth: number,
  gridHeight: number,
  gridSize: number
): Promise<Buffer> {
  const pixelWidth = gridWidth * gridSize;
  const pixelHeight = gridHeight * gridSize;
  const channels = 4;
  const data = Buffer.alloc(pixelWidth * pixelHeight * channels);
  const doorSet = new Set(doors.map(d => `${d.x},${d.y}`));

  for (let gy = 0; gy < gridHeight; gy++) {
    for (let gx = 0; gx < gridWidth; gx++) {
      const tile = tileMap[gy][gx];
      const isDoor = doorSet.has(`${gx},${gy}`);

      let color: { r: number; g: number; b: number };
      if (isDoor) {
        color = BUILDING_COLORS.door;
      } else {
        switch (tile) {
          case 0: color = BUILDING_COLORS.wall; break;
          case 2: color = CITY_COLORS.street; break;         // exterior
          case 3: color = BUILDING_COLORS.furniture; break;   // furniture
          case 4: color = BUILDING_COLORS.hearth; break;      // fireplace
          default: color = BUILDING_COLORS.floor; break;      // floor (1)
        }
      }

      const noise = Math.floor(Math.random() * 8) - 4;
      const isFloor = tile !== 0;

      for (let py = 0; py < gridSize; py++) {
        for (let px = 0; px < gridSize; px++) {
          const pixelX = gx * gridSize + px;
          const pixelY = gy * gridSize + py;
          const idx = (pixelY * pixelWidth + pixelX) * channels;

          const isGridLine = isFloor && (px === gridSize - 1 || py === gridSize - 1);

          // Wood plank pattern for floors
          let plankNoise = 0;
          if (tile === 1) {
            // Horizontal plank lines
            plankNoise = (py % 12 < 1) ? -20 : 0;
            // Subtle stagger for plank seams
            if (px % 20 < 1 && (Math.floor(py / 12) + gx) % 2 === 0) plankNoise = -15;
          }

          if (isGridLine) {
            data[idx + 0] = BUILDING_COLORS.grid.r;
            data[idx + 1] = BUILDING_COLORS.grid.g;
            data[idx + 2] = BUILDING_COLORS.grid.b;
            data[idx + 3] = 255;
          } else {
            data[idx + 0] = Math.max(0, Math.min(255, color.r + noise + plankNoise));
            data[idx + 1] = Math.max(0, Math.min(255, color.g + noise + plankNoise));
            data[idx + 2] = Math.max(0, Math.min(255, color.b + noise + plankNoise));
            data[idx + 3] = 255;
          }
        }
      }
    }
  }

  return sharp(data, { raw: { width: pixelWidth, height: pixelHeight, channels: channels as 4 } })
    .png({ compressionLevel: 6 })
    .toBuffer();
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
