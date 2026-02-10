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
 * 3. Discover GM user ID via 'getJoinData' socket event (returns world user list)
 * 4. POST /join with JSON body {action, userid, password} — admin session bypasses passwords
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
        // Wait for world to finish launching (migrations can take time)
        for (let i = 0; i < 6; i++) {
          await new Promise((r) => setTimeout(r, 5000));
          const s2 = JSON.parse(
            (await this.httpRequest('GET', '/api/status', undefined, this.sessionCookie)).body
          );
          if (s2.active) {
            console.log('[FoundrySync] World launched successfully');
            break;
          }
          if (i === 5) {
            console.error('[FoundrySync] Failed to launch world after 30s');
            return false;
          }
        }
      }

      // Step 3: Discover GM user ID via getJoinData socket event
      await this.discoverAndPrepareGmUser();

      if (!this.gmUserId) {
        console.error('[FoundrySync] Could not find Gamemaster user ID');
        return false;
      }

      // Step 4: Join as the GM user
      // Use JSON body with admin session — this bypasses user passwords in Foundry v13
      const joinRes = await this.httpRequest(
        'POST',
        '/join',
        JSON.stringify({ action: 'join', userid: this.gmUserId, password: '' }),
        this.sessionCookie,
        'application/json'
      );
      this.sessionCookie = joinRes.cookie;

      if (joinRes.status !== 200 || !joinRes.body.includes('success')) {
        console.error('[FoundrySync] Failed to join as GM user:', joinRes.body);
        return false;
      }
      console.log('[FoundrySync] Joined as Gamemaster');

      // Step 5: Connect socket.io with session as query parameter
      await this.connectSocket();

      // Step 6: Clear GM password so browser users can join without one
      // Foundry v13 auto-generates a random password for the GM user on world creation.
      // We clear it here so users visiting http://localhost:30000/join can log in freely.
      await this.clearGmPassword();

      return this.connected;
    } catch (error) {
      console.error('[FoundrySync] Connection failed:', error);
      this.disconnect();
      return false;
    }
  }

  /**
   * Discover the Gamemaster user ID using the admin socket's getJoinData event.
   * 
   * Foundry v13 exposes a 'getJoinData' socket event that returns the world's
   * user list (the same data the /join page renders). This works reliably from
   * an admin-authenticated socket connection without needing to be joined to
   * the world first.
   * 
   * Password clearing happens separately in clearGmPassword() after the GM
   * socket is connected, since modifyDocument requires a world-joined session.
   */
  private async discoverAndPrepareGmUser(): Promise<void> {
    // Check env var first
    if (process.env.FOUNDRY_GM_USER_ID) {
      this.gmUserId = process.env.FOUNDRY_GM_USER_ID;
      console.log(`[FoundrySync] Using GM user ID from env: ${this.gmUserId}`);
      return;
    }

    // Connect a temporary socket with the admin session
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

      // Use getJoinData to retrieve the world's user list
      // This is the same event the /join page uses to populate the user dropdown
      const joinData = await new Promise<{ users?: Array<{ _id: string; name: string; role: number }> }>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timeout getting join data')), 10000);
        tempSock.emit('getJoinData', (data: { users?: Array<{ _id: string; name: string; role: number }> }) => {
          clearTimeout(timer);
          resolve(data);
        });
      });

      tempSock.disconnect();

      const users = joinData.users;
      if (!users || !Array.isArray(users) || users.length === 0) {
        console.warn('[FoundrySync] No users returned from getJoinData');
        return;
      }

      console.log(`[FoundrySync] Found ${users.length} user(s) in world`);

      // Find the Gamemaster (role 4 = GAMEMASTER)
      const gm = users.find((u) => u.role === 4);
      if (!gm) {
        console.error('[FoundrySync] No Gamemaster user found in world');
        return;
      }

      this.gmUserId = gm._id;
      console.log(`[FoundrySync] Found GM user: ${gm.name} (${gm._id})`);
    } catch (error) {
      tempSock.disconnect();
      console.error('[FoundrySync] GM user discovery failed:', error);
      this.gmUserId = process.env.FOUNDRY_GM_USER_ID || null;
    }
  }

  /**
   * Clear the GM user's password so browser users can join Foundry without one.
   * 
   * Foundry v13 auto-generates a random password for the Gamemaster user when
   * creating a world. This method uses the GM-authenticated socket to clear it
   * via modifyDocument with the 'operation' wrapper format that Foundry v13 expects.
   * 
   * This is a non-critical step — if it fails, our service still works (we bypass
   * passwords via admin session + JSON join), but browser users would be locked out.
   */
  private async clearGmPassword(): Promise<void> {
    if (!this.socket?.connected || !this.gmUserId) return;

    try {
      const result = await this.emitAndWait('modifyDocument', {
        type: 'User',
        action: 'update',
        operation: {
          updates: [{ _id: this.gmUserId, password: '' }],
          broadcast: false,
          pack: null,
        },
      });

      if (result.error) {
        console.warn('[FoundrySync] Could not clear GM password:', result.error.message);
      } else {
        console.log('[FoundrySync] GM password cleared for browser access');
      }
    } catch (error) {
      // Non-critical — log and continue
      console.warn('[FoundrySync] Failed to clear GM password (non-critical):', error);
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
