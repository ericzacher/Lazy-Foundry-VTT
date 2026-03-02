import type { AuthResponse, Campaign, Session, User, NPC, SessionResult, MapData, TokenData, CampaignSummary, TimelineEvent, NPCHistoryEntry, NPCStatus, CharacterData, StoreData, RestoreResult, CampaignPlayer, JoinInfo, PlayerPortalData, SessionZeroData, PartyHooks } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '';

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

  async deleteNPC(campaignId: string, npcId: string): Promise<void> {
    return this.request<void>(`/api/generate/campaigns/${campaignId}/npcs/${npcId}`, {
      method: 'DELETE',
    });
  }

  async deleteMap(campaignId: string, mapId: string): Promise<void> {
    return this.request<void>(`/api/generate/campaigns/${campaignId}/maps/${mapId}`, {
      method: 'DELETE',
    });
  }

  async deleteTimelineEvent(campaignId: string, eventId: string): Promise<void> {
    return this.request<void>(`/api/campaigns/${campaignId}/timeline/${eventId}`, {
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
      monsterType?: string;
      monstersPerEncounter?: number;
    },
    mapSize?: 'small' | 'medium' | 'large',
    fogOfWar?: boolean
  ): Promise<{ map: MapData }> {
    return this.request(`/api/generate/campaigns/${campaignId}/maps`, {
      method: 'POST',
      body: JSON.stringify({ description, mapType, mapSize, sessionId, encounterConfig, fogOfWar }),
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

  // Add encounters to existing map
  async addEncountersToMap(
    campaignId: string,
    mapId: string,
    encounterConfig: {
      count: number;
      difficulty: 'easy' | 'medium' | 'hard' | 'deadly';
      partyLevel: number;
      partySize: number;
      monsterType?: string;
    }
  ): Promise<{ map: MapData; encounters: unknown[] }> {
    return this.request(`/api/generate/campaigns/${campaignId}/maps/${mapId}/encounters`, {
      method: 'POST',
      body: JSON.stringify({ encounterConfig }),
    });
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

  async getFoundryScenes(): Promise<{ scenes: Array<{ _id: string; name: string }> }> {
    return this.request('/api/foundry/scenes');
  }

  async getFoundryActors(): Promise<{ actors: Array<{ _id: string; name: string }> }> {
    return this.request('/api/foundry/actors');
  }

  async deleteFoundryScene(sceneId: string): Promise<void> {
    return this.request<void>(`/api/foundry/scenes/${sceneId}`, {
      method: 'DELETE',
    });
  }

  async deleteFoundryActor(actorId: string): Promise<void> {
    return this.request<void>(`/api/foundry/actors/${actorId}`, {
      method: 'DELETE',
    });
  }

  async deleteFoundryJournal(journalId: string): Promise<void> {
    return this.request<void>(`/api/foundry/journals/${journalId}`, { method: 'DELETE' });
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

  // Character Creator (public — no auth token required)
  async getFoundryPlayers(): Promise<{ success: boolean; players: Array<{ _id: string; name: string; role: number }> }> {
    return this.request('/api/characters/foundry-players');
  }

  async syncCharacterToFoundry(data: CharacterData): Promise<{ success: boolean; foundryActorId: string; name: string }> {
    return this.request('/api/characters/sync', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async generateAICharacter(concept: string): Promise<{ success: boolean; character: CharacterData }> {
    return this.request('/api/characters/generate-ai', {
      method: 'POST',
      body: JSON.stringify({ concept }),
    });
  }

  async generateCharacterLore(data: {
    name?: string;
    race: string;
    subrace?: string;
    class: string;
    subclass?: string;
    background: string;
    alignment: string;
  }): Promise<{ success: boolean; backstory: string; personalityTraits: string[]; ideals: string; bonds: string; flaws: string }> {
    return this.request('/api/characters/generate-lore', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Stores
  async generateStore(params: {
    settlementSize: string;
    storeType: string;
    racialInfluence: string;
    biome: string;
    maxRarity?: string;
    stockSize?: string;
    magicItems?: boolean;
    campaignId?: string;
    locationName?: string;
    campaignContext?: { setting?: string; theme?: string; tone?: string; worldSummary?: string };
  }): Promise<{ success: boolean; store: StoreData }> {
    return this.request('/api/stores/generate', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getStores(campaignId?: string): Promise<{ stores: StoreData[] }> {
    const qs = campaignId ? `?campaignId=${campaignId}` : '';
    return this.request(`/api/stores${qs}`);
  }

  async getStore(id: string): Promise<{ store: StoreData }> {
    return this.request(`/api/stores/${id}`);
  }

  async deleteStore(id: string): Promise<void> {
    return this.request<void>(`/api/stores/${id}`, { method: 'DELETE' });
  }

  async exportStoreToFoundry(id: string): Promise<{ success: boolean; foundryJournalId: string }> {
    return this.request(`/api/stores/${id}/foundry-export`, { method: 'POST' });
  }

  // Backups
  private async downloadBlob(endpoint: string, fallbackFilename: string): Promise<void> {
    const headers: Record<string, string> = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    const res = await fetch(`${API_URL}${endpoint}`, { headers });
    if (!res.ok) throw new Error('Download failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const disposition = res.headers.get('Content-Disposition');
    a.download = disposition?.match(/filename="(.+)"/)?.[1] || fallbackFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async downloadFullBackup(): Promise<void> {
    return this.downloadBlob('/api/backups/full', 'lazy-foundry-full-backup.zip');
  }

  async downloadCampaignBackup(campaignId: string): Promise<void> {
    return this.downloadBlob(`/api/backups/campaigns/${campaignId}`, 'lazy-foundry-campaign-backup.zip');
  }

  async restoreFullBackup(file: File): Promise<RestoreResult> {
    const formData = new FormData();
    formData.append('backup', file);
    const headers: Record<string, string> = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    const res = await fetch(`${API_URL}/api/backups/restore/full`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Restore failed' }));
      throw new Error(err.error || 'Restore failed');
    }
    return res.json();
  }

  async restoreCampaignBackup(file: File, campaignId?: string): Promise<RestoreResult> {
    const formData = new FormData();
    formData.append('backup', file);
    const headers: Record<string, string> = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    const endpoint = campaignId
      ? `/api/backups/restore/campaign/${campaignId}`
      : '/api/backups/restore/campaign';
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Restore failed' }));
      throw new Error(err.error || 'Restore failed');
    }
    return res.json();
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

  // ─── Player Onboarding ────────────────────────────────────────

  // Campaign roster (auth-required)
  async getCampaignPlayers(campaignId: string): Promise<{ players: CampaignPlayer[]; inviteCode?: string }> {
    return this.request(`/api/campaigns/${campaignId}/players`);
  }

  async addCampaignPlayer(campaignId: string, data: { playerName: string }): Promise<CampaignPlayer> {
    return this.request(`/api/campaigns/${campaignId}/players`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async removeCampaignPlayer(campaignId: string, playerId: string): Promise<void> {
    return this.request<void>(`/api/campaigns/${campaignId}/players/${playerId}`, {
      method: 'DELETE',
    });
  }

  async generateInviteCode(campaignId: string): Promise<{ inviteCode: string }> {
    return this.request(`/api/campaigns/${campaignId}/invite-code`, {
      method: 'POST',
    });
  }

  // Public invite endpoints (no auth)
  async getJoinInfo(inviteCode: string): Promise<JoinInfo> {
    return this.request(`/api/invite/join/${inviteCode}`);
  }

  async joinCampaign(inviteCode: string, playerName: string): Promise<{ player: CampaignPlayer; campaignId: string }> {
    return this.request(`/api/invite/join/${inviteCode}`, {
      method: 'POST',
      body: JSON.stringify({ playerName }),
    });
  }

  async updateCampaignPlayer(playerId: string, data: Partial<CampaignPlayer>): Promise<CampaignPlayer> {
    return this.request(`/api/invite/players/${playerId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async fixPlayerPermissions(playerId: string): Promise<{ success: boolean }> {
    return this.request(`/api/invite/players/${playerId}/fix-permissions`, { method: 'POST' });
  }

  // Player portal (public)
  async getPlayerPortal(playerId: string): Promise<PlayerPortalData> {
    return this.request(`/api/invite/portal/${playerId}`);
  }

  // Session Zero (auth-required)
  async getSessionZero(campaignId: string): Promise<SessionZeroData> {
    return this.request(`/api/campaigns/${campaignId}/session-zero`);
  }

  async generatePartyHooks(campaignId: string): Promise<PartyHooks> {
    return this.request(`/api/campaigns/${campaignId}/session-zero/party-hooks`, {
      method: 'POST',
    });
  }

  async regenerateLoreForParty(campaignId: string): Promise<{ campaign: Campaign; lore: unknown }> {
    return this.request(`/api/campaigns/${campaignId}/session-zero/regenerate-lore`, {
      method: 'POST',
    });
  }

  async createSessionOne(campaignId: string): Promise<{ session: Session; scenario: unknown }> {
    return this.request(`/api/campaigns/${campaignId}/session-zero/create-session-one`, {
      method: 'POST',
    });
  }
}

export const api = new ApiService();
