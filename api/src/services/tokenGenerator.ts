import sharp from 'sharp';
import { createWriteStream, existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import fetch from 'node-fetch';

const ASSETS_DIR = '/app/assets';
const TOKENS_DIR = join(ASSETS_DIR, 'tokens');

// Foundry VTT creature size to grid units mapping
const SIZE_TO_GRID_UNITS: Record<string, number> = {
  tiny: 1,
  small: 1,
  medium: 1,
  large: 2,
  huge: 3,
  gargantuan: 4,
};

export interface GeneratedToken {
  imageBuffer: Buffer;
  imageUrl: string;
  width: number;
  height: number;
  size: string;
  foundryData: {
    actorLink: boolean;
    disposition: number; // -1=hostile, 0=neutral, 1=friendly
    displayName: number; // 0=none, 10=control, 20=owner hover, 30=hover, 40=owner, 50=always
    displayBars: number;
    bar1: { attribute: string };
    bar2: { attribute: string };
    rotation: number;
    alpha: number;
    lockRotation: boolean;
    hidden: false;
    elevation: number;
    effects: string[];
    vision: {
      enabled: boolean;
      range: number;
      angle: number;
      visionMode: string;
      color: null | string;
      attenuation: number;
      brightness: number;
      saturation: number;
      contrast: number;
    };
    detection: {
      basicSight: { enabled: boolean; range: number };
    };
  };
}

/**
 * Generate a token image from an NPC description
 * Uses DiceBear API (free, no auth) as primary source
 * Falls back to simple generated token with sharp
 */
export async function generateTokenFromDescription(
  name: string,
  description: string,
  npcId: string,
  size: string = 'medium',
  type: string = 'character'
): Promise<GeneratedToken> {
  let imageBuffer: Buffer;

  // Try DiceBear API first (free, no authentication required)
  try {
    imageBuffer = await fetchDiceBearToken(name);
  } catch (error) {
    console.log('DiceBear API failed, generating simple token:', error);
    // Fallback to simple generated token
    imageBuffer = await generateSimpleToken(name, size);
  }

  // Process the image to ensure it's Foundry-compatible
  // Foundry prefers square images, transparent backgrounds work best
  const processedBuffer = await processTokenImage(imageBuffer, size);

  // Determine grid size from creature size
  const gridUnits = SIZE_TO_GRID_UNITS[size.toLowerCase()] || 1;

  // Build Foundry-compliant token data
  const foundryData = buildFoundryTokenData(type, size);

  return {
    imageBuffer: processedBuffer,
    imageUrl: '', // Will be set after saving
    width: gridUnits,
    height: gridUnits,
    size,
    foundryData,
  };
}

/**
 * Fetch token image from DiceBear API
 * Free service, no API key required
 */
async function fetchDiceBearToken(name: string): Promise<Buffer> {
  // Use multiple styles for variety
  const styles = ['avataaars', 'bottts', 'personas', 'lorelei', 'notionists'];
  const style = styles[Math.floor(Math.random() * styles.length)];

  const url = `https://api.dicebear.com/7.x/${style}/png?seed=${encodeURIComponent(
    name
  )}&size=400&backgroundColor=transparent`;

  const response = await fetch(url, { timeout: 10000 });

  if (!response.ok) {
    throw new Error(`DiceBear API returned ${response.status}`);
  }

  const buffer = await response.buffer();
  return buffer;
}

/**
 * Generate a simple token using sharp
 * Creates a circular token with initials
 */
async function generateSimpleToken(
  name: string,
  size: string
): Promise<Buffer> {
  const tokenSize = 400; // pixels
  const radius = tokenSize / 2;

  // Generate color from name (deterministic)
  const hash = name.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  const hue = Math.abs(hash % 360);
  const bgColor = `hsl(${hue}, 60%, 50%)`;

  // Get initials (first 2-3 letters)
  const initials = name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 3);

  // Create SVG circle with initials
  const svg = `
    <svg width="${tokenSize}" height="${tokenSize}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${radius}" cy="${radius}" r="${radius}" fill="${bgColor}" />
      <text 
        x="50%" 
        y="50%" 
        font-family="Arial, sans-serif" 
        font-size="${tokenSize / 4}" 
        font-weight="bold" 
        fill="white" 
        text-anchor="middle" 
        dominant-baseline="central"
      >
        ${initials}
      </text>
    </svg>
  `;

  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return buffer;
}

