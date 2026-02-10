# AI-Based Foundry VTT Game Planning Document

## 1. Project Overview

**Project Name:** Lazy Foundry VTT (AI-Driven Campaign Builder)

**Objective:** Create a Docker-based, AI-powered Dungeons & Dragons campaign platform that leverages Foundry VTT to dynamically generate campaigns, sessions, maps, NPCs, and scenarios based on user descriptions.

**Core Value Proposition:**
- Reduce prep time for DMs through AI generation
- Enable emergent storytelling by building on previous session results
- Provide a complete, integrated environment (campaign generation + Foundry VTT + web interface)
- Support smaller, manageable sessions that create narrative continuity

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Web Interface (React/Vue)                 │
│         DM Dashboard - Session Management & Creation         │
└────────────────────┬────────────────────────────────────────┘
                     │ REST API
┌────────────────────┴────────────────────────────────────────┐
│              Backend API Server (Node.js/Python)             │
│  - Session Management                                        │
│  - AI Orchestration                                          │
│  - Foundry VTT API Integration                               │
│  - Data Processing & Storage                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┬────────────────┐
        │            │            │                │
┌───────▼────┐ ┌──────▼───┐ ┌────▼────┐ ┌────────▼─────┐
│   LLM API  │ │ Database │ │ Foundry │ │ File Storage │
│  (Claude/  │ │(Postgres)│ │   VTT   │ │  (Maps, etc) │
│  OpenAI)   │ │          │ │ Instance│ └──────────────┘
└────────────┘ └──────────┘ └────────┘
```

### 2.2 Component Overview

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Frontend** | React/Vue.js | DM interface for campaign/session management |
| **Backend** | Node.js (Express) or Python (FastAPI) | API, AI orchestration, Foundry integration |
| **Database** | PostgreSQL | Store campaigns, sessions, results, metadata |
| **File Storage** | Docker volume or S3 | Store generated maps, tokens, assets |
| **Foundry VTT** | Official Docker image | Core VTT engine |
| **AI/LLM** | Claude API / OpenAI GPT | Content generation |
| **Containerization** | Docker Compose | Multi-service orchestration |

---

## 3. Core Features

### 3.1 Campaign & Session Management

**Campaign Creation:**
- User inputs: Campaign name, setting description, theme, tone, player count
- AI generates: Campaign overview, initial world-building details
- Output: Campaign record with AI-generated lore and setting

**Session Management:**
- Create new sessions within a campaign
- Sessions inherit campaign context
- Session log captures: encounters, NPC dialogue, player decisions, results
- Option to "continue from previous session" - AI uses session log as context

### 3.2 AI-Powered Content Generation

**Map Generation:**
- Input: Location description, location type (tavern, dungeon, forest, etc.)
- Process: AI describes map layout → Backend generates visual representation
- Output: Foundry-compatible map with grid, walls, lighting
- Storage: Maps saved and versioned per session

**Token Generation:**
- Input: NPC/creature description
- Process: AI generates appearance description → Generate or fetch token image
- Output: Foundry-compatible tokens with basic stats
- Random option: Generate random NPCs with descriptions and stats

**NPC & Character Creation:**
- Input: Role/archetype (innkeeper, wizard, guard, etc.)
- AI generates: Name, personality, background, motivations, hooks
- Output: Stored in database, importable to Foundry
- Stat generation: Random or AI-described ability scores

**Scenario/Encounter Design:**
- Input: Campaign context + previous session results
- AI generates: Encounter description, objectives, combat encounters (if applicable)
- Output: Scenario outline + encounter details
- Integration: Details can be loaded into Foundry as scene/combatant data

**Player Background Generation:**
- Input: Player count + general character class/concept (optional)
- AI generates: Individual backstories, motivations, character hooks
- Output: Character background documents for players

### 3.3 Session Result Capture & Continuity

**Session Recording:**
- Manual DM input: Key events, NPC reactions, player decisions
- Automated capture: Combat logs, chat history (if Foundry integration allows)
- Narrative capture: Story beats, important character development moments

**Continuity System:**
- Session results stored with metadata (date, participants, outcomes)
- "Continue Campaign" feature uses previous results as AI context
- AI aware of: NPC status, world state changes, unresolved plot threads
- Generate follow-up scenarios that build on previous events

### 3.4 Foundry VTT Integration

**Direct API Integration:**
- Create scenes programmatically
- Add actors (NPCs, monsters) with stats
- Place tokens on maps
- Create journal entries for lore/handouts
- Manage permissions and visibility

**Data Flow:**
```
AI Generation → Backend Processing → Foundry API Calls → VTT Updates
```

**Key Foundry API Endpoints:**
- Scenes (create, update, manage)
- Actors (NPCs, monsters, companions)
- Items (equipment, magic items)
- Journal Entries (lore, handouts)
- Token placement and configuration

---

## 4. Technology Stack

### Backend
- **Framework:** Node.js (Express) or Python (FastAPI)
- **Database:** PostgreSQL with TypeORM/SQLAlchemy
- **LLM Integration:** LangChain or direct API calls
- **File Processing:** Sharp (image processing), node-uuid
- **Authentication:** JWT tokens

### Frontend
- **Framework:** React or Vue.js
- **State Management:** Redux, Pinia, or Context API
- **UI Library:** Material-UI, Tailwind CSS
- **API Client:** Axios or Fetch API

### Infrastructure
- **Containerization:** Docker & Docker Compose
- **Foundry VTT:** Official Docker image (felddy/foundryvtt)
- **Database Container:** PostgreSQL official image
- **Networking:** Docker network for inter-service communication

### LLM Provider
- **Primary:** Groq API (llama-3.3-70b-versatile, free tier, OpenAI-compatible SDK)
- **SDK:** OpenAI Node.js SDK pointed at Groq endpoint

---

## 5. Data Models

### Core Entities

**Campaign**
```
{
  id: UUID
  name: string
  description: string
  setting: string
  theme: string
  tone: string
  createdAt: timestamp
  updatedAt: timestamp
  worldLore: JSON (AI-generated)
  rules: JSON (system rules, house rules)
  players: [userId]
}
```

**Session**
```
{
  id: UUID
  campaignId: UUID
  sessionNumber: integer
  title: string
  description: string
  scheduledDate: timestamp
  completedDate: timestamp
  status: enum (planned, in_progress, completed)
  createdAt: timestamp
  scenario: JSON (generated scenario)
  npcs: [NPC references]
  maps: [Map references]
  results: SessionResults
}
```

**SessionResults**
```
{
  id: UUID
  sessionId: UUID
  summary: string (AI-summarized or DM-written)
  events: [string] (key events that occurred)
  npcInteractions: JSON (how NPCs reacted/changed)
  playerDecisions: [string]
  worldChanges: JSON (world state updates)
  unfinishedThreads: [string] (plot hooks for next session)
  capturedAt: timestamp
}
```

**NPC**
```
{
  id: UUID
  campaignId: UUID
  name: string
  role: string
  description: string
  personality: JSON
  motivations: [string]
  background: string
  stats: JSON (ability scores, level, etc.)
  tokenImageUrl: string
  createdAt: timestamp
  encounters: [sessionId] (history of encounters)
}
```

**Map**
```
{
  id: UUID
  campaignId: UUID
  sessionId: UUID (nullable - reusable maps)
  name: string
  description: string
  type: enum (dungeon, tavern, wilderness, etc.)
  gridSize: integer
  dimensions: {width, height}
  imageUrl: string
  foundrySceneId: string
  createdAt: timestamp
  version: integer
}
```

**GeneratedContent**
```
{
  id: UUID
  type: enum (map, token, npc, scenario, background)
  campaignId: UUID
  prompt: string (what was requested)
  aiResponse: JSON (full AI response)
  processedOutput: JSON (extracted/formatted data)
  createdAt: timestamp
}
```

---

## 6. API Design

### REST Endpoints

#### Campaign Management
```
POST   /api/campaigns                    - Create campaign
GET    /api/campaigns                    - List campaigns
GET    /api/campaigns/{id}               - Get campaign details
PUT    /api/campaigns/{id}               - Update campaign
DELETE /api/campaigns/{id}               - Delete campaign
```

#### Session Management
```
POST   /api/campaigns/{id}/sessions      - Create session
GET    /api/campaigns/{id}/sessions      - List sessions
GET    /api/sessions/{id}                - Get session details
PUT    /api/sessions/{id}                - Update session
POST   /api/sessions/{id}/finalize       - Save session results
```

#### AI Content Generation
```
POST   /api/generate/map                 - Generate map
POST   /api/generate/tokens              - Generate NPC tokens
POST   /api/generate/scenario            - Generate scenario
POST   /api/generate/backgrounds         - Generate player backgrounds
POST   /api/generate/npcs                - Generate NPCs
```

#### Content Management
```
GET    /api/campaigns/{id}/npcs          - List campaign NPCs
GET    /api/campaigns/{id}/maps          - List campaign maps
GET    /api/sessions/{id}/results        - Get session results
```

#### Foundry VTT Integration
```
POST   /api/foundry/sync                 - Sync content to Foundry
GET    /api/foundry/status               - Check Foundry connection
POST   /api/foundry/import/{contentType} - Import specific content type
```

---

## 7. AI Integration Strategy

### LLM Usage Pattern

**Request Flow:**
1. User provides description → Backend receives request
2. Backend constructs context-aware prompt using campaign/session history
3. Call LLM with structured prompt
4. Parse LLM response into structured data
5. Validate and process output
6. Store raw AI response + processed output
7. Render in UI and optionally sync to Foundry

### Prompt Engineering

**Campaign Context Injection:**
```
"You are a Dungeon Master creating content for a D&D campaign.
The campaign is set in: [SETTING]
The tone is: [TONE]
Players: [COUNT]
Previous sessions summary: [SESSION_RESULTS]

