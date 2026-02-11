# Phase 5: Session Results & Continuity - Implementation Plan

## Overview

Phase 5 enhances session result tracking to create rich campaign continuity. After each session, the GM captures what happened—events, NPC changes, combat outcomes, loot, and plot threads. AI then uses this full history to generate continuity-aware scenarios for future sessions.

**Tech Stack Compliance:**
- Backend: Node.js + TypeScript + Express + TypeORM + PostgreSQL
- AI: Groq API (llama-3.3-70b-versatile) via OpenAI SDK
- Foundry VTT: v13.351 + D&D 5e v5.2.5 (socket.io modifyDocument protocol)
- Frontend: React 18 + Vite + TypeScript + Tailwind CSS

---

## 1. Enhanced Data Models

### 1.1 SessionResult Entity (Enhanced)

Expand the existing `SessionResult` entity with richer fields:

```typescript
// api/src/entities/SessionResult.ts
@Entity('session_results')
export class SessionResult {
  // Existing fields: id, sessionId, summary, events[], npcInteractions, playerDecisions[], worldChanges, unfinishedThreads[], capturedAt

  // NEW fields:
  @Column({ type: 'varchar', nullable: true })
  mood?: string; // "tense", "comedic", "dramatic", "exploratory", "combat-heavy"

  @Column({ type: 'text', array: true, default: [] })
  highlights!: string[]; // Player-memorable moments

  @Column({ type: 'text', nullable: true })
  plotAdvancement?: string; // How the main storyline advanced

  @Column({ type: 'jsonb', nullable: true })
  combatSummary?: Record<string, unknown>; // { encounters: [...], totalXP, difficultyRating }

  @Column({ type: 'jsonb', nullable: true })
  lootAwarded?: Record<string, unknown>; // { items: [...], gold, other }

  @Column({ type: 'int', nullable: true })
  xpAwarded?: number; // Total XP from the session (5e standard)
}
```

### 1.2 NPCHistory Entity (New)

Track how NPCs change across sessions for continuity:

```typescript
// api/src/entities/NPCHistory.ts
@Entity('npc_history')
export class NPCHistory {
  id: string;           // PK uuid
  npcId: string;        // FK to NPC
  sessionId: string;    // FK to Session
  statusBefore: string; // "alive", "dead", "missing", "imprisoned", "unknown"
  statusAfter: string;
  loyaltyBefore?: string; // "hostile", "unfriendly", "neutral", "friendly", "allied"
  loyaltyAfter?: string;
  notes?: string;       // What happened to this NPC during the session
  significantAction?: string; // Key action that changed things
  createdAt: Date;
}
```

### 1.3 TimelineEvent Entity (New)

Track major campaign events for worldbuilding continuity:

```typescript
// api/src/entities/TimelineEvent.ts
@Entity('timeline_events')
export class TimelineEvent {
  id: string;             // PK uuid
  campaignId: string;     // FK to Campaign
  sessionId?: string;     // FK to Session (optional, some events are pre-campaign)
  sessionNumber?: number; // For quick reference
  title: string;
  description: string;
  eventType: string;      // "combat", "discovery", "political", "social", "quest", "world"
  significance: string;   // "minor", "moderate", "major", "critical"
  involvedNPCs: string[]; // NPC names for quick reference
  location?: string;
  createdAt: Date;
}
```

---

## 2. Enhanced AI Summarization

### 2.1 Structured Session Summary

Upgrade `summarizeSession()` to return structured data that auto-populates all SessionResult fields:

```typescript
interface StructuredSessionSummary {
  summary: string;
  keyEvents: string[];
  playerDecisions: string[];
  npcInteractions: Record<string, string>;
  worldChanges: Record<string, string>;
  unfinishedThreads: string[];
  mood: string;
  highlights: string[];
  plotAdvancement: string;
  combatSummary: {
    encounters: Array<{ name: string; outcome: string; difficulty: string }>;
    totalXP: number;
  };
  lootAwarded: {
    items: string[];
    gold: number;
  };
  xpAwarded: number;
  npcChanges: Array<{
    name: string;
    statusBefore: string;
    statusAfter: string;
    loyaltyBefore: string;
    loyaltyAfter: string;
    significantAction: string;
  }>;
  timelineEvents: Array<{
    title: string;
    description: string;
    eventType: string;
    significance: string;
    involvedNPCs: string[];
    location: string;
  }>;
}
```

The AI prompt will request D&D 5e compliant XP values (based on CR/encounter difficulty) and SRD-compliant loot.

### 2.2 Continuity-Aware Scenario Generation

Enhance `generateScenario()` to build a full campaign context including:

1. **Campaign summary** - total sessions, overall arc progression
2. **Timeline events** - ordered by significance, most recent first
3. **NPC current statuses** - alive/dead, loyalty, last known actions
4. **Unresolved plot threads** - from all prior sessions
5. **World state** - cumulative world changes

---

## 3. API Routes

### 3.1 Enhanced Finalize Endpoint

`POST /api/sessions/:id/finalize` - Now accepts all new fields and auto-creates:
- NPCHistory records for each NPC interaction
- TimelineEvent records for significant events

### 3.2 AI Structured Summary

`POST /api/generate/sessions/:id/summarize` - Returns full structured summary instead of just text.

### 3.3 New Endpoints

- `GET /api/campaigns/:id/timeline` - Campaign timeline events
- `GET /api/campaigns/:id/summary` - Full campaign continuity summary  
- `GET /api/npcs/:id/history` - NPC change history across sessions
- `POST /api/foundry/journals/sessions/:sessionId` - Sync session results to Foundry journal

---

## 4. Foundry VTT Integration

### 4.1 Session Journal Sync

Create a Foundry journal entry for each finalized session containing:
- Session title and number
- Summary narrative
- Key events and player decisions
- NPC interactions
- Combat summary and rewards
- Plot advancement

Uses existing `foundrySyncService.createJournalEntry()` with rich HTML content.

### 4.2 D&D 5e Compliance

- XP values follow 5e encounter difficulty thresholds
- Loot uses SRD-appropriate item names
- NPC stat references use standard ability score format (STR/DEX/CON/INT/WIS/CHA)
- Challenge Ratings follow 5e CR scale

### 4.3 Bulk Sync Enhancement

Add session journal syncing to the existing bulk sync endpoint.

---

## 5. Frontend Updates

### 5.1 Enhanced Session Results Form

- New fields: mood selector, highlights list, combat summary editor, loot tracker, XP input
- AI Summarize button now returns structured data that auto-fills ALL fields
- NPC status change tracking UI

### 5.2 Campaign Timeline View  

- New tab on Campaign Detail page showing timeline events
- Color-coded by event type and significance
- NPC status overview section

### 5.3 Session Detail Enhancements

- Enhanced results display with all new fields
- "Sync to Foundry" button for session journal
- Visual indicators for mood, combat difficulty, and plot significance

---

## 6. Implementation Order

1. Backend entities (SessionResult enhancement, NPCHistory, TimelineEvent)
2. AI service enhancements
3. Route updates (sessions, generate, foundry)
4. Frontend types
5. Frontend API service
6. Frontend pages (SessionDetail, CampaignDetail)
7. Build & test

---

## 7. Foundry VTT v13 Compatibility Notes

- All document creation uses `modifyDocument` socket event with operation wrapper
- Journal entries use `pages` array with `text.content` for HTML (v13 format)
- Actor data follows `system.abilities.str.value` pattern for D&D 5e v5.2.5
- Image paths use `lazy-foundry-assets/` prefix for shared Docker volume