/**
 * Process token image for Foundry VTT compatibility
 * - Ensures square dimensions
 * - Optimizes size (Foundry recommends 200-400px)
 * - Ensures PNG format with transparency support
 */
async function processTokenImage(
  imageBuffer: Buffer,
  size: string
): Promise<Buffer> {
  // Foundry VTT optimal token sizes: 200px to 400px
  const targetSize = 400;

  const image = sharp(imageBuffer);
  const metadata = await image.metadata();

  // Make square if not already
  const dimension = Math.max(metadata.width || targetSize, metadata.height || targetSize);

  let processedImage = image
    .resize(dimension, dimension, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }, // Transparent background
    })
    .resize(targetSize, targetSize, {
      fit: 'cover',
      position: 'center',
    });

  // Convert to PNG with alpha channel
  processedImage = processedImage.png({ compressionLevel: 9 });

  return await processedImage.toBuffer();
}

/**
 * Build Foundry VTT-compliant token data structure
 */
function buildFoundryTokenData(
  type: string,
  size: string
): GeneratedToken['foundryData'] {
  // Determine disposition based on type
  const disposition = type === 'character' || type === 'npc' ? 0 : -1; // 0=neutral, -1=hostile

  return {
    actorLink: false, // Token is not linked to actor (independent HP/resources)
    disposition,
    displayName: 30, // 30 = hover to see name
    displayBars: 30, // 30 = hover to see bars
    bar1: { attribute: 'attributes.hp' }, // Primary health bar
    bar2: { attribute: 'attributes.ac' }, // Secondary attribute
    rotation: 0,
    alpha: 1.0,
    lockRotation: false,
    hidden: false,
    elevation: 0,
    effects: [],
    vision: {
      enabled: type === 'character', // Only PCs have vision by default
      range: type === 'character' ? 60 : 0, // 60ft vision for characters
      angle: 360, // Full circle vision
      visionMode: 'basic',
      color: null,
      attenuation: 0.1,
      brightness: 0,
      saturation: 0,
      contrast: 0,
    },
    detection: {
      basicSight: {
        enabled: type === 'character',
        range: type === 'character' ? 60 : 0,
      },
    },
  };
}

/**
 * Save token image to disk and return URL
 */
export async function saveTokenImage(
  imageBuffer: Buffer,
  tokenId: string,
  fileName: string
): Promise<string> {
  await mkdir(TOKENS_DIR, { recursive: true });

  const sanitizedFileName = fileName.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
  const fullFileName = `${tokenId}-${Date.now()}-${sanitizedFileName}.png`;
  const filePath = join(TOKENS_DIR, fullFileName);

  await sharp(imageBuffer).png().toFile(filePath);

  return `/api/assets/tokens/${fullFileName}`;
}

// ============================================================
// Monster Silhouette Token Generation (Tier 2 Fallback)
// ============================================================

const SILHOUETTES_DIR = join(ASSETS_DIR, 'tokens', 'silhouettes');

/** CR difficulty color bands */
const CR_COLORS: Array<{ maxCr: number; color: string; label: string }> = [
  { maxCr: 0.5, color: '#808080', label: 'gray' },     // trivial
  { maxCr: 2, color: '#4CAF50', label: 'green' },       // easy
  { maxCr: 5, color: '#2196F3', label: 'blue' },        // moderate
  { maxCr: 10, color: '#9C27B0', label: 'purple' },     // hard
  { maxCr: 15, color: '#FF9800', label: 'orange' },     // deadly
  { maxCr: 20, color: '#F44336', label: 'red' },        // legendary
  { maxCr: Infinity, color: '#8B0000', label: 'crimson' }, // mythic
];

export function getCrColor(cr: string | number): string {
  const numCr = typeof cr === 'string' ? parseCr(cr) : cr;
  for (const band of CR_COLORS) {
    if (numCr <= band.maxCr) return band.color;
  }
  return CR_COLORS[CR_COLORS.length - 1].color;
}

function parseCr(cr: string): number {
  if (cr.includes('/')) {
    const [num, den] = cr.split('/').map(Number);
    return den ? num / den : 0;
  }
  return parseFloat(cr) || 0;
}

/**
 * SVG path data for 14 creature type silhouettes.
 * Each is drawn in a 400x400 viewBox, centered, designed as white-filled shapes.
 */
