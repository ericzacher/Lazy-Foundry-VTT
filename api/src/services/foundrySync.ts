import fetch from 'node-fetch';

const FOUNDRY_URL = process.env.FOUNDRY_URL || 'http://foundry:30000';
const FOUNDRY_ADMIN_KEY = process.env.FOUNDRY_ADMIN_KEY || '';

interface FoundryResponse<T = unknown> {
  success?: boolean;
  data?: T;
  error?: string;
}

/**
 * Foundry VTT Synchronization Service
 * Pushes generated content (maps, NPCs, lore) to Foundry VTT instances
 */
export class FoundrySyncService {
  private baseUrl: string;
  private adminKey: string;

  constructor() {
    this.baseUrl = FOUNDRY_URL;
    this.adminKey = FOUNDRY_ADMIN_KEY;
  }

  /**
   * Get headers for Foundry API requests
   */
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.adminKey}`,
    };
  }

  /**
   * Check if Foundry VTT is running and accessible
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try the root API endpoint first
      const response = await fetch(`${this.baseUrl}/api/status`, {
        method: 'GET',
        headers: this.getHeaders(),
        timeout: 5000,
      });
      
      // Foundry returns 200 even if no world is active, so we just check if it responds
      return response.status < 500;
    } catch (error) {
      console.error('Foundry health check failed:', error);
      return false;
    }
  }

  /**
   * Create a scene (map) in Foundry VTT
   */
  async createScene(sceneData: {
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
      dir: number;
      light: number;
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
      hidden: boolean;
      rotation: number;
    }>;
    background?: { src: string };
    tokenVision?: boolean;
    fog?: { exploration: boolean };
  }): Promise<FoundryResponse<{ _id: string }>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/scenes`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(sceneData),
        timeout: 30000,
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Foundry actor creation failed:', {
          status: response.status,
          url: `${this.baseUrl}/api/actors`,
          error: error
        });
        throw new Error(`Foundry API error: ${response.status} - ${error}`);
      }

      const result = await response.json();
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to create scene in Foundry:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update an existing scene in Foundry VTT
   */
  async updateScene(
    sceneId: string,
    updates: Partial<{
      name: string;
      active: boolean;
      navigation: boolean;
      walls: unknown[];
      lights: unknown[];
    }>
  ): Promise<FoundryResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/scenes/${sceneId}`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify(updates),
        timeout: 30000,
      });

      if (!response.ok) {
        throw new Error(`Foundry API error: ${response.status}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to update scene in Foundry:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Delete a scene from Foundry VTT
   */
  async deleteScene(sceneId: string): Promise<FoundryResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/scenes/${sceneId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
        timeout: 10000,
      });

      if (!response.ok) {
        throw new Error(`Foundry API error: ${response.status}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to delete scene from Foundry:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create an actor (NPC) in Foundry VTT
   */
  async createActor(actorData: {
    name: string;
    type: string; // 'character' or 'npc'
    img?: string;
    system?: {
      abilities?: Record<
        string,
        { value: number; proficient?: number; bonuses?: unknown }
      >;
      attributes?: {
        hp?: { value: number; max: number };
        ac?: { value: number };
        speed?: { value: number };
      };
      details?: {
        biography?: { value: string };
        alignment?: string;
        race?: string;
      };
      traits?: {
        size?: string;
        di?: { value: string[] };
        dr?: { value: string[] };
        dv?: { value: string[] };
        ci?: { value: string[] };
      };
    };
  }): Promise<FoundryResponse<{ _id: string }>> {
    try {
      // Note: Foundry v11+ requires proper world context and may need different API paths
      const response = await fetch(`${this.baseUrl}/api/actors`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(actorData),
        timeout: 30000,
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Foundry actor creation error:', response.status, error);
        throw new Error(`Foundry API error: ${response.status} - ${error}`);
      }

      const result = await response.json();
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to create actor in Foundry:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create a token on a scene
   */
  async createToken(
    sceneId: string,
    tokenData: {
      actorId?: string;
      name: string;
      img: string;
      x: number;
      y: number;
      width: number;
      height: number;
      scale: number;
      disposition: number; // -1=hostile, 0=neutral, 1=friendly
      displayName: number;
      displayBars: number;
      bar1?: { attribute: string };
      bar2?: { attribute: string };
      vision?: {
        enabled: boolean;
        range: number;
        angle: number;
        visionMode: string;
      };
      detectionModes?: Array<{
        id: string;
        enabled: boolean;
        range: number;
      }>;
    }
  ): Promise<FoundryResponse<{ _id: string }>> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/scenes/${sceneId}/tokens`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(tokenData),
          timeout: 30000,
        }
      );

      if (!response.ok) {
        throw new Error(`Foundry API error: ${response.status}`);
      }

      const result = await response.json();
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to create token in Foundry:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create a journal entry (for lore, notes, handouts)
   */
  async createJournalEntry(journalData: {
    name: string;
    content: string;
    folder?: string;
    ownership?: Record<string, number>;
  }): Promise<FoundryResponse<{ _id: string }>> {
    try {
      // Note: Foundry v11+ uses 'JournalEntry' documents, API path might be /api/journal-entries
      const response = await fetch(`${this.baseUrl}/api/journal-entries`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(journalData),
        timeout: 30000,
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Foundry journal creation error:', response.status, error);
        throw new Error(`Foundry API error: ${response.status} - ${error}`);
      }

      const result = await response.json();
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to create journal entry in Foundry:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get all scenes from Foundry VTT
   */
  async getScenes(): Promise<FoundryResponse<Array<{ _id: string; name: string }>>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/scenes`, {
        method: 'GET',
        headers: this.getHeaders(),
        timeout: 10000,
      });

      if (!response.ok) {
        throw new Error(`Foundry API error: ${response.status}`);
      }

      const scenes = await response.json();
      return { success: true, data: scenes };
    } catch (error) {
      console.error('Failed to get scenes from Foundry:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get all actors from Foundry VTT
   */
  async getActors(): Promise<FoundryResponse<Array<{ _id: string; name: string }>>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/actors`, {
        method: 'GET',
        headers: this.getHeaders(),
        timeout: 10000,
      });

      if (!response.ok) {
        throw new Error(`Foundry API error: ${response.status}`);
      }

      const actors = await response.json();
      return { success: true, data: actors };
    } catch (error) {
      console.error('Failed to get actors from Foundry:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const foundrySyncService = new FoundrySyncService();