Create [CONTENT_TYPE] based on: [USER_DESCRIPTION]"
```

**Continuity Prompts:**
- Include previous session results
- Reference NPC status and relationships
- Acknowledge unresolved plot threads
- Build on established world details

### Content Generation Pipelines

**Map Generation:**
1. Receive location description
2. AI generates detailed layout description
3. Backend converts description to Foundry scene data (walls, lighting, positions)
4. Option: Use image generation API (DALL-E, Midjourney, Stable Diffusion) for visual map

**Token Generation:**
1. AI generates character appearance description
2. Options:
   - Fetch token from web (via description search)
   - Generate image via API
   - Use pre-existing token library
3. Convert to Foundry token format

---

## 8. User Workflows

### Workflow 1: Create New Campaign

```
1. DM clicks "New Campaign"
2. Fill form: Name, Setting, Tone, Theme, Player Count
3. Click "Generate Campaign"
4. Backend calls AI → Creates campaign lore + world details
5. Campaign created and displayed
6. DM can now create sessions
```

### Workflow 2: Create Session & Generate Content

```
1. DM in campaign → Click "New Session"
2. Provide session description (optional: reference previous results)
3. AI generates scenario outline
4. DM clicks "Generate Map" → AI creates map, displays in editor
5. DM clicks "Generate NPCs" → AI creates 3-5 relevant NPCs
6. DM clicks "Generate Encounters" → AI creates combat encounters (if applicable)
7. DM clicks "Sync to Foundry" → All content pushed to Foundry VTT
8. Session ready for play
```

### Workflow 3: Session Play & Result Capture

```
1. Session in progress in Foundry VTT
2. DM can manually log events in companion interface
3. After session, DM opens "Session Results" form
4. Fill in: Summary, key events, NPC interactions, world changes
5. AI auto-summarizes if full transcripts provided
6. Results saved with session
7. Option to generate "next session seeds" based on results
```

### Workflow 4: Continue Previous Campaign

```
1. DM clicks "Continue Campaign"
2. Backend loads previous session results as context
3. DM provides next session description
4. AI generates scenario aware of previous events
5. NPCs can have changed status/relationships
6. World can reflect previous campaign impacts
7. New session created and populated with AI content
```

---

## 9. Development Phases

### Phase 1: Foundation ✅ COMPLETE
- [x] Project setup (Docker Compose, PostgreSQL, API structure)
- [x] User authentication system (JWT-based)
- [x] Campaign creation & management (full CRUD)
- [x] Basic session CRUD
- [x] React frontend dashboard with tabs
- [x] Database schema (User, Campaign, Session, SessionResult, NPC, Map entities)

### Phase 2: AI Integration ✅ COMPLETE
**Completed:**
- [x] LLM API integration (Groq - llama-3.3-70b-versatile, OpenAI-compatible SDK)
- [x] Campaign lore generation (world description, factions, locations, adventure hooks)
- [x] Scenario generation (objectives, encounters with difficulty, rewards, plot twists)
- [x] NPC generation (3 NPCs with stats, personalities, motivations, backgrounds)
- [x] Prompt engineering and Groq/OpenAI support
- [x] Tabbed interface for Lore, NPCs, Sessions
- [x] Session scenario generation with continuity awareness
- [x] Frontend performance optimization (useCallback for load functions, eliminated duplicate API calls)
- [x] Loading spinner and skeleton components
- [x] Error boundary component (React error boundary wrapping entire app)
- [x] Error alerts with dismiss functionality
- [x] Session result capture UI (FinalizeSessionForm with dynamic lists, AI summarize)
- [x] Player background generation (AI service + API route + frontend)
- [x] Better error handling and user feedback (ErrorAlert component)

**Remaining/Deferred:**
- [ ] Request debouncing (useDebounce hook exists but unused)
- [ ] Pagination for large content lists

### Phase 3: Content Generation 🔄 IN PROGRESS
**Completed:**
- [x] Map generation AI function (generateMapDescription - rooms, POIs, encounters, atmosphere, hazards)
- [x] Map API routes (POST generate + GET list for campaigns)
- [x] Maps tab in CampaignDetail with generation form and detailed display
- [x] Detailed encounter generation (CR, stats, tactics, alternative resolutions)
- [x] Encounters API route
- [x] Player background generation (AI + API + frontend)
- [x] Content storage in database (maps, NPCs, session results)

**Remaining:**
- [ ] Token/image generation (description → images)
- [ ] Static asset serving from Docker volume (/api/assets route)
- [ ] Map image generation or integration
- [ ] Content export/download functionality

### Phase 4: Foundry VTT Integration (2-3 weeks)
- [ ] Foundry API setup and authentication
- [ ] Scene creation and management
- [ ] Actor (NPC) import
- [ ] Token placement
- [ ] Sync mechanism between backend and Foundry

### Phase 5: Session Results & Continuity (2-3 weeks)
- [ ] Session result capture system
- [ ] Result summary/summarization
- [ ] Continuity prompt engineering
- [ ] "Continue campaign" workflow
- [ ] Session history and analytics

### Phase 6: Polish & Enhancement (2 weeks)
- [ ] UI/UX improvements
- [ ] Performance optimization
- [ ] Testing (unit, integration)
- [ ] Documentation
- [ ] Optional: Random generation templates

---

## 10. Deployment & Infrastructure

### Docker Compose Services

```yaml
Services:
  - api (Node.js/Python backend)
  - web (React frontend)
  - db (PostgreSQL)
  - foundry (Foundry VTT instance)
  - redis (optional - caching/sessions)
