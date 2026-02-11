# Phase 5: Session Results & Continuity - Session Tracking & Campaign Persistence

**Duration:** 2-3 weeks
**Goal:** Implement session result capture, AI summarization, and continuity-aware content generation
**Dependencies:** Phase 1-4 complete (all systems running)
**Stack:** TypeScript, TypeORM, Express, React/Tailwind, Groq (OpenAI SDK)

---

## 1. Overview

Phase 5 focuses on:
- Enhanced session result capture and logging
- AI-powered session summarization (via Groq/OpenAI)
- NPC state tracking across sessions
- Campaign timeline management
- Continuity-aware scenario generation
- Unresolved plot thread tracking

**Key Principle:** Extend existing code rather than duplicating. The project already has a `SessionResult` entity, `/finalize` endpoint, and `summarizeSession` AI function. Phase 5 enhances these.

---

## 2. Data Models (TypeORM Entities)

### 2.1 Enhanced SessionResult Entity

**`api/src/entities/SessionResult.ts` (Updated)**

Existing fields kept as-is: `id`, `sessionId`, `summary`, `events`, `npcInteractions`, `playerDecisions`, `worldChanges`, `unfinishedThreads`, `capturedAt`.

New fields to add:

```typescript
// Story continuity
@Column({ type: 'text', nullable: true })
plotAdvancement?: string;  // How main plot advanced

// Character tracking
@Column({ type: 'jsonb', nullable: true })
characterDevelopment?: Record<string, unknown>;  // PC growth/changes

// Session metadata
@Column({ type: 'int', nullable: true })
durationMinutes?: number;

@Column({ type: 'int', nullable: true })
xpAwarded?: number;

@Column({ type: 'jsonb', nullable: true })
lootAwarded?: Record<string, unknown>;

@Column({ type: 'int', default: 0 })
deathCount!: number;

// Capture method
@Column({ type: 'varchar', length: 50, nullable: true })
captureMethod?: string;  // "manual" | "ai_summarized"

@Column({ type: 'text', nullable: true })
transcript?: string;  // Raw session transcript/notes

// Session tone
@Column({ type: 'varchar', length: 50, nullable: true })
mood?: string;  // "intense" | "comedic" | "dramatic" | "mixed"
```

**Why these fields only:** The existing `events` covers highlights and combat. The existing `npcInteractions` covers NPC status changes. The existing `worldChanges` covers location updates and faction relations. The existing `unfinishedThreads` covers loose ends. No duplicate columns needed.

### 2.2 NPCHistory Entity (New)

**`api/src/entities/NPCHistory.ts`**

```typescript
import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { NPC } from './NPC';
import { Session } from './Session';

@Entity('npc_history')
export class NPCHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  npcId!: string;

  @ManyToOne(() => NPC)
  @JoinColumn({ name: 'npcId' })
  npc!: NPC;

  @Column('uuid')
  sessionId!: string;

  @ManyToOne(() => Session)
  @JoinColumn({ name: 'sessionId' })
  session!: Session;

  // What changed
  @Column({ type: 'varchar', length: 50, nullable: true })
  alignmentBefore?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  alignmentAfter?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  loyaltyBefore?: string;  // "neutral", "ally", "enemy"

  @Column({ type: 'varchar', length: 50, nullable: true })
  loyaltyAfter?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  statusBefore?: string;  // "alive", "captured", "dead", "missing"

  @Column({ type: 'varchar', length: 100, nullable: true })
  statusAfter?: string;

  @Column({ type: 'text', nullable: true })
  relationshipChange?: string;  // How relationship with party changed

  @Column({ type: 'text', nullable: true })
  notes?: string;  // Freeform context ("betrayed party after being charmed")

  @Column({ type: 'jsonb', nullable: true })
  eventsInvolved?: string[];  // List of events this NPC was in

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
```

### 2.3 TimelineEvent Entity (New)

**`api/src/entities/TimelineEvent.ts`**