const SILHOUETTE_PATHS: Record<string, string> = {
  // Dragon - winged serpentine shape
  dragon:
    'M200 60 L160 120 L100 100 L120 160 L60 200 L120 220 L80 300 L140 260 L160 320 L200 280 L240 320 L260 260 L320 300 L280 220 L340 200 L280 160 L300 100 L240 120 Z',
  // Undead - skull shape
  undead:
    'M200 80 C140 80 100 120 100 180 C100 220 120 250 150 270 L150 300 L170 300 L170 280 L190 300 L210 300 L210 280 L230 300 L250 300 L250 270 C280 250 300 220 300 180 C300 120 260 80 200 80 Z M160 170 C160 150 180 140 190 155 C200 140 220 150 220 170 C220 190 200 200 190 200 C180 200 160 190 160 170 Z M240 170 L240 190 L260 180 Z',
  // Beast - wolf/quadruped
  beast:
    'M80 220 L100 180 L120 190 L150 160 L170 170 L200 140 L240 150 L270 130 L300 140 L320 160 L330 200 L320 220 L300 240 L280 260 L280 300 L260 300 L260 260 L200 270 L160 300 L140 300 L150 260 L120 240 L100 260 L80 260 Z',
  // Humanoid - standing figure
  humanoid:
    'M200 70 C180 70 170 80 170 100 C170 120 180 130 200 130 C220 130 230 120 230 100 C230 80 220 70 200 70 Z M170 140 L150 200 L130 260 L150 270 L170 220 L190 280 L180 340 L195 340 L200 290 L205 340 L220 340 L210 280 L230 220 L250 270 L270 260 L250 200 L230 140 Z',
  // Fiend - horned demon
  fiend:
    'M200 60 L170 80 L140 60 L155 100 L130 140 L120 120 L110 180 L130 200 L110 260 L140 240 L160 300 L170 340 L190 320 L200 340 L210 320 L230 340 L240 300 L260 240 L290 260 L270 200 L290 180 L280 120 L270 140 L245 100 L260 60 L230 80 Z',
  // Celestial - angelic winged figure
  celestial:
    'M200 70 C185 70 175 82 175 97 C175 112 185 125 200 125 C215 125 225 112 225 97 C225 82 215 70 200 70 Z M200 130 L180 150 L100 120 L130 170 L60 160 L120 200 L180 220 L170 340 L195 340 L200 280 L205 340 L230 340 L220 220 L280 200 L340 160 L270 170 L300 120 L220 150 Z',
  // Fey - sprite with wings
  fey:
    'M200 90 C188 90 180 100 180 112 C180 124 188 134 200 134 C212 134 220 124 220 112 C220 100 212 90 200 90 Z M200 138 L185 160 L120 140 L150 180 L100 190 L155 210 L180 240 L175 320 L193 320 L200 260 L207 320 L225 320 L220 240 L245 210 L300 190 L250 180 L280 140 L215 160 Z',
  // Elemental - flame/swirl shape
  elemental:
    'M200 80 C230 100 260 80 270 110 C290 90 310 120 290 150 C320 150 310 190 280 190 C300 220 280 250 250 240 C260 270 240 300 210 280 C220 310 200 330 180 310 C170 330 140 310 150 280 C120 300 110 270 130 250 C100 260 90 230 110 210 C80 220 80 190 100 180 C80 170 80 140 110 140 C90 120 110 100 130 110 C120 80 150 70 170 90 C180 70 190 70 200 80 Z',
  // Construct - golem/blocky shape
  construct:
    'M160 80 L240 80 L250 100 L250 160 L270 170 L300 170 L300 210 L270 210 L260 220 L260 280 L280 300 L280 340 L240 340 L240 300 L220 290 L180 290 L160 300 L160 340 L120 340 L120 300 L140 280 L140 220 L130 210 L100 210 L100 170 L130 170 L150 160 L150 100 Z',
  // Aberration - tentacled eye
  aberration:
    'M200 100 C160 100 130 130 130 170 C130 210 160 240 200 240 C240 240 270 210 270 170 C270 130 240 100 200 100 Z M200 135 C215 135 225 150 225 170 C225 190 215 200 200 200 C185 200 175 190 175 170 C175 150 185 135 200 135 Z M160 245 L130 310 L150 300 L155 250 Z M190 245 L175 320 L195 305 L197 248 Z M210 245 L225 320 L205 305 L203 248 Z M240 245 L270 310 L250 300 L245 250 Z M145 230 L100 270 L125 260 L152 235 Z M255 230 L300 270 L275 260 L248 235 Z',
  // Giant - large humanoid with club
  giant:
    'M200 55 C178 55 165 68 165 90 C165 112 178 125 200 125 C222 125 235 112 235 90 C235 68 222 55 200 55 Z M165 130 L135 200 L100 195 L80 210 L110 220 L130 200 L155 210 L150 280 L130 340 L160 340 L175 290 L200 300 L225 290 L240 340 L270 340 L250 280 L245 210 L270 200 L290 220 L320 210 L300 195 L265 200 L235 130 Z',
  // Monstrosity - chimera-like beast
  monstrosity:
    'M120 140 L90 120 L100 160 L70 180 L110 190 L100 220 L80 260 L110 250 L130 280 L140 260 L160 300 L170 340 L185 340 L180 280 L200 260 L220 280 L215 340 L230 340 L240 300 L260 260 L270 280 L290 250 L320 260 L300 220 L290 190 L330 180 L300 160 L310 120 L280 140 L260 120 L240 140 L220 130 L200 100 L180 130 L160 140 Z',
  // Ooze - amorphous blob
  ooze:
    'M200 110 C240 105 280 120 300 150 C320 170 325 200 310 230 C300 255 275 275 250 285 C230 295 200 300 175 295 C150 290 125 275 110 255 C95 235 85 210 90 185 C95 160 110 140 135 125 C155 115 175 112 200 110 Z M170 170 C180 165 190 175 185 185 C178 195 165 195 160 185 C155 175 160 168 170 170 Z M240 160 C252 158 260 170 255 182 C248 192 235 195 228 185 C220 172 228 160 240 160 Z',
  // Plant - treant/plant creature
  plant:
    'M200 60 C220 55 245 65 255 85 C270 70 290 80 290 100 C310 95 320 115 310 130 C325 135 325 160 310 170 C315 185 305 200 290 200 L270 200 L280 260 L300 340 L260 340 L240 280 L220 340 L200 340 L200 280 L180 340 L160 340 L140 280 L120 340 L100 340 L120 260 L130 200 L110 200 C95 200 85 185 90 170 C75 160 75 135 90 130 C80 115 90 95 110 100 C110 80 130 70 145 85 C155 65 180 55 200 60 Z',
};

