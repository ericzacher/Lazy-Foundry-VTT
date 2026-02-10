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
  createdAt: string;
  updatedAt: string;
}