```

### Environment Configuration

```
.env variables:
- LLM_API_KEY (Claude or OpenAI)
- FOUNDRY_ADMIN_TOKEN
- DATABASE_URL
- JWT_SECRET
- FRONTEND_URL
- API_PORT
- FOUNDRY_PORT
```

### Volume Mounts

```
- Database persistence: /db-data
- Foundry data: /foundry-data
- Generated maps/tokens: /assets
- Logs: /logs
```

### Scalability Considerations

- Stateless API (can run multiple instances behind load balancer)
- Database connection pooling
- LLM API rate limiting and queuing
- Asset caching strategy
- Session state in database, not memory

---

## 11. Security Considerations

- JWT authentication for API endpoints
- Rate limiting on AI generation endpoints (cost control)
- Validate all LLM-generated content before storing
- Sanitize user inputs to prevent injection
- Secure storage of API keys (environment variables, secrets management)
- HTTPS for production
- Database backups and disaster recovery
- User data isolation (multi-tenant awareness if needed)

---

## 12. Optional Enhancements

- **Real-time collaboration:** WebSocket support for multi-DM sessions
- **Random generation templates:** Pre-built prompts for random generation
- **Content marketplace:** Share generated campaigns/scenarios
- **Analytics:** DM insights (session length, NPC usage, etc.)
- **Mobile app:** Companion app for session logging during play
- **Voice integration:** Transcribe session audio for automatic logging
- **Module compatibility:** Support for Foundry modules and plugins
- **Character sheet sync:** Bi-directional sync with player characters

---

## 13. Success Metrics

- Time to generate complete session: < 5 minutes
- User session creation rate (adoption metric)
- Session completion rate (engagement metric)
- Campaign continuity quality (qualitative feedback)
- System uptime (infrastructure metric)
- API response time (performance metric)

---

## 14. References & Resources

- **Foundry VTT API Documentation:** https://foundryvtt.com/article/api/
- **Foundry VTT Docker:** https://github.com/felddy/foundryvtt-docker
- **Claude API:** https://docs.anthropic.com/
- **D&D 5e SRD:** https://www.dndbeyond.com/ (for reference)
- **LangChain:** https://js.langchain.com/docs/

---

## Next Steps

1. **Validate requirements** with potential users (DMs)
2. **Create project repository** with Docker setup
3. **Design database schema** in detail
4. **Build Phase 1** foundation
5. **Test AI prompt engineering** for content quality
6. **Iterate based on feedback**