```typescript
import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Campaign } from './Campaign';
import { Session } from './Session';

@Entity('timeline_events')
export class TimelineEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  campaignId!: string;

  @ManyToOne(() => Campaign)
  @JoinColumn({ name: 'campaignId' })
  campaign!: Campaign;

  @Column({ type: 'uuid', nullable: true })
  sessionId?: string;

  @ManyToOne(() => Session, { nullable: true })
  @JoinColumn({ name: 'sessionId' })
  session?: Session;

  @Column({ type: 'varchar', length: 100 })
  eventDate!: string;  // In-game date (fantasy calendars)

  @Column({ type: 'int', nullable: true })
  sessionNumber?: number;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 50 })
  eventType!: string;  // "combat", "dialogue", "discovery", "death", "political", "travel"

  @Column({ type: 'varchar', length: 50 })
  significance!: string;  // "minor", "major", "critical"

  @Column({ type: 'jsonb', nullable: true })
  peopleInvolved?: string[];  // NPC/PC names

  @Column({ type: 'jsonb', nullable: true })
  locations?: string[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
```

### 2.4 Database Schema

**No manual migration needed.** TypeORM `synchronize: true` in development (`api/src/config/database.ts`) auto-syncs entity changes. Register new entities in `AppDataSource.entities` array.

---

## 3. Session Continuity Service (Single Service)

**`api/src/services/sessionContinuity.ts`**

Consolidates summarization, NPC tracking, timeline management, continuity context building, and continuity-aware scenario generation into one service.

```typescript
import OpenAI from 'openai';
import { AppDataSource } from '../config/database';
import { SessionResult } from '../entities/SessionResult';
import { NPCHistory } from '../entities/NPCHistory';
import { TimelineEvent } from '../entities/TimelineEvent';
import { Session, SessionStatus } from '../entities/Session';
import { NPC } from '../entities/NPC';
import { Campaign } from '../entities/Campaign';

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.GROQ_API_KEY
    ? 'https://api.groq.com/openai/v1'
    : 'https://api.openai.com/v1',
});
const getModel = () => process.env.GROQ_API_KEY ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini';

// --- Interfaces ---

export interface SessionSummary {
  summary: string;
  keyEvents: string[];
  npcInteractions: Record<string, string>;
  worldChanges: Record<string, string>;
  plotAdvancement: string;
  unresolvedThreads: string[];
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
  npcStatuses: Record<string, {
    npcId: string;
    name: string;
    alignment: string | null;
    loyalty: string | null;
    status: string;
    relationshipSummary: string | null;
  }>;
  majorPlotPoints: string[];
}

export interface ContinuityScenario {
  title: string;
  overview: string;
  connectionToPrevious: string;
  npcInvolvement: Record<string, string>;
  plotProgression: string;
  keyScenes: Array<{ title: string; description: string }>;
  potentialComplications: string[];
  setupForNext: string[];
}

// --- AI Summarization ---

export async function autoSummarizeSession(
  transcript: string,
  campaignContext: string,
  partyComposition: string
): Promise<SessionSummary> {
  const prompt = `You are a Dungeon Master documenting a D&D 5e session. Analyze the following session transcript or description.

**Session Content:**
${transcript}

**Party Composition:**
${partyComposition}

**Campaign Context:**
${campaignContext}

Provide analysis as JSON with these fields:
1. "summary": 2-3 sentence executive summary
2. "keyEvents": Array of 3-5 major events that occurred
3. "npcInteractions": Object with NPC names as keys, description of how they were involved as values
4. "worldChanges": Object describing how the world/setting was affected
5. "plotAdvancement": How the main storyline advanced (string)
6. "unresolvedThreads": Array of plot hooks for next session

