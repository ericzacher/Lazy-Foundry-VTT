import archiver from 'archiver';
import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { Campaign } from '../entities/Campaign';
import { Session } from '../entities/Session';
import { SessionResult } from '../entities/SessionResult';
import { NPC } from '../entities/NPC';
import { NPCHistory } from '../entities/NPCHistory';
import { Map as MapEntity } from '../entities/Map';
import { Token } from '../entities/Token';
import { TimelineEvent } from '../entities/TimelineEvent';
import { Store } from '../entities/Store';
import { foundrySyncService } from './foundrySync';
import { logInfo, logError } from '../utils/logger';

const ASSETS_DIR = '/app/assets';

interface ManifestData {
  version: string;
  type: 'full' | 'campaign';
  campaignId?: string;
  campaignName?: string;
  createdAt: string;
  records: Record<string, number>;
  assets: { maps: number; tokens: number };
}

export interface RestoreResult {
  success: boolean;
  manifest: ManifestData;
  created: Record<string, number>;
  errors: string[];
}

function stripPasswords(users: User[]): Record<string, unknown>[] {
  return users.map(({ passwordHash, ...rest }) => rest);
}

function collectAssetPaths(
  maps: MapEntity[],
  npcs: NPC[],
  tokens: Token[]
): { maps: string[]; tokens: string[] } {
  const mapPaths: string[] = [];
  const tokenPaths: string[] = [];

  for (const m of maps) {
    if (m.imageUrl) {
      // imageUrl is like /api/assets/maps/xxx.png — extract relative path
      const rel = m.imageUrl.replace(/^\/api\/assets\//, '');
      const abs = path.join(ASSETS_DIR, rel);
      if (fs.existsSync(abs)) mapPaths.push(rel);
    }
  }

  for (const n of npcs) {
    if (n.tokenImageUrl) {
      const rel = n.tokenImageUrl.replace(/^\/api\/assets\//, '');
      const abs = path.join(ASSETS_DIR, rel);
      if (fs.existsSync(abs)) tokenPaths.push(rel);
    }
  }

  for (const t of tokens) {
    if (t.imageUrl) {
      const rel = t.imageUrl.replace(/^\/api\/assets\//, '');
      const abs = path.join(ASSETS_DIR, rel);
      if (fs.existsSync(abs)) tokenPaths.push(rel);
    }
  }

  return { maps: [...new Set(mapPaths)], tokens: [...new Set(tokenPaths)] };
}

// ─── Export ─────────────────────────────────────────────────────

export async function createFullBackup(
  archive: archiver.Archiver
): Promise<ManifestData> {
  const users = await AppDataSource.getRepository(User).find();
  const campaigns = await AppDataSource.getRepository(Campaign).find();
  const sessions = await AppDataSource.getRepository(Session).find();
  const sessionResults = await AppDataSource.getRepository(SessionResult).find();
  const npcs = await AppDataSource.getRepository(NPC).find();
  const npcHistory = await AppDataSource.getRepository(NPCHistory).find();
  const maps = await AppDataSource.getRepository(MapEntity).find();
  const tokens = await AppDataSource.getRepository(Token).find();
  const timelineEvents = await AppDataSource.getRepository(TimelineEvent).find();
  const stores = await AppDataSource.getRepository(Store).find();

  // Database JSON
  archive.append(JSON.stringify(stripPasswords(users), null, 2), { name: 'database/users.json' });
  archive.append(JSON.stringify(campaigns, null, 2), { name: 'database/campaigns.json' });
  archive.append(JSON.stringify(sessions, null, 2), { name: 'database/sessions.json' });
  archive.append(JSON.stringify(sessionResults, null, 2), { name: 'database/session_results.json' });
  archive.append(JSON.stringify(npcs, null, 2), { name: 'database/npcs.json' });
  archive.append(JSON.stringify(npcHistory, null, 2), { name: 'database/npc_history.json' });
  archive.append(JSON.stringify(maps, null, 2), { name: 'database/maps.json' });
  archive.append(JSON.stringify(tokens, null, 2), { name: 'database/tokens.json' });
  archive.append(JSON.stringify(timelineEvents, null, 2), { name: 'database/timeline_events.json' });
  archive.append(JSON.stringify(stores, null, 2), { name: 'database/stores.json' });

  // Asset files
  const assetPaths = collectAssetPaths(maps, npcs, tokens);
  for (const rel of [...assetPaths.maps, ...assetPaths.tokens]) {
    const abs = path.join(ASSETS_DIR, rel);
    archive.file(abs, { name: `assets/${rel}` });
  }

  // Foundry snapshot (best-effort)
  try {
    const [actorsRes, scenesRes] = await Promise.all([
      foundrySyncService.getActors(),
      foundrySyncService.getScenes(),
    ]);
    if (actorsRes.success) {
      archive.append(JSON.stringify(actorsRes.data, null, 2), { name: 'foundry/actors.json' });
    }
    if (scenesRes.success) {
      archive.append(JSON.stringify(scenesRes.data, null, 2), { name: 'foundry/scenes.json' });
    }
  } catch {
    logInfo('Foundry not connected, skipping foundry snapshot in backup');
  }

  const manifest: ManifestData = {
    version: '1.0.0',
    type: 'full',
    createdAt: new Date().toISOString(),
    records: {
      users: users.length,
      campaigns: campaigns.length,
      sessions: sessions.length,
      session_results: sessionResults.length,
      npcs: npcs.length,
      npc_history: npcHistory.length,
      maps: maps.length,
      tokens: tokens.length,
      timeline_events: timelineEvents.length,
      stores: stores.length,
    },
    assets: { maps: assetPaths.maps.length, tokens: assetPaths.tokens.length },
  };

  archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });

  return manifest;
}

export async function createCampaignBackup(
  archive: archiver.Archiver,
  campaignId: string,
  userId: string
): Promise<ManifestData> {
  const campaign = await AppDataSource.getRepository(Campaign).findOneByOrFail({ id: campaignId, ownerId: userId });
  const sessions = await AppDataSource.getRepository(Session).find({ where: { campaignId } });
  const sessionIds = sessions.map((s) => s.id);

  const sessionResults = sessionIds.length > 0
    ? await AppDataSource.getRepository(SessionResult)
        .createQueryBuilder('sr')
        .where('sr.sessionId IN (:...ids)', { ids: sessionIds })
        .getMany()
    : [];

  const npcs = await AppDataSource.getRepository(NPC).find({ where: { campaignId } });
  const npcIds = npcs.map((n) => n.id);

  const npcHistory = npcIds.length > 0
    ? await AppDataSource.getRepository(NPCHistory)
        .createQueryBuilder('nh')
        .where('nh.npcId IN (:...ids)', { ids: npcIds })
        .getMany()
    : [];

  const maps = await AppDataSource.getRepository(MapEntity).find({ where: { campaignId } });
  const tokens = await AppDataSource.getRepository(Token).find({ where: { campaignId } });
  const timelineEvents = await AppDataSource.getRepository(TimelineEvent).find({ where: { campaignId } });
  const stores = await AppDataSource.getRepository(Store).find({ where: { campaignId } });

  archive.append(JSON.stringify([campaign], null, 2), { name: 'database/campaigns.json' });
  archive.append(JSON.stringify(sessions, null, 2), { name: 'database/sessions.json' });
  archive.append(JSON.stringify(sessionResults, null, 2), { name: 'database/session_results.json' });
  archive.append(JSON.stringify(npcs, null, 2), { name: 'database/npcs.json' });
  archive.append(JSON.stringify(npcHistory, null, 2), { name: 'database/npc_history.json' });
  archive.append(JSON.stringify(maps, null, 2), { name: 'database/maps.json' });
  archive.append(JSON.stringify(tokens, null, 2), { name: 'database/tokens.json' });
  archive.append(JSON.stringify(timelineEvents, null, 2), { name: 'database/timeline_events.json' });
  archive.append(JSON.stringify(stores, null, 2), { name: 'database/stores.json' });

  const assetPaths = collectAssetPaths(maps, npcs, tokens);
  for (const rel of [...assetPaths.maps, ...assetPaths.tokens]) {
    const abs = path.join(ASSETS_DIR, rel);
    archive.file(abs, { name: `assets/${rel}` });
  }

  const manifest: ManifestData = {
    version: '1.0.0',
    type: 'campaign',
    campaignId: campaign.id,
    campaignName: campaign.name,
    createdAt: new Date().toISOString(),
    records: {
      campaigns: 1,
      sessions: sessions.length,
      session_results: sessionResults.length,
      npcs: npcs.length,
      npc_history: npcHistory.length,
      maps: maps.length,
      tokens: tokens.length,
      timeline_events: timelineEvents.length,
      stores: stores.length,
    },
    assets: { maps: assetPaths.maps.length, tokens: assetPaths.tokens.length },
  };

  archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });
  return manifest;
}

