import type { AuthResponse, Campaign, Session, User, NPC } from '../types';

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
      throw new Error(error.error || 'Request failed');
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
}

export const api = new ApiService();
