# Lazy Foundry VTT

AI-powered D&D campaign management platform with Foundry VTT integration. Generate maps, tokens, NPCs, lore, and scenarios using AI, then sync directly to your Foundry VTT instance via socket.io.

## ✨ Implemented Features

### 🔐 Authentication & User Management
- JWT-based registration and login
- Secure password hashing with bcrypt
- Protected API routes with auth middleware

### 🏰 Campaign Management
- Create, read, update, delete campaigns
- Campaign metadata: name, setting, theme, tone, player count
- Per-user campaign ownership

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
- Sync status tracking (never/pending/synced/error) persisted in database
- Connection health monitoring endpoint
- Automatic GM user discovery from Foundry's LevelDB

### 🎮 Foundry VTT Auto-Setup
- **D&D 5e system** auto-installs on first container boot (via container patches)
- **World** auto-creates if not present
- **World auto-launch** via `FOUNDRY_WORLD` environment variable
- Zero manual Foundry configuration required after license acceptance

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js + TypeScript + Express |
| **Database** | PostgreSQL 15 (TypeORM, auto-sync) |
| **AI** | Groq API (llama-3.3-70b-versatile via OpenAI SDK) |
| **Maps** | rot-js v2.2.0 (procedural) + sharp v0.33.2 (PNG) |
| **Tokens** | DiceBear API + sharp fallback |
| **Foundry Sync** | socket.io-client v4 (WebSocket) |
| **Frontend** | React 18 + Vite + TypeScript + Tailwind CSS |
| **Routing** | React Router v6 |
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

# JWT
JWT_SECRET=change-this-to-a-random-secret

# Database (defaults work out of the box)
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=lazy_foundry
EOF
```

3. **Start all services**
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

5. **Access the application**
   - **Web UI**: http://localhost:3000
   - **API**: http://localhost:3001
   - **Foundry VTT**: http://localhost:30000

## 🧪 End-to-End Test Workflow

Complete walkthrough from user registration to content appearing in Foundry VTT. All steps use `curl` and `python3` (for JSON parsing) — both are pre-installed on most Linux/macOS systems.

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
2. **World Launch** — Check `/api/status`, launch world via `POST /setup` if needed
3. **GM Discovery** — Find the Gamemaster user ID from the join page
4. **GM Join** — `POST /join` with GM user ID → authenticate as GM
5. **Socket Connect** — Connect socket.io with session as query parameter
6. **Document Operations** — `modifyDocument` socket event for all CRUD

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
- **Background**: PNG served from API container via Docker network

### Foundry Actor Data Format (D&D 5e)
- **Type**: `npc`
- **Abilities**: STR, DEX, CON, INT, WIS, CHA with values
- **Biography**: HTML-formatted description and background
- **Token**: Display name on hover, health bar

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

```bash
# View logs
docker compose logs -f api
docker compose logs -f foundry

# Rebuild after code changes
docker compose up -d --build

# Full reset (wipe database + volumes)
docker compose down -v
docker compose up -d --build

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
