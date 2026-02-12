# Lazy Foundry VTT

**AI-powered D&D campaign management platform with Foundry VTT integration.**

Generate maps, tokens, NPCs, lore, and scenarios using AI, then sync directly to your Foundry VTT instance. Reduce prep time from hours to minutes while maintaining narrative continuity across sessions.

[![Status](https://img.shields.io/badge/status-Phase%206%20Complete-brightgreen)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()
[![Docker](https://img.shields.io/badge/docker-required-blue)]()

## 📋 Table of Contents

- [Features](#-implemented-features)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Makefile Commands](#-makefile-commands)
- [Documentation](#-documentation)
- [Architecture](#-architecture)
- [Development](#-development)
- [Production Deployment](#-production-deployment)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

## 🚀 Quick Links

| For DMs | For Developers | For Admins |
|---------|---------------|------------|
| [Quick Start Guide](docs/QUICK_START.md) | [Architecture](PLANNING.md) | [Makefile Reference](docs/MAKEFILE_REFERENCE.md) |
| [DM Guide](docs/DM_GUIDE.md) | [Phase Documentation](docs/) | [ENV Configuration](docs/ENV_CONFIGURATION.md) |
| [Troubleshooting](#-troubleshooting) | [Database Schema](#-database-schema) | [Phase 6 Features](docs/PHASE_6_QUICK_REFERENCE.md) |
| | | [Security Guidelines](docs/SECURITY_GUIDELINES.md) |

## ✨ Implemented Features

### 🔐 Authentication & User Management (Phase 6 Enhanced)
- **JWT-based authentication** with token refresh mechanism
- **Enhanced security**: Token age validation, expiry checking
- **Secure password requirements**: 8+ characters, uppercase, numbers
- **Input validation & sanitization**: XSS protection, email normalization
- Protected API routes with auth middleware

### 🏰 Campaign Management
- Create, read, update, delete campaigns
- Campaign metadata: name, setting, theme, tone, player count
- Per-user campaign ownership
- **Caching support** for improved performance

### 📅 Session Tracking
- Create and manage game sessions per campaign
- Session status management (planned, active, completed)
- NPC and map assignment to sessions

### 🤖 AI-Powered Content Generation (Groq — llama-3.3-70b-versatile)
- **World Lore**: Rich history, factions, locations, legends, and quest hooks
- **NPC Generation**: Personalities, stats (STR/DEX/CON/INT/WIS/CHA), motivations, backgrounds
- **Player Backgrounds**: AI-generated character backstories
- **Map Descriptions**: AI-described rooms, features, connections, and dimensions
- **Encounter Generation**: Level-appropriate encounters with terrain and tactics
- **Session Summaries**: Automatic session summarization
- **Retry logic** with exponential backoff for resilience

### 🗺️ Procedural Map Generation
- **rot-js** powered dungeon and cave generation (Digger, Cellular automata)
- **Custom BSP** algorithm for building interiors
- **Custom block generator** for city layouts with roads and districts
- **Sharp** PNG rendering with noise texturing, grid lines, and color palettes
- Distinct visual styles per map type (dungeon, cave, city, building, wilderness, tavern, castle)
- Foundry VTT v13 compatible scene data with walls, doors, and lights
- 100px grid size for Foundry compatibility

### 🎭 Token Generation
- **DiceBear API** integration (5 avatar styles: adventurer, pixel-art, bottts, thumbs, lorelei)
- **Sharp-based fallback** with colored initials when API is unavailable
- 400×400px PNGs with transparency
- Foundry VTT compliant metadata (vision, detection modes, disposition, sizing)

### 🔄 Foundry VTT Live Sync (socket.io)
- **Full socket.io integration** — Foundry v13 has no REST API for document CRUD
- Automated auth flow: admin login → world launch → GM join → socket connect
- **Scene sync**: Push maps with background images, wall geometry, lighting, fog of war
- **Actor sync**: Push NPCs with D&D 5e stats, biography, and token images
- **Journal sync**: Push campaign lore as rich journal entries
- **Bulk sync**: Sync all maps + NPCs + lore for a campaign in one call
- **Shared volume**: Map PNGs and token images served via shared Docker volume (no cross-container HTTP)
- Sync status tracking (never/pending/synced/error) persisted in database
- Connection health monitoring endpoint
- Automatic GM user discovery via `getJoinData` socket event
- Auto-clears GM password so browser users can join without one

### 🎮 Foundry VTT Auto-Setup
- **D&D 5e system** auto-installs on first container boot (via container patches)
- **World** auto-creates if not present
- **World auto-launch** via `FOUNDRY_WORLD` environment variable
- Zero manual Foundry configuration required after license acceptance

### 🛡️ Phase 6: Production Hardening
- **Security Headers**: Helmet.js with CSP, HSTS, referrer policy
- **Request Tracing**: Correlation IDs for tracking requests across logs
- **Structured Logging**: JSON logging with levels (error, warn, info, debug)
- **Error Handling**: Global error handler with AppError class
- **Health Checks**: `/health/live`, `/health/ready`, `/health/metrics` endpoints
- **Database Optimization**: Connection pooling, strategic indexes
- **Caching**: In-memory cache for expensive queries
- **Pagination**: Cursor-based pagination for large datasets
- **Graceful Shutdown**: SIGTERM/SIGINT handling
- **Production-ready Docker Compose**: Health checks, restart policies, network isolation

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js + TypeScript + Express |
| **Database** | PostgreSQL 15 (TypeORM, connection pooling) |
| **AI** | Groq API (llama-3.3-70b-versatile via OpenAI SDK) |
| **Maps** | rot-js v2.2.0 (procedural) + sharp v0.33.2 (PNG) |
| **Tokens** | DiceBear API + sharp fallback |
| **Foundry Sync** | socket.io-client v4 (WebSocket) |
| **Frontend** | React 18 + Vite + TypeScript + Tailwind CSS |
| **Routing** | React Router v6 |
| **Security** | Helmet.js, JWT, bcrypt, express-validator |
| **Containers** | Docker + Docker Compose (4 services) |

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- [Groq API Key](https://console.groq.com/) (free)
- [Foundry VTT](https://foundryvtt.com/) license + account credentials

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/Lazy-Foundry-VTT.git
cd Lazy-Foundry-VTT
```

2. **Create `.env` file**
```bash
cat > .env << 'EOF'
# Foundry VTT Account (required for container to download Foundry)
FOUNDRY_USERNAME=your-foundryvtt-email
FOUNDRY_PASSWORD=your-foundryvtt-password
KEY=AAAA-BBBB-CCCC-DDDD-EEEE-FFFF

# Foundry Config
FOUNDRY_ADMIN_KEY=admin
FOUNDRY_WORLD=test

# AI
GROQ_API_KEY=your-groq-api-key

# JWT - IMPORTANT: Generate secure secret for production
JWT_SECRET=$(openssl rand -base64 32)

# Database (defaults work out of the box)
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=lazy_foundry
EOF
```

3. **Start all services using Make (recommended)**
```bash
# First time installation
make install

# Or manually
make build
make up
```

**Alternative: Using Docker Compose directly**
```bash
docker compose up -d --build
```

On first boot, the Foundry container will:
- Download and install Foundry VTT
- Auto-install the D&D 5e system (via container patch)
- Auto-create the world specified by `FOUNDRY_WORLD`
- Launch the world automatically

4. **Accept the Foundry license** (one-time only)
   - Open http://localhost:30000
   - Accept the EULA and enter your license key
   - The world will auto-launch after that

## 🛠️ Makefile Commands

The project includes a comprehensive Makefile for easy management:

### Quick Start
```bash
make help          # Show all available commands
make install       # First time setup
make up            # Start all services
make down          # Stop all services
make restart       # Restart all services
```

### Development
```bash
make dev           # Start with logs visible
make logs          # View all logs
make logs-api      # View API logs only
make logs-json     # View pretty formatted JSON logs
make shell-api     # Open shell in API container
make shell-db      # Open PostgreSQL shell
```

### Database
```bash
make migrate-up    # Run database migrations
make backup        # Create database backup
make restore       # Restore from latest backup
make db-reset      # Reset database (WARNING: deletes data)
```

### Health & Monitoring
```bash
make health        # Check health of all services
make status        # Show detailed service status
make ps            # Show running containers
make test-api      # Test API endpoints
```

### Production
```bash
make prod          # Start in production mode (validates config)
make clean         # Clean up all containers and volumes
make rebuild       # Rebuild and restart everything
```

### Utilities
```bash
make urls              # Show all service URLs
make version           # Show version info
make generate-jwt-secret  # Generate secure JWT secret
```

See `make help` for the complete list of commands.

5. **Access the application**
   - **Web UI**: http://localhost:3000
   - **API**: http://localhost:3001
   - **Foundry VTT**: http://localhost:30000

## 🎲 DM Guide: Creating Your First Campaign

This section walks through the complete workflow for a Dungeon Master to create and run a campaign using Lazy Foundry VTT.

### Overview: Campaign Creation Flow

```
1. Create Account (Register/Login)
2. Create Campaign (Set theme, setting, tone)
3. Generate World Lore (AI creates world history, factions, locations)
4. Create NPCs (AI generates personalities, stats, backgrounds)
5. Generate NPC Tokens (Avatar images for NPCs)
6. Create a Session (Schedule a game session)
7. Generate Session Scenario (AI creates encounters, objectives, rewards)
8. Create Maps (AI + procedural generation for dungeons, cities, etc.)
9. Sync Everything to Foundry VTT (One-click setup in your VTT)
10. Run the Session (Import scenario, track encounters, record results)
11. Finalize Session (Save results for campaign continuity)
```

### Step 1: Access the Web Application

After starting the servers with `docker compose up`, open:
- **Web UI**: http://localhost:3000
- **Foundry VTT**: http://localhost:30000

### Step 2: Create Your Account

1. Click **"Sign Up"** on the login page
2. Enter email, username, and a strong password
3. Click **"Create Account"**
4. You're logged in! You'll see the Dashboard

### Step 3: Create a Campaign

1. On the Dashboard, click **"New Campaign"**
2. Fill in campaign details:
   - **Name**: "The Dragonborn Curse", "Lost City of Arath", etc.
   - **Setting**: "Medieval Fantasy", "Spelljammer", "Dark Dwarven Kingdom", etc.
   - **Theme**: "Adventure", "Dark Fantasy", "Mystery", "Political Intrigue", etc.
   - **Tone**: "Heroic", "Gritty", "Humorous", "Serious", etc.
   - **Player Count**: How many players are in your party?

3. Click **"Create Campaign"**
4. You'll see the Campaign Detail page

### Step 4: Generate World Lore

The AI will create rich world-building content for your campaign:

1. On the Campaign page, scroll to the **"World Lore"** section
2. Click **"Generate Lore"** button
3. The AI generates:
   - **History**: Major historical events and eras
   - **Factions**: Political groups, guilds, organizations
   - **Locations**: Major cities, dungeons, landmarks
   - **Legends**: Myths and stories within the world
   - **Quest Hooks**: Adventure opportunities for your players

4. Review the generated lore, then click **"Save"**

The world lore will inform all subsequent generation (NPCs, scenarios, encounters).

### Step 5: Generate NPCs (Allies, Enemies, Quest-Givers)

Create the cast of characters your players will interact with:

1. Click **"Generate NPCs"** button
2. Set the count (typically 3-5 for your first batch)
3. The AI generates NPCs with:
   - **Name & Role**: Tavern keeper, noble, wizard, brigand, etc.
   - **Personality**: Quirks, mannerisms, speech patterns
   - **Stats**: D&D 5e ability scores (STR, DEX, CON, INT, WIS, CHA)
   - **Motivations**: What drives this NPC?
   - **Background**: Connection to the campaign world
   - **Loyalty**: Where do they stand with the party?

4. Review the NPCs and click **"Save"**
5. You can generate more NPCs anytime — they'll all be available for use in scenarios

### Step 6: Generate NPC Tokens (Character Images)

Every NPC needs an image in Foundry VTT:

1. In the **"NPCs"** section, hover over an NPC
2. Click **"Generate Token"** button
3. The system creates a 400×400px image:
   - Either from DiceBear avatar API (if available)
   - Or a fallback colored-initial avatar
4. The token is automatically saved and ready for Foundry sync

Repeat for all NPCs you plan to use in this session.

### Step 7: Create a Session

Each game session is tracked separately for continuity:

1. Click **"New Session"** button
2. Fill in:
   - **Title**: "Session 1: Arrival at Waterdeep", "The Goblin Caves", etc.
   - **Description** (optional): Brief notes about the planned session
   - **Scheduled Date** (optional): When you plan to play

3. Click **"Create Session"**
4. You're now on the Session Detail page

### Step 8: Generate a Session Scenario

The AI will create a complete scenario with encounters and plot hooks:

1. On the Session page, click **"Generate Scenario"** button
2. Wait while the AI creates:
   - **Scenario Title**: Compelling session hook
   - **Summary**: 2-3 paragraph overview of the session
   - **Objectives**: 2-4 main goals players can pursue
   - **Encounters**: 2-4 combat or roleplay encounters with:
     - Enemy names and descriptions
     - Difficulty rating (easy, medium, hard, deadly)
     - Enemy list and tactics
   - **Rewards**: Treasure, experience, and story rewards
   - **Twists**: Unexpected complications or reveals

3. Review the scenario — it's tailored to your campaign world and player count
4. Adjust any details you'd like to change manually

### Step 9: Generate Maps & Locations

Create visual dungeons and locations for the encounters:

1. Click **"Generate Map"** button
2. Specify:
   - **Description**: "Ancient temple filled with dark statues", "Bustling tavern with a secret basement", etc.
   - **Map Type**: Choose from:
     - `dungeon` — Underground ruins with rooms, corridors, traps
     - `cave` — Natural caverns with winding passages
     - `city` — Urban layout with streets and districts
     - `building` — Interior building layout (tavern, mansion, etc.)
     - `wilderness` — Outdoor terrain with forests, rivers, cliffs
     - `tavern` — Bar/inn interior
     - `castle` — Fortification with walls and towers

3. The system:
   - Uses procedural generation (rot-js) to create the layout
   - Adds walls, doors, and lighting automatically
   - Renders as a 400×400px PNG with grid overlay
   - Makes it 100% compatible with Foundry VTT

4. Multiple maps can be created for different encounter locations

### Step 10: Assign NPCs and Maps to Encounters

Link your generated content to the scenario:

1. In the Scenario section, for each encounter, note which map and NPCs are involved
2. Example:
   - Encounter 1: "Goblin Ambush" → Use **Forest Map**, NPC: Goblin Chief Grukk
   - Encounter 2: "Tavern Negotiation" → Use **Tavern Map**, NPC: Innkeeper Marta

The frontend helps you drag-and-drop or select which content belongs to each encounter.

### Step 11: Sync Everything to Foundry VTT

Send all your content (maps, NPCs, lore) to Foundry VTT with one click:

1. Click **"Sync to Foundry"** button on the Campaign page
2. Or for just this session, click **"Sync Session to Foundry"**
3. The system will:
   - Create **Scenes** for each map (with walls, lights, and background images)
   - Create **Actors** for each NPC (with D&D 5e stats and token images)
   - Create **Journal Entries** for campaign lore and session notes
   - Set everything up to be playable immediately

4. Within 30 seconds, check Foundry VTT (http://localhost:30000)
5. All content will be visible in the sidebar, ready to run the session

### Step 12: Run the Session in Foundry VTT

Now you're ready to play:

1. Open Foundry VTT as the GM
2. In the left sidebar, select the Scene (map) for your first encounter
3. Place player tokens on the map
4. Place enemy tokens (pulled from your generated NPCs)
5. Run the combat/roleplay encounter as normal
6. Use the NPC stat blocks for enemy actions
7. Use the scenario notes as your guide for dialogue and pacing

### Step 13: Record Session Results

After the session, save what happened for campaign continuity:

1. Return to the Session page in Lazy Foundry VTT
2. Click **"Finalize Session"** button
3. Fill in what happened:
   - **Summary**: What was the narrative arc of the session?
   - **Key Events**: Important plot points (bullet list)
   - **Player Decisions**: What choices did the party make?
   - **Combat Summary**: Which encounters happened, who died, damage taken?
   - **Loot Awarded**: What treasure did they find? How much XP?
   - **Mood/Tone**: Did it play out as planned? Any surprises?
   - **Character Development**: How did party dynamics evolve?
   - **Plot Threads**: What's left unresolved for next session?

4. Click **"Save Results"**

### Step 14: Prepare Next Session

The system remembers everything:

1. Create a new Session for your next game date
2. Click **"Generate Scenario"**
3. The AI will:
   - Reference the previous session results
   - Respect character development and NPC relationships
   - Build upon unresolved plot threads
   - Create a cohesive continuation of the story

4. Your campaign grows organically, with each session building on the last

---

## 🧪 End-to-End Test Workflow (CLI/API)

Complete walkthrough from user registration to content appearing in Foundry VTT using command-line tools. All steps use `curl` and `python3` (for JSON parsing) — both are pre-installed on most Linux/macOS systems.

> **Note**: If registration returns `"Email already registered"`, skip to Step 2 and login with existing credentials.

### Step 1: Register a User

```bash
curl -s -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testgm@test.com",
    "username": "testgm",
    "password": "password123"
  }' | python3 -m json.tool
```

### Step 2: Login and Get Token

```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testgm@test.com","password":"password123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

echo "Token: ${TOKEN:0:20}..."
```

### Step 3: Create a Campaign

```bash
CAMPAIGN=$(curl -s -X POST http://localhost:3001/api/campaigns \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Dark Forest Campaign",
    "setting": "A vast enchanted forest filled with ancient ruins",
    "theme": "dark fantasy",
    "tone": "mysterious",
    "playerCount": 4
  }')

CAMP_ID=$(echo "$CAMPAIGN" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "Campaign ID: $CAMP_ID"
```

### Step 4: Generate World Lore (AI)

```bash
curl -s -X POST "http://localhost:3001/api/generate/campaigns/$CAMP_ID/lore" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool | head -40
```

Returns AI-generated world description, history, factions, locations, legends, and quest hooks.

### Step 5: Generate NPCs (AI)

```bash
NPC_RESULT=$(curl -s -X POST "http://localhost:3001/api/generate/campaigns/$CAMP_ID/npcs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"count": 2}')

echo "$NPC_RESULT" | python3 -m json.tool | head -60

NPC1=$(echo "$NPC_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['npcs'][0]['id'])")
NPC2=$(echo "$NPC_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['npcs'][1]['id'])")
echo "NPC IDs: $NPC1, $NPC2"
```

Returns NPCs with names, roles, personalities, stats, motivations, and backgrounds.

### Step 6: Generate a Token for an NPC

```bash
curl -s -X POST "http://localhost:3001/api/generate/campaigns/$CAMP_ID/npcs/$NPC1/token" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool
```

### Step 7: Generate a Map (AI + Procedural)

```bash
MAP_RESULT=$(curl -s --max-time 120 -X POST "http://localhost:3001/api/generate/campaigns/$CAMP_ID/maps" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "description": "An ancient temple hidden deep in the forest, overrun by dark fey creatures",
    "mapType": "dungeon"
  }')

MAP_ID=$(echo "$MAP_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['map']['id'])")
echo "Map ID: $MAP_ID"
echo "$MAP_RESULT" | python3 -m json.tool | head -30
```

Supported map types: `dungeon`, `cave`, `city`, `building`, `wilderness`, `tavern`, `castle`, `other`

### Step 8: Check Foundry VTT Connection

```bash
curl -s "http://localhost:3001/api/foundry/health" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool
```

Expected output:
```json
{
    "status": "connected",
    "foundryUrl": "http://foundry:30000",
    "worldActive": true,
    "foundryVersion": "13.351",
    "world": "test",
    "system": "dnd5e"
}
```

### Step 9: Sync Map to Foundry as Scene

```bash
curl -s -X POST "http://localhost:3001/api/foundry/scenes/$MAP_ID" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool
```

Response:
```json
{
    "success": true,
    "message": "Map synced to Foundry VTT",
    "foundrySceneId": "0TcZwCKDugNarl5G"
}
```

### Step 10: Sync NPCs to Foundry as Actors

```bash
curl -s -X POST "http://localhost:3001/api/foundry/actors/$NPC1" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool

curl -s -X POST "http://localhost:3001/api/foundry/actors/$NPC2" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool
```

Response:
```json
{
    "success": true,
    "message": "NPC synced to Foundry VTT",
    "foundryActorId": "wsg8OSYe8HVd57Wf"
}
```

### Step 11: Sync Lore to Foundry as Journal Entry

```bash
curl -s -X POST "http://localhost:3001/api/foundry/journals/$CAMP_ID" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool
```

Response:
```json
{
    "success": true,
    "message": "Campaign lore synced to Foundry VTT",
    "foundryJournalId": "HEiQcsUMi8LClHiM"
}
```

### Step 12: Verify in Foundry

```bash
# List all scenes in Foundry
curl -s "http://localhost:3001/api/foundry/scenes" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c "
import sys,json
data = json.load(sys.stdin)
for s in data['scenes']:
    print(f'  {s[\"_id\"]}: {s[\"name\"]}')
"

# List all actors in Foundry
curl -s "http://localhost:3001/api/foundry/actors" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c "
import sys,json
data = json.load(sys.stdin)
for a in data['actors']:
    print(f'  {a[\"_id\"]}: {a[\"name\"]} ({a[\"type\"]})')
"
```

### Alternative: Bulk Sync Everything

Instead of syncing individually, sync all maps + NPCs + lore for a campaign at once:

```bash
curl -s -X POST "http://localhost:3001/api/foundry/campaigns/$CAMP_ID/bulk" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool
```

## 📖 API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user (`email`, `username`, `password`) |
| POST | `/api/auth/login` | Login (`email`, `password`) → JWT token |
| GET | `/api/auth/me` | Get current user (requires auth) |

### Campaigns
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/campaigns` | List user's campaigns |
| POST | `/api/campaigns` | Create campaign |
| GET | `/api/campaigns/:id` | Get campaign details |
| PUT | `/api/campaigns/:id` | Update campaign |
| DELETE | `/api/campaigns/:id` | Delete campaign |

### AI Generation
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/generate/campaigns/:id/lore` | Generate world lore |
| POST | `/api/generate/campaigns/:id/npcs` | Generate NPCs (`count`: 1-5) |
| GET | `/api/generate/campaigns/:id/npcs` | List campaign NPCs |
| POST | `/api/generate/campaigns/:id/npcs/:npcId/token` | Generate NPC token image |
| GET | `/api/generate/campaigns/:id/tokens` | List campaign tokens |
| POST | `/api/generate/campaigns/:id/maps` | Generate map (`description`, `mapType`) |
| GET | `/api/generate/campaigns/:id/maps` | List campaign maps |
| GET | `/api/generate/campaigns/:id/maps/:mapId/foundry-export` | Download Foundry scene JSON |
| POST | `/api/generate/campaigns/:id/backgrounds` | Generate player backgrounds |
| POST | `/api/generate/campaigns/:id/encounters` | Generate encounters |
| POST | `/api/generate/sessions/:id/scenario` | Generate session scenario |
| POST | `/api/generate/sessions/:id/summarize` | Summarize session |

### Sessions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/campaigns/:campaignId/sessions` | List campaign sessions |
| POST | `/api/campaigns/:campaignId/sessions` | Create session (`title`, `description?`, `scheduledDate?`) |
| GET | `/api/sessions/:id` | Get session details |
| PUT | `/api/sessions/:id` | Update session |
| DELETE | `/api/sessions/:id` | Delete session |

### Foundry VTT Sync
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/foundry/health` | Check Foundry connection + world status |
| POST | `/api/foundry/scenes/:mapId` | Sync map → Foundry scene |
| POST | `/api/foundry/actors/:npcId` | Sync NPC → Foundry actor |
| POST | `/api/foundry/journals/:campaignId` | Sync lore → Foundry journal entry |
| POST | `/api/foundry/campaigns/:campaignId/bulk` | Bulk sync entire campaign |
| GET | `/api/foundry/scenes` | List scenes from Foundry |
| GET | `/api/foundry/actors` | List actors from Foundry |

## 🗂️ Project Structure

```
Lazy-Foundry-VTT/
├── api/                          # Backend Express API
│   ├── src/
│   │   ├── index.ts              # Express app entry
│   │   ├── config/database.ts    # TypeORM + PostgreSQL config
│   │   ├── entities/             # TypeORM entities
│   │   │   ├── User.ts
│   │   │   ├── Campaign.ts
│   │   │   ├── Session.ts
│   │   │   ├── SessionResult.ts
│   │   │   ├── NPC.ts
│   │   │   └── Map.ts
│   │   ├── middleware/auth.ts    # JWT auth middleware
│   │   ├── routes/
│   │   │   ├── auth.ts           # Register/login
│   │   │   ├── campaigns.ts      # Campaign CRUD
│   │   │   ├── sessions.ts       # Session management
│   │   │   ├── generate.ts       # AI generation endpoints
│   │   │   └── foundry.ts        # Foundry VTT sync endpoints
│   │   └── services/
│   │       ├── ai.ts             # Groq AI integration
│   │       ├── mapGenerator.ts   # Procedural map + PNG rendering
│   │       ├── tokenGenerator.ts # DiceBear + sharp token generation
│   │       └── foundrySync.ts    # Foundry socket.io sync service
│   ├── assets/                   # Generated maps/tokens (Docker volume)
│   ├── Dockerfile
│   └── package.json
├── web/                          # Frontend React app
│   ├── src/
│   │   ├── App.tsx               # Router + layout
│   │   ├── components/           # Reusable components
│   │   ├── context/AuthContext.tsx
│   │   ├── pages/                # Dashboard, Campaign, Session, Login
│   │   ├── services/api.ts       # Axios API client
│   │   └── types/index.ts
│   ├── Dockerfile
│   └── package.json
├── foundry/
│   └── container_patches/
│       └── 01-install-dnd5e.sh   # Auto-install D&D 5e + create world
├── docs/                         # Phase planning docs
├── docker-compose.yml
├── .env                          # Environment variables (not committed)
└── README.md
```

## 🔧 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FOUNDRY_USERNAME` | Yes | — | FoundryVTT.com account email |
| `FOUNDRY_PASSWORD` | Yes | — | FoundryVTT.com account password |
| `KEY` | Yes | — | Foundry license key |
| `GROQ_API_KEY` | Yes | — | Groq API key for AI generation |
| `FOUNDRY_ADMIN_KEY` | No | `admin` | Foundry admin password |
| `FOUNDRY_WORLD` | No | `test` | World name to auto-create and launch |
| `FOUNDRY_GM_USER_ID` | No | auto-discovered | Override GM user ID |
| `JWT_SECRET` | No | dev default | JWT signing secret |
| `DB_USER` | No | `postgres` | PostgreSQL user |
| `DB_PASSWORD` | No | `postgres` | PostgreSQL password |
| `DB_NAME` | No | `lazy_foundry` | PostgreSQL database name |

## 🎮 Foundry VTT Integration Details

### How Sync Works

Foundry VTT v13 does **not** have a REST API for document operations. All document CRUD is performed via **socket.io** WebSocket connections. The sync service implements this flow:

1. **Admin Auth** — `POST /auth` with admin password → session cookie
2. **World Launch** — Check `/api/status`, launch world via `POST /setup` if needed (retries up to 30s for migrations)
3. **GM Discovery** — Connect admin socket, emit `getJoinData` → returns user list with roles, find role=4 (GAMEMASTER)
4. **GM Join** — `POST /join` with JSON body `{action: "join", userid, password: ""}` — admin session bypasses password
5. **Socket Connect** — Connect socket.io with session as query parameter → `session` event confirms `userId`
6. **Password Clear** — `modifyDocument` UPDATE on User to clear GM password so browser users can join freely
7. **Document Operations** — `modifyDocument` socket event for all CRUD (create/update/delete/get)

### Asset Delivery (Shared Volume)

Map images and token PNGs are stored by the API container in a Docker volume (`assets`). This volume is mounted read-only into the Foundry container at `/data/Data/lazy-foundry-assets/`. When syncing scenes and actors, the API writes **Foundry-local paths** (e.g., `lazy-foundry-assets/maps/xxx.png`) instead of HTTP URLs, so Foundry serves the images directly from its own filesystem — no cross-container HTTP required.

### Auto-Setup (Zero Config)

The Foundry container uses [felddy/foundryvtt-docker](https://github.com/felddy/foundryvtt-docker) with container patches:

- **`CONTAINER_PATCHES`** mounts `foundry/container_patches/` into the container
- **`01-install-dnd5e.sh`** runs before Foundry starts:
  - Downloads and installs the D&D 5e system from GitHub if not present
  - Creates a world with `dnd5e` as the system if not present
- **`FOUNDRY_WORLD`** tells Foundry to auto-launch the world on startup

After the one-time license acceptance, everything is fully automated.

### Foundry Scene Data Format (v13)
- **Grid**: 100px squares, 5ft distance
- **Walls**: `c:[x0,y0,x1,y1]`, door types (0=none, 1=door, 2=secret)
- **Lights**: Position, dim/bright radius, color, animation
- **Fog**: Token vision enabled, exploration on
- **Background**: PNG served from shared Docker volume at `lazy-foundry-assets/maps/`

### Foundry Actor Data Format (D&D 5e)
- **Type**: `npc`
- **Abilities**: STR, DEX, CON, INT, WIS, CHA with values
- **Biography**: HTML-formatted description and background
- **Token image**: Served from shared volume at `lazy-foundry-assets/tokens/`
- **Token display**: Name on hover, health bar

## 📊 Database Schema

| Entity | Key Fields |
|--------|-----------|
| **users** | email, username, passwordHash |
| **campaigns** | name, setting, theme, tone, playerCount, worldLore, ownerId |
| **sessions** | campaignId, status, npcIds, mapIds |
| **session_results** | sessionId, events, playerDecisions, unfinishedThreads |
| **npcs** | campaignId, name, role, stats, personality, foundryActorId, syncStatus |
| **maps** | campaignId, name, type, imageUrl, foundrySceneId, foundryData, syncStatus |

## 🔧 Development

### Using Make Commands
```bash
# Development mode (with logs)
make dev

# View logs
make logs-api
make logs-foundry
make logs-json  # Pretty formatted JSON logs

# Shell access
make shell-api
make shell-db

# Rebuild after code changes
make rebuild

# Full reset (wipe database + volumes)
make clean
make up
```

### Manual Docker Commands
```bash
# View logs
docker compose logs -f api
docker compose logs -f foundry

# Rebuild after code changes
docker compose up -d --build

# Full reset
docker compose down -v
docker compose up -d --build
```

### Database Management
```bash
# Backup database
make backup

# Apply migrations
make migrate-up

# Reset database
make db-reset
```

---

## 📚 Documentation

### For Dungeon Masters
- **[Quick Start Guide](docs/QUICK_START.md)** - Get started in 5 minutes
- **[DM Guide](docs/DM_GUIDE.md)** - Comprehensive guide for running campaigns
- **[Best Practices](#)** - Tips for effective AI-powered sessions

### For Developers
- **[Architecture Overview](PLANNING.md)** - System design and architecture
- **[Phase 1-6 Documentation](docs/)** - Implementation details
- **[API Documentation](#)** - API reference (coming soon)
- **[Database Schema](#-database-schema)** - Database structure

### For System Administrators
- **[Makefile Reference](docs/MAKEFILE_REFERENCE.md)** - Complete command reference
- **[Environment Configuration](docs/ENV_CONFIGURATION.md)** - Configuration guide
- **[Phase 6 Quick Reference](docs/PHASE_6_QUICK_REFERENCE.md)** - Production features
- **[Security Guidelines](docs/SECURITY_GUIDELINES.md)** - Security best practices

### Implementation Documentation
- **[Phase 1: Foundation](docs/PHASE_1_FOUNDATION.md)** - Core infrastructure
- **[Phase 2: AI Integration](docs/PHASE_2_AI_INTEGRATION.md)** - LLM integration
- **[Phase 3: Content Generation](docs/PHASE_3_CONTENT_GENERATION.md)** - Maps, tokens, NPCs
- **[Phase 4: Foundry Integration](docs/PHASE_4_FOUNDRY_VTT_INTEGRATION.md)** - Foundry sync
- **[Phase 5: Session Continuity](docs/PHASE_5_SESSION_RESULTS_AND_CONTINUITY.md)** - Session tracking
- **[Phase 6: Production Hardening](docs/PHASE_6_IMPLEMENTATION_COMPLETE.md)** - Security & optimization

---

## 🏭 Production Deployment

### Prerequisites
- Docker & Docker Compose
- Valid Foundry VTT license
- Groq API key (or OpenAI API key)
- SSL certificates (for HTTPS)

### Production Checklist

1. **Generate Secure JWT Secret**
   ```bash
   make generate-jwt-secret
   # Copy output to .env
   ```

2. **Configure Environment**
   ```bash
   NODE_ENV=production
   JWT_SECRET=<your-generated-secret>
   CORS_ORIGIN=https://yourdomain.com
   LOG_LEVEL=info
   ```

3. **Deploy with Production Mode**
   ```bash
   make prod
   ```

4. **Apply Database Indexes**
   ```bash
   make migrate-up
   ```

5. **Setup Automated Backups**
   ```bash
   # Add to crontab
   0 2 * * * cd /path/to/Lazy-Foundry-VTT && make backup
   ```

6. **Monitor Services**
   ```bash
   make health
   make status
   ```

### Health Checks

```bash
# Liveness check
curl http://localhost:3001/health/live

# Readiness check
curl http://localhost:3001/health/ready

# Metrics
curl http://localhost:3001/health/metrics
```

### Monitoring

- **Structured Logs**: All logs are JSON formatted
- **Correlation IDs**: Every request has a unique x-request-id
- **Health Endpoints**: Ready for Prometheus scraping
- **Container Health**: Docker health checks enabled

---

## 🐛 Troubleshooting

### Common Issues

**Services won't start?**
```bash
make clean
make install
```

**Container name conflicts?**
```bash
make clean  # Removes old containers
make up
```

**Can't login to Foundry?**
- **First time setup?** You need to create a GM user:
  1. Login with admin password (`FOUNDRY_ADMIN_KEY` from `.env`)
  2. After world launches, click "Return to Setup"
  3. Go to Configuration → Users → Create User
  4. Create a Gamemaster user with a password
  5. Launch world and login with your new GM user
- **Already have a GM user?** Check your GM user's password
- Default admin password: `admin` (check your `.env` for `FOUNDRY_ADMIN_KEY`)

**Foundry not syncing?**
```bash
# Check Foundry connection
make health

# View sync errors
make logs-api | grep sync

# Restart Foundry
make restart
```

**Database errors?**
```bash
# Check database
make shell-db

# Reset database
make db-reset
```

**API errors?**
```bash
# View detailed logs
make logs-api

# View last 50 lines
make quick-logs

# Pretty formatted JSON
make logs-json
```

**Permission issues?**
```bash
make fix-permissions
```

### Debug Mode

Enable debug logging:
```bash
# In .env
LOG_LEVEL=debug

# Restart
make restart
```

### Getting Help

1. Check logs: `make logs-api`
2. Check health: `make health`
3. Check status: `make status`
4. View all commands: `make help`

Every error includes a `requestId` for tracking!

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly (`make health`)
5. Submit a pull request

### Development Setup

```bash
# Clone your fork
git clone <your-fork-url>
cd Lazy-Foundry-VTT

# Install and run
make install

# Start development
make dev
```

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🙏 Acknowledgments

- **Foundry VTT** - Amazing VTT platform
- **Groq** - Fast LLM inference
- **rot-js** - Procedural generation library
- **felddy/foundryvtt-docker** - Foundry Docker image
- **DiceBear** - Avatar generation API

---

## 📞 Support

- **Documentation**: Check `/docs` folder
- **Issues**: GitHub Issues
- **Health Check**: `make health`
- **Logs**: `make logs-api`

---

## 🎯 Project Status

**Phase 6 Complete** - Production Ready! ✅

- ✅ Core features implemented
- ✅ AI integration complete
- ✅ Foundry VTT sync working
- ✅ Session continuity functional
- ✅ Production hardening complete
- ✅ Comprehensive documentation
- ✅ Easy deployment with Make

**Ready for real campaigns!** 🎲

---

Made with ❤️ for Dungeon Masters who want to spend more time gaming and less time prepping.

# Connect to database
docker compose exec db psql -U postgres -d lazy_foundry
```

## 🚦 Roadmap

- [x] Phase 1: Foundation (Auth, Campaigns, Sessions)
- [x] Phase 2: AI Integration (Lore, NPCs, Backgrounds, Encounters)
- [x] Phase 3: Content Generation (Maps, Tokens, Assets)
- [x] Phase 4: Foundry VTT Integration (Socket.io Sync, Auto-Setup)
- [ ] Phase 5: Session Results & Continuity
- [ ] Phase 6: Polish & Enhancements

## 📝 License

MIT

## 🙏 Acknowledgments

- **[Groq](https://groq.com/)** — Fast AI inference with llama-3.3-70b-versatile
- **[rot-js](https://ondras.github.io/rot.js/)** — Roguelike procedural generation toolkit
- **[DiceBear](https://dicebear.com/)** — Free avatar generation API
- **[Foundry VTT](https://foundryvtt.com/)** — Virtual tabletop platform
- **[sharp](https://sharp.pixelplumbing.com/)** — High-performance image processing
- **[felddy/foundryvtt-docker](https://github.com/felddy/foundryvtt-docker)** — Foundry VTT Docker container
