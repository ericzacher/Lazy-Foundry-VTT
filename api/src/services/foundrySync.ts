import http from 'http';
import { io, Socket } from 'socket.io-client';

const FOUNDRY_URL = process.env.FOUNDRY_URL || 'http://foundry:30000';
const FOUNDRY_ADMIN_PASSWORD = process.env.FOUNDRY_ADMIN_KEY || 'admin';
const FOUNDRY_WORLD = process.env.FOUNDRY_WORLD || 'test';

interface FoundryResponse<T = unknown> {
  success?: boolean;
  data?: T;
  error?: string;
}

interface FoundrySession {
  sessionId: string;
  userId: string | null;
}

interface FoundryDocumentResult {
  type: string;
  action: string;
  broadcast: boolean;
  userId: string;
  result?: unknown[];
  error?: { class: string; message: string; stack: string };
}

/**
 * Foundry VTT Synchronization Service
 * 
 * Foundry VTT v13 does NOT have a REST API for document operations.
 * All document CRUD must be done via socket.io WebSocket connections.
 * 
 * Authentication flow:
 * 1. POST /auth with adminPassword → get session cookie
 * 2. Ensure world is active (POST /setup to launch if needed)
 * 3. Find the Gamemaster user ID from the join page
 * 4. POST /join with userid → authenticate as GM user  
 * 5. Connect socket.io with session as query parameter
 * 6. Use 'modifyDocument' socket event for all CRUD operations
 */
export class FoundrySyncService {
  private baseUrl: string;
  private adminPassword: string;
  private worldName: string;
  private socket: Socket | null = null;
  private sessionCookie: string | null = null;
  private gmUserId: string | null = null;
  private connected = false;

  constructor() {
    this.baseUrl = FOUNDRY_URL;
    this.adminPassword = FOUNDRY_ADMIN_PASSWORD;
    this.worldName = FOUNDRY_WORLD;
  }

  // ─── HTTP Helpers ──────────────────────────────────────────────