Respond ONLY with valid JSON.`;

  const response = await openai.chat.completions.create({
    model: getModel(),
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error('No response from AI');

  return JSON.parse(content);
}

// --- NPC Status Tracking ---

export async function getNPCCurrentStatus(
  npcId: string
): Promise<{
  npcId: string;
  name: string;
  alignment: string | null;
  loyalty: string | null;
  status: string;
  relationshipSummary: string | null;
} | null> {
  const npcRepo = AppDataSource.getRepository(NPC);
  const historyRepo = AppDataSource.getRepository(NPCHistory);

  const npc = await npcRepo.findOne({ where: { id: npcId } });
  if (!npc) return null;

  const latestHistory = await historyRepo.findOne({
    where: { npcId },
    order: { createdAt: 'DESC' },
  });

  return {
    npcId: npc.id,
    name: npc.name,
    alignment: latestHistory?.alignmentAfter ?? null,
    loyalty: latestHistory?.loyaltyAfter ?? null,
    status: latestHistory?.statusAfter ?? 'alive',
    relationshipSummary: latestHistory?.relationshipChange ?? null,
  };
}

export async function trackNPCChanges(
  npcId: string,
  sessionId: string,
  changes: Partial<NPCHistory>
): Promise<NPCHistory> {
  const historyRepo = AppDataSource.getRepository(NPCHistory);
  const history = historyRepo.create({
    npcId,
    sessionId,
    ...changes,
  });
  return historyRepo.save(history);
}

// --- Timeline ---

export async function addTimelineEvent(
  campaignId: string,
  sessionId: string | null,
  eventData: Partial<TimelineEvent>
): Promise<TimelineEvent> {
  const timelineRepo = AppDataSource.getRepository(TimelineEvent);
  const sessionRepo = AppDataSource.getRepository(Session);

  let sessionNumber: number | undefined;
  if (sessionId) {
    const session = await sessionRepo.findOne({ where: { id: sessionId } });
    sessionNumber = session?.sessionNumber;
  }

  const event = timelineRepo.create({
    campaignId,
    sessionId: sessionId ?? undefined,
    sessionNumber,
    ...eventData,
  });
  return timelineRepo.save(event);
}

// --- Campaign Summary ---

export async function getCampaignSummary(
  campaignId: string,
  upToSession?: number
): Promise<CampaignSummary> {
  const sessionRepo = AppDataSource.getRepository(Session);
  const timelineRepo = AppDataSource.getRepository(TimelineEvent);
  const npcRepo = AppDataSource.getRepository(NPC);

  // Get sessions
  let sessions = await sessionRepo.find({
    where: { campaignId },
    order: { sessionNumber: 'ASC' },
  });
  if (upToSession) {
    sessions = sessions.filter(s => s.sessionNumber <= upToSession);
  }

  // Get timeline events
  let timeline = await timelineRepo.find({
    where: { campaignId },
    order: { sessionNumber: 'ASC' },
  });
  if (upToSession) {
    timeline = timeline.filter(t => !t.sessionNumber || t.sessionNumber <= upToSession);
  }

  // Get NPC statuses
  const npcs = await npcRepo.find({ where: { campaignId } });
  const npcStatuses: CampaignSummary['npcStatuses'] = {};
  for (const npc of npcs) {
    const status = await getNPCCurrentStatus(npc.id);
    if (status) npcStatuses[npc.name] = status;
  }

  return {
    sessionsCompleted: sessions.filter(s => s.status === SessionStatus.COMPLETED).length,
    totalSessions: sessions.length,
    timelineEvents: timeline.map(t => ({
      session: t.sessionNumber ?? null,
      title: t.title,
      description: t.description ?? null,
      type: t.eventType,
      significance: t.significance,
    })),
    npcStatuses,
    majorPlotPoints: timeline
      .filter(t => t.significance === 'critical')
      .map(t => t.title),
  };
}

// --- Continuity Context ---

export async function buildContinuityContext(
  campaignId: string,
  upToSession?: number
): Promise<string> {
  const summary = await getCampaignSummary(campaignId, upToSession);

  return `**Campaign Progress Summary:**