/** Default silhouette for unknown creature types */
const DEFAULT_SILHOUETTE_TYPE = 'humanoid';

/**
 * Generate a monster silhouette token as a PNG file.
 *
 * Renders an SVG with:
 * - Dark gradient background circle
 * - White creature-type silhouette
 * - CR badge in the corner
 *
 * Saves to /app/assets/tokens/silhouettes/ and returns the Foundry-local path.
 */
export async function generateMonsterSilhouette(
  name: string,
  creatureType: string,
  cr: string | number
): Promise<string> {
  const safeName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const fileName = `${safeName}-${creatureType}.png`;
  const filePath = join(SILHOUETTES_DIR, fileName);
  const foundryPath = `lazy-foundry-assets/tokens/silhouettes/${fileName}`;

  // Return cached file if it already exists
  if (existsSync(filePath)) {
    return foundryPath;
  }

  await mkdir(SILHOUETTES_DIR, { recursive: true });

  const color = getCrColor(cr);
  const silhouettePath = SILHOUETTE_PATHS[creatureType] || SILHOUETTE_PATHS[DEFAULT_SILHOUETTE_TYPE];
  const crLabel = typeof cr === 'number' ? String(cr) : cr;

  const svg = `
<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0.9"/>
    </radialGradient>
    <clipPath id="circle">
      <circle cx="200" cy="200" r="195"/>
    </clipPath>
  </defs>
  <!-- Background circle -->
  <circle cx="200" cy="200" r="195" fill="url(#bg)" stroke="${color}" stroke-width="4"/>
  <!-- Silhouette -->
  <g clip-path="url(#circle)">
    <path d="${silhouettePath}" fill="white" fill-opacity="0.9" stroke="none"/>
  </g>
  <!-- CR badge -->
  <circle cx="340" cy="60" r="35" fill="${color}" stroke="white" stroke-width="3"/>
  <text x="340" y="60" font-family="Arial,sans-serif" font-size="${crLabel.length > 2 ? 18 : 24}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">CR${crLabel}</text>
  <!-- Border ring -->
  <circle cx="200" cy="200" r="195" fill="none" stroke="${color}" stroke-width="5" opacity="0.8"/>
</svg>`;

  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(filePath);

  console.log(`[TokenGen] Generated silhouette for "${name}" (${creatureType}, CR ${crLabel}) -> ${foundryPath}`);
  return foundryPath;
}