  private httpRequest(
    method: string,
    path: string,
    body?: string,
    cookie?: string,
    contentType?: string
  ): Promise<{ status: number; body: string; cookie: string }> {
    return new Promise((resolve, reject) => {
      const url = new URL(this.baseUrl);
      const postData = body || '';
      const options: http.RequestOptions = {
        hostname: url.hostname,
        port: parseInt(url.port) || 30000,
        path,
        method,
        headers: {
          ...(body
            ? {
                'Content-Type': contentType || 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData),
              }
            : {}),
          ...(cookie ? { Cookie: `session=${cookie}` } : {}),
        },
      };

      const req = http.request(options, (res) => {
        let data = '';
        let sessionCookie = cookie || '';
        for (const c of res.headers['set-cookie'] || []) {
          const m = c.match(/session=([^;]+)/);
          if (m) sessionCookie = m[1];
        }
        res.on('data', (chunk: string) => (data += chunk));
        res.on('end', () =>
          resolve({ status: res.statusCode || 0, body: data, cookie: sessionCookie })
        );
      });
      req.on('error', reject);
      req.setTimeout(15000, () => {
        req.destroy();
        reject(new Error('HTTP request timeout'));
      });
      if (body) req.write(postData);
      req.end();
    });
  }

  // ─── Socket Helpers ────────────────────────────────────────────

  private emitAndWait(event: string, data: unknown, timeout = 15000): Promise<FoundryDocumentResult> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }
      const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${event}`)), timeout);
      this.socket.emit(event, data, (response: FoundryDocumentResult) => {
        clearTimeout(timer);
        resolve(response);
      });
    });
  }

  // ─── Connection Management ────────────────────────────────────

  /**
   * Establish authenticated connection to Foundry VTT.
   * This handles the full auth flow: admin auth → world launch → user join → socket connect.
   */
  async connect(): Promise<boolean> {
    if (this.connected && this.socket?.connected) {
      return true;
    }

    try {
      // Disconnect any stale connection
      this.disconnect();

      console.log('[FoundrySync] Connecting to Foundry VTT...');

      // Step 1: Admin auth
      const authRes = await this.httpRequest(
        'POST',
        '/auth',
        `action=adminAuth&adminPassword=${encodeURIComponent(this.adminPassword)}`
      );
      if (!authRes.cookie) {
        console.error('[FoundrySync] Admin auth failed, no session cookie');
        return false;
      }
      this.sessionCookie = authRes.cookie;
      console.log('[FoundrySync] Admin auth successful');

      // Step 2: Check world status
      const statusRes = await this.httpRequest('GET', '/api/status', undefined, this.sessionCookie);
      const status = JSON.parse(statusRes.body);
      console.log('[FoundrySync] World status:', JSON.stringify(status));

      if (!status.active) {
        console.log(`[FoundrySync] Launching world "${this.worldName}"...`);
        await this.httpRequest(
          'POST',
          '/setup',
          `action=launchWorld&world=${encodeURIComponent(this.worldName)}`,
          this.sessionCookie
        );
        // Wait for world to finish launching
        await new Promise((r) => setTimeout(r, 5000));

        const s2 = JSON.parse(
          (await this.httpRequest('GET', '/api/status', undefined, this.sessionCookie)).body
        );
        if (!s2.active) {
          console.error('[FoundrySync] Failed to launch world');
          return false;
        }
        console.log('[FoundrySync] World launched successfully');
      }

      // Step 3: Find GM user ID
      if (!this.gmUserId) {
        await this.discoverGmUser();
      }

      if (!this.gmUserId) {
        console.error('[FoundrySync] Could not find Gamemaster user ID');
        return false;
      }

      // Step 4: Join as the GM user
      const joinRes = await this.httpRequest(
        'POST',
        '/join',
        `action=join&userid=${encodeURIComponent(this.gmUserId)}&password=`,
        this.sessionCookie
      );
      this.sessionCookie = joinRes.cookie;

      if (joinRes.status !== 200 || !joinRes.body.includes('success')) {
        console.error('[FoundrySync] Failed to join as GM user:', joinRes.body);
        return false;
      }
      console.log('[FoundrySync] Joined as Gamemaster');

      // Step 5: Connect socket.io with session as query parameter
      await this.connectSocket();

      return this.connected;
    } catch (error) {
      console.error('[FoundrySync] Connection failed:', error);
      this.disconnect();
      return false;
    }
  }

  /**
   * Discover the Gamemaster user ID from the world database.
   * The GM user is auto-created by Foundry when a world is first launched.
   */
  private async discoverGmUser(): Promise<void> {
    // Connect a temporary socket to get the user list
    const tempSock = io(this.baseUrl, {
      transports: ['websocket'],
      reconnection: false,
      query: { session: this.sessionCookie! },
    });

    try {
      await new Promise<void>((resolve, reject) => {
        tempSock.on('connect', () => resolve());
        tempSock.on('connect_error', (err: Error) => reject(err));
        setTimeout(() => reject(new Error('Socket connect timeout')), 10000);
      });

      // Wait for session event
      const sessionData = await new Promise<FoundrySession>((resolve) => {
        tempSock.once('session', (data: FoundrySession) => resolve(data));
      });

      // If we already have a userId from a previous session, use it
      if (sessionData?.userId) {
        this.gmUserId = sessionData.userId;
        console.log(`[FoundrySync] Found GM user from session: ${this.gmUserId}`);
        tempSock.disconnect();
        return;
      }

      // Try to get world data to find users
      // The "world" event returns full game data when authenticated
      // But we're not authenticated yet, so we'll try getWorldStatus
      const wsResult = await new Promise<unknown>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timeout')), 5000);
        tempSock.emit('getWorldStatus', (data: unknown) => {
          clearTimeout(timer);
          resolve(data);
        });
      }).catch(() => null);

      if (wsResult && typeof wsResult === 'object' && 'users' in (wsResult as Record<string, unknown>)) {
        const users = (wsResult as { users: Array<{ _id: string; role: number; name: string }> }).users;
        const gm = users.find((u) => u.role === 4); // GAMEMASTER = 4
        if (gm) {
          this.gmUserId = gm._id;
          console.log(`[FoundrySync] Found GM user from world status: ${this.gmUserId}`);
        }
      }

      tempSock.disconnect();
    } catch (error) {
      tempSock.disconnect();
      console.warn('[FoundrySync] Could not discover GM user via socket, trying alternative method');
    }

    // If we still don't have a GM user ID, try brute-force join
    // Foundry returns specific errors that help us identify users
    if (!this.gmUserId) {
      // Try common user IDs or use the admin session to list users
      // The Foundry world creates a default Gamemaster user on first launch
      // We can try getting the /join page which may have embedded user data
      console.log('[FoundrySync] Trying to find GM user from join page...');
      const joinPage = await this.httpRequest('GET', '/join', undefined, this.sessionCookie || undefined);
      
      // The join page is rendered client-side by foundry.mjs
      // It doesn't embed user IDs in the HTML
      // As a fallback, try known user ID patterns
      // Foundry uses randomID() which generates 16-char alphanumeric IDs
      
      // Let's try to connect with admin access and create/find the user via setup API
      console.warn('[FoundrySync] GM user discovery failed. Will need manual configuration.');
      console.warn('[FoundrySync] Set FOUNDRY_GM_USER_ID environment variable to the Gamemaster user ID.');
      
      // Check for env var
      this.gmUserId = process.env.FOUNDRY_GM_USER_ID || null;
    }
  }

  /**
   * Connect the socket.io client with authenticated session.
   */
  private async connectSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io(this.baseUrl, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 2000,
        query: { session: this.sessionCookie! },
      });

      const connectTimeout = setTimeout(() => {
        reject(new Error('Socket connection timeout'));
      }, 15000);

      this.socket.on('connect', () => {
        console.log(`[FoundrySync] Socket connected: ${this.socket!.id}`);
      });

      this.socket.once('session', (data: FoundrySession) => {
        clearTimeout(connectTimeout);
        if (data?.userId) {
          this.connected = true;
          console.log(`[FoundrySync] Authenticated as user: ${data.userId}`);
          resolve();
        } else {
          console.error('[FoundrySync] Socket session has no userId:', data);
          reject(new Error('Socket authenticated but no userId in session'));
        }
      });

      this.socket.on('disconnect', (reason: string) => {
        console.log(`[FoundrySync] Socket disconnected: ${reason}`);
        this.connected = false;
      });

      this.socket.on('connect_error', (err: Error) => {
        clearTimeout(connectTimeout);
        console.error('[FoundrySync] Socket connection error:', err.message);
        reject(err);
      });
    });
  }

  /**
   * Disconnect from Foundry VTT.
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.connected = false;
  }

  /**
   * Ensure we have an active authenticated connection, reconnecting if needed.
   */
  private async ensureConnected(): Promise<void> {
    if (!this.connected || !this.socket?.connected) {
      const ok = await this.connect();
      if (!ok) {
        throw new Error('Failed to connect to Foundry VTT');
      }
    }
  }

  // ─── Public API ───────────────────────────────────────────────

  /**
   * Check if Foundry VTT is running and accessible.
   */
  async healthCheck(): Promise<boolean> {
    try {
      const res = await this.httpRequest('GET', '/api/status');
      return res.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * Get the Foundry world status.
   */
  async getStatus(): Promise<{
    active: boolean;
    version?: string;
    world?: string;
    system?: string;
  }> {
    try {
      const res = await this.httpRequest('GET', '/api/status');
      return JSON.parse(res.body);
    } catch {
      return { active: false };
    }
  }

  /**
   * Create a scene (map) in Foundry VTT.
   */
  async createScene(sceneData: {
    name: string;
    width?: number;
    height?: number;
    grid?: { type?: number; size?: number; color?: string; alpha?: number };
    walls?: unknown[];
    lights?: unknown[];
    background?: { src: string };
    tokenVision?: boolean;
    fog?: { exploration: boolean };
    [key: string]: unknown;
  }): Promise<FoundryResponse<{ _id: string }>> {
    try {
      await this.ensureConnected();

      const result = await this.emitAndWait('modifyDocument', {
        action: 'create',
        type: 'Scene',
        operation: {
          data: [sceneData],
          broadcast: true,
        },
      });

      if (result.error) {
        console.error('[FoundrySync] Scene creation error:', result.error.message);
        return { success: false, error: result.error.message };
      }

      const created = (result.result as Array<{ _id: string }>)?.[0];
      console.log(`[FoundrySync] Scene created: ${created?._id} (${sceneData.name})`);
      return { success: true, data: { _id: created?._id } };
    } catch (error) {
      console.error('[FoundrySync] Failed to create scene:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update an existing scene in Foundry VTT.
   */
  async updateScene(sceneId: string, updates: Record<string, unknown>): Promise<FoundryResponse> {
    try {
      await this.ensureConnected();

      const result = await this.emitAndWait('modifyDocument', {
        action: 'update',
        type: 'Scene',
        operation: {
          updates: [{ _id: sceneId, ...updates }],
          broadcast: true,
        },
      });

      if (result.error) {
        return { success: false, error: result.error.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Delete a scene from Foundry VTT.
   */
  async deleteScene(sceneId: string): Promise<FoundryResponse> {
    try {
      await this.ensureConnected();

      const result = await this.emitAndWait('modifyDocument', {
        action: 'delete',
        type: 'Scene',
        operation: {
          ids: [sceneId],
          broadcast: true,
        },
      });

      if (result.error) {
        return { success: false, error: result.error.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create an actor (NPC) in Foundry VTT.
   */
  async createActor(actorData: {
    name: string;
    type: string;
    img?: string;
    system?: Record<string, unknown>;
  }): Promise<FoundryResponse<{ _id: string }>> {
    try {
      await this.ensureConnected();

      const result = await this.emitAndWait('modifyDocument', {
        action: 'create',
        type: 'Actor',
        operation: {
          data: [actorData],
          broadcast: true,
        },
      });

      if (result.error) {
        console.error('[FoundrySync] Actor creation error:', result.error.message);
        return { success: false, error: result.error.message };
      }

      const created = (result.result as Array<{ _id: string }>)?.[0];
      console.log(`[FoundrySync] Actor created: ${created?._id} (${actorData.name})`);
      return { success: true, data: { _id: created?._id } };
    } catch (error) {
      console.error('[FoundrySync] Failed to create actor:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create a token on a scene (embedded document within Scene).
   */
  async createToken(
    sceneId: string,
    tokenData: {
      name: string;
      texture?: { src: string };
      x: number;
      y: number;
      width?: number;
      height?: number;
      disposition?: number;
      actorId?: string;
    }
  ): Promise<FoundryResponse<{ _id: string }>> {
    try {
      await this.ensureConnected();

      const result = await this.emitAndWait('modifyDocument', {
        action: 'create',
        type: 'Token',
        operation: {
          data: [tokenData],
          parentUuid: `Scene.${sceneId}`,
          broadcast: true,
        },
      });

      if (result.error) {
        console.error('[FoundrySync] Token creation error:', result.error.message);
        return { success: false, error: result.error.message };
      }

      const created = (result.result as Array<{ _id: string }>)?.[0];
      return { success: true, data: { _id: created?._id } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create a journal entry in Foundry VTT.
   * In Foundry v11+, journal content goes in "pages" within the JournalEntry.
   */
  async createJournalEntry(journalData: {
    name: string;
    content: string;
    folder?: string;
  }): Promise<FoundryResponse<{ _id: string }>> {
    try {
      await this.ensureConnected();

      // Create the JournalEntry with pages (v11+ format)
      const result = await this.emitAndWait('modifyDocument', {
        action: 'create',
        type: 'JournalEntry',
        operation: {
          data: [
            {
              name: journalData.name,
              folder: journalData.folder || null,
              pages: [
                {
                  name: journalData.name,
                  type: 'text',
                  text: {
                    content: journalData.content,
                    format: 1, // HTML format
                  },
                },
              ],
            },
          ],
          broadcast: true,
        },
      });

      if (result.error) {
        console.error('[FoundrySync] Journal creation error:', result.error.message);
        return { success: false, error: result.error.message };
      }

      const created = (result.result as Array<{ _id: string }>)?.[0];
      console.log(`[FoundrySync] Journal created: ${created?._id} (${journalData.name})`);
      return { success: true, data: { _id: created?._id } };
    } catch (error) {
      console.error('[FoundrySync] Failed to create journal entry:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get all scenes from Foundry VTT.
   */
  async getScenes(): Promise<FoundryResponse<Array<{ _id: string; name: string }>>> {
    try {
      await this.ensureConnected();

      const result = await this.emitAndWait('modifyDocument', {
        action: 'get',
        type: 'Scene',
        operation: {
          query: {},
          broadcast: false,
        },
      });

      if (result.error) {
        return { success: false, error: result.error.message };
      }

      return {
        success: true,
        data: (result.result as Array<{ _id: string; name: string }>) || [],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get all actors from Foundry VTT.
   */
  async getActors(): Promise<FoundryResponse<Array<{ _id: string; name: string }>>> {
    try {
      await this.ensureConnected();

      const result = await this.emitAndWait('modifyDocument', {
        action: 'get',
        type: 'Actor',
        operation: {
          query: {},
          broadcast: false,
        },
      });

      if (result.error) {
        return { success: false, error: result.error.message };
      }

      return {
        success: true,
        data: (result.result as Array<{ _id: string; name: string }>) || [],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create walls on a scene (embedded documents within Scene).
   */
  async createWalls(
    sceneId: string,
    walls: Array<{
      c: [number, number, number, number];
      move?: number;
      sense?: number;
      sound?: number;
      door?: number;
      ds?: number;
    }>
  ): Promise<FoundryResponse> {
    try {
      await this.ensureConnected();

      const result = await this.emitAndWait('modifyDocument', {
        action: 'create',
        type: 'Wall',
        operation: {
          data: walls,
          parentUuid: `Scene.${sceneId}`,
          broadcast: true,
        },
      });

      if (result.error) {
        return { success: false, error: result.error.message };
      }

      console.log(`[FoundrySync] Created ${walls.length} walls on scene ${sceneId}`);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create lights on a scene (embedded documents within Scene).
   */
  async createLights(
    sceneId: string,
    lights: Array<{
      x: number;
      y: number;
      config: {
        dim?: number;
        bright?: number;
        angle?: number;
        color?: string;
        alpha?: number;
        animation?: { type?: string; speed?: number; intensity?: number };
      };
    }>
  ): Promise<FoundryResponse> {
    try {
      await this.ensureConnected();

      const result = await this.emitAndWait('modifyDocument', {
        action: 'create',
        type: 'AmbientLight',
        operation: {
          data: lights,
          parentUuid: `Scene.${sceneId}`,
          broadcast: true,
        },
      });

      if (result.error) {
        return { success: false, error: result.error.message };
      }

      console.log(`[FoundrySync] Created ${lights.length} lights on scene ${sceneId}`);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const foundrySyncService = new FoundrySyncService();