Sessions Completed: ${summary.sessionsCompleted} / ${summary.totalSessions}

**Timeline of Major Events:**
${JSON.stringify(summary.timelineEvents, null, 2)}

**NPC Status:**
${JSON.stringify(summary.npcStatuses, null, 2)}

**Major Plot Points:**
${JSON.stringify(summary.majorPlotPoints, null, 2)}`;
}

// --- Continuity-Aware Scenario Generation ---

export async function generateContinuityScenario(
  campaignId: string,
  sessionDescription: string,
  partyLevel: number,
  partyComposition: string
): Promise<ContinuityScenario> {
  const campaignRepo = AppDataSource.getRepository(Campaign);
  const resultRepo = AppDataSource.getRepository(SessionResult);
  const sessionRepo = AppDataSource.getRepository(Session);

  const campaign = await campaignRepo.findOne({ where: { id: campaignId } });
  if (!campaign) throw new Error('Campaign not found');

  const continuityContext = await buildContinuityContext(campaignId);
  const summary = await getCampaignSummary(campaignId);

  // Get unresolved threads from latest session result
  const latestSession = await sessionRepo.findOne({
    where: { campaignId },
    order: { sessionNumber: 'DESC' },
  });
  let unresolvedThreads: string[] = [];
  if (latestSession) {
    const latestResult = await resultRepo.findOne({
      where: { sessionId: latestSession.id },
    });
    if (latestResult) {
      unresolvedThreads = latestResult.unfinishedThreads || [];
    }
  }

  const prompt = `You are a Dungeon Master creating the next session in an ongoing D&D 5e campaign.

**Campaign:** ${campaign.name}
${campaign.description || ''}

**Campaign Context:**
${continuityContext}

**Unresolved Plot Threads:**
${JSON.stringify(unresolvedThreads, null, 2)}

**Party Level:** ${partyLevel}
**Party Composition:** ${partyComposition}

**Session Request:** ${sessionDescription}

Create a scenario that:
1. Naturally continues from where the last session left off
2. Respects NPC relationships and status changes
3. Builds on unresolved plot threads
4. Reflects world changes from previous sessions
5. Offers multiple paths forward while maintaining continuity

Provide as JSON:
1. "title": Session title
2. "overview": What this session is about
3. "connectionToPrevious": How this connects to past events
4. "npcInvolvement": Object with NPC names as keys, how they appear as values
5. "plotProgression": How this advances the main story
6. "keyScenes": Array of 3-4 objects with "title" and "description"
7. "potentialComplications": Array of what could go wrong
8. "setupForNext": Array of hooks this sets up for future sessions

Respond ONLY with valid JSON.`;

  const response = await openai.chat.completions.create({
    model: getModel(),
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error('No response from AI');

  return JSON.parse(content);
}
```

---

## 4. API Endpoints

### 4.1 Enhance Existing `/finalize` Endpoint

**`api/src/routes/sessions.ts` (Updated)**

Extend the existing `POST /sessions/:id/finalize` endpoint to accept the new fields. No new `/results` endpoint needed.

Add new validators to the existing `/finalize` route:
```typescript
body('plotAdvancement').optional().trim(),
body('durationMinutes').optional().isInt(),
body('xpAwarded').optional().isInt(),
body('lootAwarded').optional().isObject(),
body('deathCount').optional().isInt(),
body('captureMethod').optional().isIn(['manual', 'ai_summarized']),
body('transcript').optional().trim(),
body('mood').optional().isIn(['intense', 'comedic', 'dramatic', 'mixed']),
body('characterDevelopment').optional().isObject(),
```