// ─── Restore helpers ────────────────────────────────────────────

function readJsonFromZip<T>(zip: AdmZip, entryName: string): T[] {
  const entry = zip.getEntry(entryName);
  if (!entry) return [];
  return JSON.parse(entry.getData().toString('utf8'));
}

function extractAssets(zip: AdmZip): void {
  for (const entry of zip.getEntries()) {
    if (entry.entryName.startsWith('assets/') && !entry.isDirectory) {
      const rel = entry.entryName.replace(/^assets\//, '');
      const dest = path.join(ASSETS_DIR, rel);
      const dir = path.dirname(dest);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(dest, entry.getData());
    }
  }
}

function remapImageUrl(url: string | undefined | null, assetIdMap: Map<string, string>): string | undefined {
  if (!url) return undefined;
  // For now keep the same URL — asset files are extracted with same paths
  return url;
}

// ─── Restore: Full ─────────────────────────────────────────────

export async function restoreFullBackup(
  zipBuffer: Buffer,
  userId: string
): Promise<RestoreResult> {
  const zip = new AdmZip(zipBuffer);
  const manifest = readJsonFromZip<ManifestData>(zip, 'manifest.json');
  const manifestData: ManifestData = (manifest as unknown as ManifestData[])[0] ?? JSON.parse(zip.getEntry('manifest.json')!.getData().toString('utf8'));

  if (manifestData.type !== 'full') {
    return { success: false, manifest: manifestData, created: {}, errors: ['Expected a full backup, got: ' + manifestData.type] };
  }

  const errors: string[] = [];
  const created: Record<string, number> = {};

  // Read all data from zip
  const users = readJsonFromZip<any>(zip, 'database/users.json');
  const campaigns = readJsonFromZip<any>(zip, 'database/campaigns.json');
  const sessions = readJsonFromZip<any>(zip, 'database/sessions.json');
  const sessionResults = readJsonFromZip<any>(zip, 'database/session_results.json');
  const npcs = readJsonFromZip<any>(zip, 'database/npcs.json');
  const npcHistory = readJsonFromZip<any>(zip, 'database/npc_history.json');
  const maps = readJsonFromZip<any>(zip, 'database/maps.json');
  const tokens = readJsonFromZip<any>(zip, 'database/tokens.json');
  const timelineEvents = readJsonFromZip<any>(zip, 'database/timeline_events.json');
  const stores = readJsonFromZip<any>(zip, 'database/stores.json');

  await AppDataSource.transaction(async (manager) => {
    // ID remapping tables
    const userIdMap = new Map<string, string>();
    const campaignIdMap = new Map<string, string>();
    const sessionIdMap = new Map<string, string>();
    const npcIdMap = new Map<string, string>();

    // 1. Users — match by email or create
    for (const u of users) {
      const existing = await manager.getRepository(User).findOneBy({ email: u.email });
      if (existing) {
        userIdMap.set(u.id, existing.id);
      } else {
        const newId = uuidv4();
        userIdMap.set(u.id, newId);
        await manager.getRepository(User).insert({
          id: newId,
          email: u.email,
          username: u.username,
          passwordHash: '$2b$10$placeholder_needs_password_reset',
          isActive: u.isActive ?? true,
        });
        created.users = (created.users ?? 0) + 1;
      }
    }

    // 2. Campaigns
    for (const c of campaigns) {
      const newId = uuidv4();
      campaignIdMap.set(c.id, newId);
      await manager.getRepository(Campaign).insert({
        id: newId,
        name: c.name,
        description: c.description,
        setting: c.setting,
        theme: c.theme,
        tone: c.tone,
        playerCount: c.playerCount,
        partyLevel: c.partyLevel,
        worldLore: c.worldLore,
        rules: c.rules,
        ownerId: userIdMap.get(c.ownerId) ?? userId,
      });
      created.campaigns = (created.campaigns ?? 0) + 1;
    }

    // 3. Sessions
    for (const s of sessions) {
      const newId = uuidv4();
      sessionIdMap.set(s.id, newId);
      const mappedCampaignId = campaignIdMap.get(s.campaignId);
      if (!mappedCampaignId) { errors.push(`Session "${s.title}": campaign not found`); continue; }
      await manager.getRepository(Session).insert({
        id: newId,
        campaignId: mappedCampaignId,
        sessionNumber: s.sessionNumber,
        title: s.title,
        description: s.description,
        scheduledDate: s.scheduledDate,
        completedDate: s.completedDate,
        status: s.status,
        scenario: s.scenario,
        npcIds: (s.npcIds ?? []).map((nid: string) => npcIdMap.get(nid) ?? nid),
        mapIds: s.mapIds ?? [],
      });
      created.sessions = (created.sessions ?? 0) + 1;
    }

    // 4. NPCs
    for (const n of npcs) {
      const newId = uuidv4();
      npcIdMap.set(n.id, newId);
      const mappedCampaignId = campaignIdMap.get(n.campaignId);
      if (!mappedCampaignId) { errors.push(`NPC "${n.name}": campaign not found`); continue; }
      await manager.getRepository(NPC).insert({
        id: newId,
        campaignId: mappedCampaignId,
        name: n.name,
        role: n.role,
        description: n.description,
        personality: n.personality,
        motivations: n.motivations ?? [],
        background: n.background,
        stats: n.stats,
        tokenImageUrl: n.tokenImageUrl,
        encounterSessionIds: (n.encounterSessionIds ?? []).map((sid: string) => sessionIdMap.get(sid) ?? sid),
        foundryActorId: undefined,
        syncStatus: 'never',
        lastSyncedAt: undefined,
      });
      created.npcs = (created.npcs ?? 0) + 1;
    }

    // Now remap npcIds in sessions (NPCs created after sessions)
    for (const s of sessions) {
      const newSessionId = sessionIdMap.get(s.id);
      if (!newSessionId) continue;
      const remappedNpcIds = (s.npcIds ?? []).map((nid: string) => npcIdMap.get(nid) ?? nid);
      await manager.getRepository(Session).update(newSessionId, { npcIds: remappedNpcIds });
    }

    // 5. SessionResults
    for (const sr of sessionResults) {
      const mappedSessionId = sessionIdMap.get(sr.sessionId);
      if (!mappedSessionId) { errors.push(`SessionResult: session not found`); continue; }
      await manager.getRepository(SessionResult).insert({
        id: uuidv4(),
        sessionId: mappedSessionId,
        summary: sr.summary,
        events: sr.events ?? [],
        npcInteractions: sr.npcInteractions,
        playerDecisions: sr.playerDecisions ?? [],
        worldChanges: sr.worldChanges,
        unfinishedThreads: sr.unfinishedThreads ?? [],
        plotAdvancement: sr.plotAdvancement,
        characterDevelopment: sr.characterDevelopment,
        durationMinutes: sr.durationMinutes,
        xpAwarded: sr.xpAwarded,
        lootAwarded: sr.lootAwarded,
        deathCount: sr.deathCount ?? 0,
        captureMethod: sr.captureMethod,
        transcript: sr.transcript,
        mood: sr.mood,
      });
      created.session_results = (created.session_results ?? 0) + 1;
    }

    // 6. NPCHistory
    for (const nh of npcHistory) {
      const mappedNpcId = npcIdMap.get(nh.npcId);
      const mappedSessionId = sessionIdMap.get(nh.sessionId);
      if (!mappedNpcId || !mappedSessionId) { errors.push(`NPCHistory: FK not found`); continue; }
      await manager.getRepository(NPCHistory).insert({
        id: uuidv4(),
        npcId: mappedNpcId,
        sessionId: mappedSessionId,
        alignmentBefore: nh.alignmentBefore,
        alignmentAfter: nh.alignmentAfter,
        loyaltyBefore: nh.loyaltyBefore,
        loyaltyAfter: nh.loyaltyAfter,
        statusBefore: nh.statusBefore,
        statusAfter: nh.statusAfter,
        relationshipChange: nh.relationshipChange,
        notes: nh.notes,
        eventsInvolved: nh.eventsInvolved,
      });
      created.npc_history = (created.npc_history ?? 0) + 1;
    }

    // 7. Maps
    const mapIdMap = new Map<string, string>();
    for (const m of maps) {
      const newId = uuidv4();
      mapIdMap.set(m.id, newId);
      const mappedCampaignId = campaignIdMap.get(m.campaignId);
      if (!mappedCampaignId) { errors.push(`Map "${m.name}": campaign not found`); continue; }
      await manager.getRepository(MapEntity).insert({
        id: newId,
        campaignId: mappedCampaignId,
        sessionId: m.sessionId ? sessionIdMap.get(m.sessionId) : undefined,
        name: m.name,
        description: m.description,
        type: m.type,
        gridSize: m.gridSize,
        dimensions: m.dimensions,
        imageUrl: m.imageUrl,
        details: m.details,
        foundryData: m.foundryData,
        version: m.version ?? 1,
        foundrySceneId: undefined,
        syncStatus: 'never',
        lastSyncedAt: undefined,
      });
      created.maps = (created.maps ?? 0) + 1;
    }

    // Remap mapIds in sessions
    for (const s of sessions) {
      const newSessionId = sessionIdMap.get(s.id);
      if (!newSessionId) continue;
      const remappedMapIds = (s.mapIds ?? []).map((mid: string) => mapIdMap.get(mid) ?? mid);
      await manager.getRepository(Session).update(newSessionId, { mapIds: remappedMapIds });
    }

    // 8. Tokens
    for (const t of tokens) {
      const mappedCampaignId = campaignIdMap.get(t.campaignId);
      if (!mappedCampaignId) { errors.push(`Token "${t.name}": campaign not found`); continue; }
      await manager.getRepository(Token).insert({
        id: uuidv4(),
        campaignId: mappedCampaignId,
        npcId: t.npcId ? npcIdMap.get(t.npcId) : undefined,
        name: t.name,
        description: t.description,
        imageUrl: t.imageUrl,
        type: t.type,
        size: t.size,
        width: t.width,
        height: t.height,
        scale: t.scale,
        vision: t.vision,
        detection: t.detection,
        foundryData: t.foundryData,
      });
      created.tokens = (created.tokens ?? 0) + 1;
    }

    // 9. TimelineEvents
    for (const te of timelineEvents) {
      const mappedCampaignId = campaignIdMap.get(te.campaignId);
      if (!mappedCampaignId) { errors.push(`TimelineEvent "${te.title}": campaign not found`); continue; }
      await manager.getRepository(TimelineEvent).insert({
        id: uuidv4(),
        campaignId: mappedCampaignId,
        sessionId: te.sessionId ? sessionIdMap.get(te.sessionId) : undefined,
        eventDate: te.eventDate,
        sessionNumber: te.sessionNumber,
        title: te.title,
        description: te.description,
        eventType: te.eventType,
        significance: te.significance,
        peopleInvolved: te.peopleInvolved,
        locations: te.locations,
      });
      created.timeline_events = (created.timeline_events ?? 0) + 1;
    }

    // 10. Stores
    for (const st of stores) {
      await manager.getRepository(Store).insert({
        id: uuidv4(),
        campaignId: st.campaignId ? campaignIdMap.get(st.campaignId) : undefined,
        name: st.name,
        storeType: st.storeType,
        parameters: st.parameters,
        data: st.data,
      });
      created.stores = (created.stores ?? 0) + 1;
    }
  });

  // Extract assets outside transaction
  extractAssets(zip);

  logInfo('Full backup restored', { created, errors: errors.length });

  return { success: true, manifest: manifestData, created, errors };
}

// ─── Restore: Campaign ─────────────────────────────────────────

export async function restoreCampaignBackup(
  zipBuffer: Buffer,
  userId: string,
  targetCampaignId?: string
): Promise<RestoreResult> {
  const zip = new AdmZip(zipBuffer);
  const manifestData: ManifestData = JSON.parse(zip.getEntry('manifest.json')!.getData().toString('utf8'));

  const errors: string[] = [];
  const created: Record<string, number> = {};

  const campaigns = readJsonFromZip<any>(zip, 'database/campaigns.json');
  const sessions = readJsonFromZip<any>(zip, 'database/sessions.json');
  const sessionResults = readJsonFromZip<any>(zip, 'database/session_results.json');
  const npcs = readJsonFromZip<any>(zip, 'database/npcs.json');
  const npcHistory = readJsonFromZip<any>(zip, 'database/npc_history.json');
  const maps = readJsonFromZip<any>(zip, 'database/maps.json');
  const tokens = readJsonFromZip<any>(zip, 'database/tokens.json');
  const timelineEvents = readJsonFromZip<any>(zip, 'database/timeline_events.json');
  const stores = readJsonFromZip<any>(zip, 'database/stores.json');

  await AppDataSource.transaction(async (manager) => {
    const sessionIdMap = new Map<string, string>();
    const npcIdMap = new Map<string, string>();
    const mapIdMap = new Map<string, string>();

    // Determine campaign ID
    let newCampaignId: string;
    if (targetCampaignId) {
      // Merge into existing campaign — verify ownership
      const existing = await manager.getRepository(Campaign).findOneBy({ id: targetCampaignId, ownerId: userId });
      if (!existing) throw new Error('Target campaign not found or not owned by you');
      newCampaignId = targetCampaignId;
    } else {
      // Create new campaign
      const src = campaigns[0];
      newCampaignId = uuidv4();
      await manager.getRepository(Campaign).insert({
        id: newCampaignId,
        name: src?.name ?? 'Restored Campaign',
        description: src?.description,
        setting: src?.setting,
        theme: src?.theme,
        tone: src?.tone,
        playerCount: src?.playerCount ?? 4,
        partyLevel: src?.partyLevel ?? 3,
        worldLore: src?.worldLore,
        rules: src?.rules,
        ownerId: userId,
      });
      created.campaigns = 1;
    }

    // Sessions
    for (const s of sessions) {
      const newId = uuidv4();
      sessionIdMap.set(s.id, newId);
      await manager.getRepository(Session).insert({
        id: newId,
        campaignId: newCampaignId,
        sessionNumber: s.sessionNumber,
        title: s.title,
        description: s.description,
        scheduledDate: s.scheduledDate,
        completedDate: s.completedDate,
        status: s.status,
        scenario: s.scenario,
        npcIds: [],
        mapIds: [],
      });
      created.sessions = (created.sessions ?? 0) + 1;
    }

    // NPCs
    for (const n of npcs) {
      const newId = uuidv4();
      npcIdMap.set(n.id, newId);
      await manager.getRepository(NPC).insert({
        id: newId,
        campaignId: newCampaignId,
        name: n.name,
        role: n.role,
        description: n.description,
        personality: n.personality,
        motivations: n.motivations ?? [],
        background: n.background,
        stats: n.stats,
        tokenImageUrl: n.tokenImageUrl,
        encounterSessionIds: (n.encounterSessionIds ?? []).map((sid: string) => sessionIdMap.get(sid) ?? sid),
        foundryActorId: undefined,
        syncStatus: 'never',
      });
      created.npcs = (created.npcs ?? 0) + 1;
    }

    // Remap npcIds in sessions
    for (const s of sessions) {
      const newSessionId = sessionIdMap.get(s.id);
      if (!newSessionId) continue;
      const remappedNpcIds = (s.npcIds ?? []).map((nid: string) => npcIdMap.get(nid) ?? nid);
      await manager.getRepository(Session).update(newSessionId, { npcIds: remappedNpcIds });
    }

    // SessionResults
    for (const sr of sessionResults) {
      const mappedSessionId = sessionIdMap.get(sr.sessionId);
      if (!mappedSessionId) { errors.push(`SessionResult: session not found`); continue; }
      await manager.getRepository(SessionResult).insert({
        id: uuidv4(),
        sessionId: mappedSessionId,
        summary: sr.summary,
        events: sr.events ?? [],
        npcInteractions: sr.npcInteractions,
        playerDecisions: sr.playerDecisions ?? [],
        worldChanges: sr.worldChanges,
        unfinishedThreads: sr.unfinishedThreads ?? [],
        plotAdvancement: sr.plotAdvancement,
        characterDevelopment: sr.characterDevelopment,
        durationMinutes: sr.durationMinutes,
        xpAwarded: sr.xpAwarded,
        lootAwarded: sr.lootAwarded,
        deathCount: sr.deathCount ?? 0,
        captureMethod: sr.captureMethod,
        transcript: sr.transcript,
        mood: sr.mood,
      });
      created.session_results = (created.session_results ?? 0) + 1;
    }

    // NPCHistory
    for (const nh of npcHistory) {
      const mappedNpcId = npcIdMap.get(nh.npcId);
      const mappedSessionId = sessionIdMap.get(nh.sessionId);
      if (!mappedNpcId || !mappedSessionId) { errors.push(`NPCHistory: FK not found`); continue; }
      await manager.getRepository(NPCHistory).insert({
        id: uuidv4(),
        npcId: mappedNpcId,
        sessionId: mappedSessionId,
        alignmentBefore: nh.alignmentBefore,
        alignmentAfter: nh.alignmentAfter,
        loyaltyBefore: nh.loyaltyBefore,
        loyaltyAfter: nh.loyaltyAfter,
        statusBefore: nh.statusBefore,
        statusAfter: nh.statusAfter,
        relationshipChange: nh.relationshipChange,
        notes: nh.notes,
        eventsInvolved: nh.eventsInvolved,
      });
      created.npc_history = (created.npc_history ?? 0) + 1;
    }

    // Maps
    for (const m of maps) {
      const newId = uuidv4();
      mapIdMap.set(m.id, newId);
      await manager.getRepository(MapEntity).insert({
        id: newId,
        campaignId: newCampaignId,
        sessionId: m.sessionId ? sessionIdMap.get(m.sessionId) : undefined,
        name: m.name,
        description: m.description,
        type: m.type,
        gridSize: m.gridSize,
        dimensions: m.dimensions,
        imageUrl: m.imageUrl,
        details: m.details,
        foundryData: m.foundryData,
        version: m.version ?? 1,
        foundrySceneId: undefined,
        syncStatus: 'never',
      });
      created.maps = (created.maps ?? 0) + 1;
    }

    // Remap mapIds in sessions
    for (const s of sessions) {
      const newSessionId = sessionIdMap.get(s.id);
      if (!newSessionId) continue;
      const remappedMapIds = (s.mapIds ?? []).map((mid: string) => mapIdMap.get(mid) ?? mid);
      await manager.getRepository(Session).update(newSessionId, { mapIds: remappedMapIds });
    }

    // Tokens
    for (const t of tokens) {
      await manager.getRepository(Token).insert({
        id: uuidv4(),
        campaignId: newCampaignId,
        npcId: t.npcId ? npcIdMap.get(t.npcId) : undefined,
        name: t.name,
        description: t.description,
        imageUrl: t.imageUrl,
        type: t.type,
        size: t.size,
        width: t.width,
        height: t.height,
        scale: t.scale,
        vision: t.vision,
        detection: t.detection,
        foundryData: t.foundryData,
      });
      created.tokens = (created.tokens ?? 0) + 1;
    }

    // TimelineEvents
    for (const te of timelineEvents) {
      await manager.getRepository(TimelineEvent).insert({
        id: uuidv4(),
        campaignId: newCampaignId,
        sessionId: te.sessionId ? sessionIdMap.get(te.sessionId) : undefined,
        eventDate: te.eventDate,
        sessionNumber: te.sessionNumber,
        title: te.title,
        description: te.description,
        eventType: te.eventType,
        significance: te.significance,
        peopleInvolved: te.peopleInvolved,
        locations: te.locations,
      });
      created.timeline_events = (created.timeline_events ?? 0) + 1;
    }

    // Stores
    for (const st of stores) {
      await manager.getRepository(Store).insert({
        id: uuidv4(),
        campaignId: newCampaignId,
        name: st.name,
        storeType: st.storeType,
        parameters: st.parameters,
        data: st.data,
      });
      created.stores = (created.stores ?? 0) + 1;
    }
  });

  extractAssets(zip);

  logInfo('Campaign backup restored', { created, errors: errors.length });

  return { success: true, manifest: manifestData, created, errors };
}
