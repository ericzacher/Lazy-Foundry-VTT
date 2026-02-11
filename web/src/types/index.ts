export interface User {
  id: string;
  email: string;
  username: string;
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  setting?: string;
  theme?: string;
  tone?: string;
  playerCount: number;
  worldLore?: Record<string, unknown>;
  rules?: Record<string, unknown>;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  sessions?: Session[];
}

export enum SessionStatus {
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export interface Session {
  id: string;
  campaignId: string;
  sessionNumber: number;
  title: string;
  description?: string;
  scheduledDate?: string;
  completedDate?: string;
  status: SessionStatus;
  scenario?: Record<string, unknown>;
  npcIds: string[];
  mapIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SessionResult {
  id: string;
  sessionId: string;
  summary?: string;
  events: string[];
  npcInteractions?: Record<string, unknown>;
  playerDecisions: string[];
  worldChanges?: Record<string, unknown>;
  unfinishedThreads: string[];
  capturedAt: string;
  // Phase 5 fields
  plotAdvancement?: string;
  characterDevelopment?: Record<string, unknown>;
  durationMinutes?: number;
  xpAwarded?: number;
  lootAwarded?: Record<string, unknown>;
  deathCount?: number;
  captureMethod?: string;
  transcript?: string;
  mood?: string;
}

export interface NPCHistoryEntry {
  id: string;
  npcId: string;
  sessionId: string;
  alignmentBefore?: string;
  alignmentAfter?: string;
  loyaltyBefore?: string;
  loyaltyAfter?: string;
  statusBefore?: string;
  statusAfter?: string;
  relationshipChange?: string;
  notes?: string;
  eventsInvolved?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TimelineEvent {
  id: string;
  campaignId: string;
  sessionId?: string;
  eventDate: string;
  sessionNumber?: number;
  title: string;
  description?: string;
  eventType: string;
  significance: string;
  peopleInvolved?: string[];
  locations?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface NPCStatus {
  npcId: string;
  name: string;
  alignment: string | null;
  loyalty: string | null;
  status: string;
  relationshipSummary: string | null;
}

export interface CampaignSummary {
  sessionsCompleted: number;
  totalSessions: number;
  timelineEvents: Array<{
    session: number | null;
    title: string;
    description: string | null;
    type: string;
    significance: string;
  }>;
  npcStatuses: Record<string, NPCStatus>;
  majorPlotPoints: string[];
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface NPC {
  id: string;
  campaignId: string;
  name: string;
  role?: string;
  description?: string;
  personality?: {
    traits?: string[];
    ideals?: string;
    bonds?: string;
    flaws?: string;
  };
  motivations: string[];
  background?: string;
  stats?: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  tokenImageUrl?: string;
  foundryActorId?: string;
  lastSyncedAt?: string;
  syncStatus?: 'never' | 'pending' | 'synced' | 'error';
  createdAt: string;
  updatedAt: string;
}

export interface MapData {
  id: string;
  campaignId: string;
  sessionId?: string;
  name: string;
  description?: string;
  type: string;
  gridSize: number;
  dimensions?: { width: number; height: number };
  imageUrl?: string;
  foundrySceneId?: string;
  lastSyncedAt?: string;
  syncStatus?: 'never' | 'pending' | 'synced' | 'error';
  version: number;
  createdAt: string;
  updatedAt: string;
  details?: {
    rooms?: Array<{
      name: string;
      description: string;
      features: unknown[];
      connections: unknown[];
    }>;
    pointsOfInterest?: Array<{
      name: string;
      description: string;
      type: string;
    }>;
    encounters?: Array<{
      location: string;
      description: string;
      difficulty: string;
    }>;
    atmosphere?: unknown;
    hazards?: unknown[];
  };
  foundryData?: {
    name: string;
    width: number;
    height: number;
    grid: { type: number; size: number; color: string; alpha: number };
    walls: Array<{
      c: [number, number, number, number];
      move: number;
      sense: number;
      sound: number;
      door: number;
      ds: number;
    }>;
    lights: Array<{
      x: number;
      y: number;
      config: {
        dim: number;
        bright: number;
        angle: number;
        color: string;
        alpha: number;
        animation: { type: string; speed: number; intensity: number };
      };
    }>;
  };
}

export interface PlayerBackground {
  characterName: string;
  race: string;
  class: string;
  background: string;
  backstory: string;
  personalityTraits: string[];
  ideals: string;
  bonds: string[];
  flaws: string;
  hooks: string[];
  reasonsForAdventure: string;
}

export interface TokenData {
  id: string;
  campaignId: string;
  npcId?: string;
  name: string;
  description?: string;
  imageUrl?: string;
  type: string; // 'character', 'npc', 'creature'
  size: string; // 'tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'
  width: number; // Grid units
  height: number; // Grid units
  scale: number; // Visual scale (1.0 = 100%)
  vision?: {
    enabled: boolean;
    range: number;
    angle: number;
    visionMode: string;
    color: string | null;
    attenuation: number;
    brightness: number;
    saturation: number;
    contrast: number;
  };
  detection?: {
    basicSight?: { enabled: boolean; range: number };
    seeInvisibility?: { enabled: boolean; range: number };
    senseInvisibility?: { enabled: boolean; range: number };
    feelTremor?: { enabled: boolean; range: number };
  };
  foundryData?: {
    actorId?: string;
    actorLink: boolean;
    disposition: number; // -1=hostile, 0=neutral, 1=friendly
    displayName: number;
    displayBars: number;
    bar1: { attribute: string };
    bar2: { attribute: string };
    rotation: number;
    alpha: number;
    lockRotation: boolean;
    hidden: boolean;
    elevation: number;
    effects: string[];
    overlayEffect?: string;
    light?: {
      alpha: number;
      angle: number;
      bright: number;
      dim: number;
      color: string;
      animation: { type: string; speed: number; intensity: number };
    };
  };
  createdAt: string;
  updatedAt: string;
}