And apply the new fields in the handler alongside existing ones:
```typescript
if (plotAdvancement !== undefined) result.plotAdvancement = plotAdvancement;
if (durationMinutes !== undefined) result.durationMinutes = durationMinutes;
if (xpAwarded !== undefined) result.xpAwarded = xpAwarded;
if (lootAwarded !== undefined) result.lootAwarded = lootAwarded;
if (deathCount !== undefined) result.deathCount = deathCount;
if (captureMethod !== undefined) result.captureMethod = captureMethod;
if (transcript !== undefined) result.transcript = transcript;
if (mood !== undefined) result.mood = mood;
if (characterDevelopment !== undefined) result.characterDevelopment = characterDevelopment;
```

### 4.2 New Auto-Summarize Endpoint

**`api/src/routes/sessions.ts` (New route)**

```typescript
// POST /sessions/:id/auto-summarize
// Accepts: { transcript: string, partyComposition?: string }
// Returns: { summary: SessionSummary, result: SessionResult }
//
// 1. Verify session ownership
// 2. Get campaign context (name + description + lore)
// 3. Call autoSummarizeSession() from sessionContinuity service
// 4. Save AI output to SessionResult fields
// 5. Set captureMethod = 'ai_summarized'
// 6. Return both the raw AI summary and the saved result
```

### 4.3 New Campaign Summary Endpoint

**`api/src/routes/campaigns.ts` (New route)**

```typescript
// GET /campaigns/:id/summary
// Returns: { summary: CampaignSummary }
//
// 1. Verify campaign ownership
// 2. Call getCampaignSummary() from sessionContinuity service
// 3. Return summary with sessions completed, timeline, NPC statuses, plot points
```

### 4.4 NPC History Endpoints

**`api/src/routes/sessions.ts` (New routes)**

```typescript
// POST /sessions/:id/npc-history
// Accepts: { npcId, alignmentBefore?, alignmentAfter?, loyaltyBefore?, loyaltyAfter?,
//            statusBefore?, statusAfter?, relationshipChange?, notes?, eventsInvolved? }
// Returns: { history: NPCHistory }

// GET /campaigns/:id/npc-status
// Returns: { statuses: Record<string, NPCStatus> }
```

### 4.5 Timeline Endpoints

**`api/src/routes/campaigns.ts` (New routes)**

```typescript
// POST /campaigns/:id/timeline
// Accepts: { sessionId?, eventDate, title, description?, eventType, significance,
//            peopleInvolved?, locations? }
// Returns: { event: TimelineEvent }

// GET /campaigns/:id/timeline
// Returns: { events: TimelineEvent[] }
```

### 4.6 Continuity-Aware Scenario Generation

**`api/src/routes/generate.ts` (New route)**

```typescript
// POST /generate/sessions/:id/continuity-scenario
// Accepts: { description, partyLevel, partyComposition }
// Returns: { scenario: ContinuityScenario }
//
// Uses generateContinuityScenario() which automatically pulls campaign history,
// NPC statuses, and unresolved threads to inform the AI generation.
```

---

## 5. Frontend Changes

### 5.1 Type Updates

**`web/src/types/index.ts` (Updated)**

Add new fields to existing `SessionResult` interface:
```typescript
export interface SessionResult {
  // ... existing fields ...
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
```

Add new interfaces:
```typescript
export interface NPCHistory {
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
  npcStatuses: Record<string, {
    npcId: string;
    name: string;
    alignment: string | null;
    loyalty: string | null;
    status: string;
    relationshipSummary: string | null;
  }>;
  majorPlotPoints: string[];
}
```

### 5.2 API Service Updates

**`web/src/services/api.ts` (New methods)**

```typescript
// Session Continuity
async autoSummarizeSession(sessionId: string, transcript: string, partyComposition?: string): Promise<{ summary: unknown; result: SessionResult }>
async getCampaignSummary(campaignId: string): Promise<{ summary: CampaignSummary }>
async getCampaignTimeline(campaignId: string): Promise<{ events: TimelineEvent[] }>
async addTimelineEvent(campaignId: string, data: Partial<TimelineEvent>): Promise<{ event: TimelineEvent }>
async trackNPCHistory(sessionId: string, data: Partial<NPCHistory>): Promise<{ history: NPCHistory }>
async getCampaignNPCStatuses(campaignId: string): Promise<{ statuses: Record<string, unknown> }>
async generateContinuityScenario(sessionId: string, data: { description: string; partyLevel: number; partyComposition: string }): Promise<{ scenario: unknown }>
```

