import sharp from 'sharp';
import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import fetch from 'node-fetch';

const ASSETS_DIR = '/app/assets';
const TOKENS_DIR = join(ASSETS_DIR, 'tokens');

// Foundry VTT creature size to grid units mapping
const SIZE_TO_GRID_UNITS: Record<string, number> = {
  tiny: 0.5,
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
