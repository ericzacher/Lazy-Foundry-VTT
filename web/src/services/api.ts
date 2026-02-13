import type { AuthResponse, Campaign, Session, User, NPC, SessionResult, MapData, TokenData, CampaignSummary, TimelineEvent, NPCHistoryEntry, NPCStatus } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      
      // Handle validation errors with details
      if (error.details && Array.isArray(error.details)) {
        const messages = error.details.map((d: any) => 
          `${d.field}: ${d.message}`
        ).join(', ');
        throw new Error(messages);
      }
      
      const message = error.error || 'Request failed';
      throw new Error(message);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  // Auth
  async register(email: string, username: string, password: string): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, username, password }),
    });
    this.setToken(data.token);
    return data;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.token);
    return data;
  }

  async getMe(): Promise<User> {
    return this.request<User>('/api/auth/me');
  }

  logout() {
    this.setToken(null);
  }

  // Campaigns
  async getCampaigns(): Promise<Campaign[]> {
    return this.request<Campaign[]>('/api/campaigns');
  }

  async getCampaign(id: string): Promise<Campaign> {
    return this.request<Campaign>(`/api/campaigns/${id}`);
  }

  async createCampaign(data: Partial<Campaign>): Promise<Campaign> {
    return this.request<Campaign>('/api/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCampaign(id: string, data: Partial<Campaign>): Promise<Campaign> {
    return this.request<Campaign>(`/api/campaigns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCampaign(id: string): Promise<void> {
    return this.request<void>(`/api/campaigns/${id}`, {
      method: 'DELETE',
    });
  }

  // Sessions
  async getSessions(campaignId: string): Promise<Session[]> {
    return this.request<Session[]>(`/api/campaigns/${campaignId}/sessions`);
  }

  async getSession(id: string): Promise<Session> {
    return this.request<Session>(`/api/sessions/${id}`);
  }

  async createSession(campaignId: string, data: Partial<Session>): Promise<Session> {
    return this.request<Session>(`/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSession(id: string, data: Partial<Session>): Promise<Session> {
    return this.request<Session>(`/api/sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSession(id: string): Promise<void> {
    return this.request<void>(`/api/sessions/${id}`, {
      method: 'DELETE',
    });
  }

  async finalizeSession(id: string, data: Record<string, unknown>): Promise<unknown> {
    return this.request(`/api/sessions/${id}/finalize`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // AI Generation
  async generateCampaignLore(campaignId: string): Promise<{ campaign: Campaign; lore: unknown }> {
    return this.request(`/api/generate/campaigns/${campaignId}/lore`, {
      method: 'POST',
    });
  }

  async generateNPCs(
    campaignId: string,
    count?: number,
    roles?: string[]
  ): Promise<{ npcs: NPC[] }> {
    return this.request(`/api/generate/campaigns/${campaignId}/npcs`, {
      method: 'POST',
      body: JSON.stringify({ count, roles }),
    });
  }

  async generateScenario(
    sessionId: string,
    description?: string
  ): Promise<{ session: Session; scenario: unknown }> {
    return this.request(`/api/generate/sessions/${sessionId}/scenario`, {
      method: 'POST',
      body: JSON.stringify({ description }),
    });
  }

  async summarizeSession(
    sessionId: string,
    events: string[],
    playerDecisions: string[]
  ): Promise<{ summary: string }> {
    return this.request(`/api/generate/sessions/${sessionId}/summarize`, {
      method: 'POST',
      body: JSON.stringify({ events, playerDecisions }),
    });
  }

  async getCampaignNPCs(campaignId: string): Promise<NPC[]> {
    return this.request(`/api/generate/campaigns/${campaignId}/npcs`);
  }

  // Session Results
  async getSessionResults(sessionId: string): Promise<SessionResult> {
    return this.request(`/api/sessions/${sessionId}/results`);
  }

  // Player Backgrounds
  async generatePlayerBackgrounds(
    campaignId: string,
    playerCount?: number
  ): Promise<{ backgrounds: unknown[] }> {
    return this.request(`/api/generate/campaigns/${campaignId}/backgrounds`, {
      method: 'POST',
      body: JSON.stringify({ playerCount }),
    });
  }

  // Maps
  async generateMap(
    campaignId: string,
    description: string,
    mapType?: string,
    sessionId?: string,
    encounterConfig?: {
      count: number;
      difficulty: 'easy' | 'medium' | 'hard' | 'deadly';
      partyLevel: number;
      partySize: number;
    },
    mapSize?: 'small' | 'medium' | 'large'
  ): Promise<{ map: MapData }> {
    return this.request(`/api/generate/campaigns/${campaignId}/maps`, {
      method: 'POST',
      body: JSON.stringify({ description, mapType, mapSize, sessionId, encounterConfig }),
    });
  }

  async getCampaignMaps(campaignId: string): Promise<MapData[]> {
    return this.request(`/api/generate/campaigns/${campaignId}/maps`);
  }

  async exportFoundryScene(campaignId: string, mapId: string): Promise<void> {
    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    const res = await fetch(`${API_URL}/api/generate/campaigns/${campaignId}/maps/${mapId}/foundry-export`, {
      headers,
    });
    if (!res.ok) throw new Error('Failed to export Foundry scene');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const disposition = res.headers.get('Content-Disposition');
    const filename = disposition?.match(/filename="(.+)"/)?.[1] || 'foundry-scene.json';
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Encounters
  async generateEncounters(
    campaignId: string,
    partyLevel?: number,
    partySize?: number,
    encounterType?: string
  ): Promise<{ encounters: unknown[] }> {
    return this.request(`/api/generate/campaigns/${campaignId}/encounters`, {
      method: 'POST',
      body: JSON.stringify({ partyLevel, partySize, encounterType }),
    });
  }

  // Tokens
  async generateToken(
    campaignId: string,
    npcId: string
  ): Promise<{ token: TokenData }> {
    return this.request(`/api/generate/campaigns/${campaignId}/npcs/${npcId}/token`, {
      method: 'POST',
    });
  }

  async getCampaignTokens(campaignId: string): Promise<TokenData[]> {
    return this.request(`/api/generate/campaigns/${campaignId}/tokens`);
  }

  // Foundry VTT Sync
  async getFoundryStatus(): Promise<{ status: string; foundryUrl?: string }> {
    return this.request('/api/foundry/health');
  }

  async syncMapToFoundry(mapId: string): Promise<{ success: boolean; foundrySceneId: string }> {
    return this.request(`/api/foundry/scenes/${mapId}`, {
      method: 'POST',
    });
  }

  async syncNPCToFoundry(npcId: string): Promise<{ success: boolean; foundryActorId: string }> {
    return this.request(`/api/foundry/actors/${npcId}`, {
      method: 'POST',
    });
  }

  async syncCampaignLore(campaignId: string): Promise<{ success: boolean; foundryJournalId: string }> {
    return this.request(`/api/foundry/journals/${campaignId}`, {
      method: 'POST',
    });
  }

  async bulkSyncCampaign(campaignId: string, sessionId?: string): Promise<{
    success: boolean;
    results: {
      scenes: { success: number; failed: number };
      actors: { success: number; failed: number };
      journals: { success: number; failed: number };
      tokens: { success: number; failed: number };
    }
  }> {
    const payload: { sessionId?: string } = {};
    if (sessionId) {
      payload.sessionId = sessionId;
    }

    return this.request(`/api/foundry/campaigns/${campaignId}/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  }

  async getFoundryScenes(): Promise<{ scenes: unknown[] }> {
    return this.request('/api/foundry/scenes');
  }

  async getFoundryActors(): Promise<{ actors: unknown[] }> {
    return this.request('/api/foundry/actors');
  }

  // Phase 5: Session Continuity

  async autoSummarizeSession(
    sessionId: string,
    transcript: string,
    partyComposition?: string
  ): Promise<{ summary: unknown; result: SessionResult }> {
    return this.request(`/api/sessions/${sessionId}/auto-summarize`, {
      method: 'POST',
      body: JSON.stringify({ transcript, partyComposition }),
    });
  }

  async getCampaignSummary(campaignId: string): Promise<{ summary: CampaignSummary }> {
    return this.request(`/api/campaigns/${campaignId}/summary`);
  }

  async getCampaignTimeline(campaignId: string): Promise<{ events: TimelineEvent[] }> {
    return this.request(`/api/campaigns/${campaignId}/timeline`);
  }

  async addTimelineEvent(
    campaignId: string,
    data: Partial<TimelineEvent>
  ): Promise<{ event: TimelineEvent }> {
    return this.request(`/api/campaigns/${campaignId}/timeline`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async trackNPCHistory(
    sessionId: string,
    data: Partial<NPCHistoryEntry> & { npcId: string }
  ): Promise<{ history: NPCHistoryEntry }> {
    return this.request(`/api/sessions/${sessionId}/npc-history`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCampaignNPCStatuses(
    campaignId: string
  ): Promise<{ statuses: Record<string, NPCStatus> }> {
    return this.request(`/api/campaigns/${campaignId}/npc-status`);
  }

  async generateContinuityScenario(
    sessionId: string,
    data: { description: string; partyLevel?: number; partyComposition?: string }
  ): Promise<{ session: Session; scenario: unknown }> {
    return this.request(`/api/generate/sessions/${sessionId}/continuity-scenario`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiService();