### 5.3 Enhanced Session Finalize Form

**Integrate into existing session detail flow in `web/src/pages/`**

Enhance the existing FinalizeSessionForm with:
- **Transcript textarea** with "Auto-Summarize with AI" button
- **New fields**: plotAdvancement, mood (dropdown), durationMinutes, xpAwarded, deathCount
- **Loot list**: dynamic add/remove items
- **Character development**: freeform JSON/text per character
- AI summarize populates fields automatically, DM can edit before saving
- Existing fields (summary, events, npcInteractions, playerDecisions, worldChanges, unfinishedThreads) remain unchanged

### 5.4 Campaign Timeline Tab

**Add "Timeline" tab to `web/src/pages/CampaignDetail.tsx`**

- Visual timeline with left border markers (color-coded by significance)
- Session number badges
- Event type icons/labels
- "Add Event" button for manual timeline entries
- NPC Status panel showing current alignment/loyalty/status per NPC
- Campaign stats header (sessions completed, major events count)

### 5.5 NPC History in NPC Display

**Enhance NPC cards in campaign detail**

- Show current status badge (alive/dead/captured/missing)
- Show loyalty indicator (ally/neutral/enemy)
- "View History" expandable showing session-by-session changes
- "Update Status" button when finalizing a session

---

## 6. Implementation Checklist

### Backend
- [ ] Add 9 new columns to `SessionResult` entity
- [ ] Create `NPCHistory` entity
- [ ] Create `TimelineEvent` entity
- [ ] Register new entities in `database.ts` AppDataSource
- [ ] Create `sessionContinuity.ts` service (summarization + NPC tracking + timeline + continuity context + continuity scenario gen)
- [ ] Enhance existing `/sessions/:id/finalize` with new fields
- [ ] Add `POST /sessions/:id/auto-summarize` endpoint
- [ ] Add `GET /campaigns/:id/summary` endpoint
- [ ] Add `POST /sessions/:id/npc-history` endpoint
- [ ] Add `GET /campaigns/:id/npc-status` endpoint
- [ ] Add `POST /campaigns/:id/timeline` and `GET /campaigns/:id/timeline` endpoints
- [ ] Add `POST /generate/sessions/:id/continuity-scenario` endpoint

### Frontend
- [ ] Update `SessionResult` type with new fields
- [ ] Add `NPCHistory`, `TimelineEvent`, `CampaignSummary` types
- [ ] Add new API methods to `api.ts`
- [ ] Enhance FinalizeSessionForm with transcript, auto-summarize, new fields
- [ ] Add Campaign Timeline tab to CampaignDetail
- [ ] Add NPC status badges and history display
- [ ] Add continuity-aware scenario generation option in session creation

### Integration
- [ ] Continuity scenario generation uses campaign history context
- [ ] Auto-summarize populates session result fields from AI output
- [ ] NPC status changes from session results reflected in NPC display
- [ ] Timeline auto-populated from session results (critical events)

---

## 7. Success Criteria

- Session results can be captured manually or auto-summarized via AI
- AI summarization reliably extracts 6 key fields (summary, events, NPC interactions, world changes, plot advancement, unresolved threads)
- NPC status (alignment, loyalty, alive/dead) tracked across sessions
- Campaign timeline displays chronological events with significance levels
- Continuity-aware scenario generation references previous sessions, NPC statuses, and unresolved threads
- Campaign summary endpoint returns accurate aggregate data
- All UI integrated into existing pages (no standalone orphan components)

---

## 8. Next Phase

Upon completion of Phase 5, proceed to **Phase 6: Polish & Enhancement** for UI/UX improvements, testing, and optional features.
