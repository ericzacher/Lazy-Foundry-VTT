# Lazy Foundry VTT

AI-powered D&D campaign management platform with Foundry VTT integration. Generate maps, tokens, NPCs, lore, and scenarios using AI, then sync directly to your Foundry VTT instance.

## ✨ Features

### Phase 1 & 2: Foundation (Complete ✅)
- **User Authentication**: JWT-based auth with secure session management
- **Campaign Management**: Create and manage multiple D&D campaigns
- **Session Tracking**: Plan and track game sessions with status management
- **AI-Powered Lore Generation**: Generate rich world lore using Groq (llama-3.3-70b-versatile)
- **NPC Generation**: Create detailed NPCs with personalities, stats, and motivations
- **Player Background Generation**: AI-generated character backstories
- **Session Summaries**: Automatic session summarization with event tracking
- **Error Handling**: Comprehensive error boundaries and loading states

### Phase 3: Content Generation (Complete ✅)
- **🗺️ Procedural Map Generation**:
  - rot-js powered dungeon/cave generation
  - PNG map rendering with sharp (464KB images, noise texturing, grid lines)
  - Foundry VTT v13 compatible scene data
  - 188-261 wall segments, 28-30 lights per map
  - Walls, doors, lighting, fog of war
  - 100px grid size for Foundry compatibility

- **🎭 Token Generation**:
  - DiceBear API integration (free, 5 avatar styles)
  - Sharp-based fallback with initials
  - Foundry VTT compliant metadata
  - Vision systems (range, angle, modes)
  - Grid-based sizing (0.5-4 units)
  - Disposition (friendly/neutral/hostile)
  - 400x400px PNGs with transparency

- **📦 Asset Management**:
  - Docker volume-based storage
  - Static file serving
  - Foundry scene export (JSON)

### Phase 4: Foundry VTT Integration (Complete ✅)
- **🔄 Foundry VTT Sync**:
  - Direct HTTP API integration with Foundry VTT
  - Push maps to Foundry as scenes with walls, lights, doors
  - Sync NPCs as actors with stats, abilities, and tokens
  - Sync campaign lore as journal entries
  - Bulk campaign sync (all maps + NPCs + lore)
  - Real-time sync status tracking (never/pending/synced/error)
  - Connection health monitoring
  - Sync status badges in UI
  - Individual and bulk sync operations

- **🎯 Sync Features**:
  - Scene creation with background images, walls, lighting
  - Actor creation with D&D 5e stats and biography
  - Token placement with vision and detection settings
  - Journal entry creation for world lore
  - Sync status persistence in database
  - Error handling and retry support

## 🏗️ Tech Stack

### Backend
- **Runtime**: Node.js + TypeScript + Express
- **Database**: PostgreSQL 15 (TypeORM)
- **AI**: Groq API (llama-3.3-70b-versatile via OpenAI-compatible SDK)
- **Map Generation**: rot-js v2.2.0 (procedural generation)
- **Image Processing**: sharp v0.33.2 (PNG rendering)
- **Token Generation**: DiceBear API + sharp fallback

### Frontend
- **Framework**: React 18 + Vite + TypeScript
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **State**: React Context API

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Services**: 4 containers (PostgreSQL, API, Web, Foundry VTT)
- **Network**: Custom bridge network
- **Volumes**: Persistent storage for DB and assets

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Groq API Key ([Get one free](https://console.groq.com/))
- Foundry VTT license (optional, for Phase 4 sync)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/Lazy-Foundry-VTT.git
cd Lazy-Foundry-VTT
```

2. **Set up environment variables**
```bash
# Create .env file in root directory
cat > .env << EOF
# Database
DATABASE_URL=postgresql://lazy_foundry_user:secure_password@db:5432/lazy_foundry_db

# JWT
JWT_SECRET=your-super-secure-jwt-secret-change-this-in-production

# AI - Groq API (llama-3.3-70b-versatile)
GROQ_API_KEY=your-groq-api-key-here
# Get free key at: https://console.groq.com/

# Foundry VTT (Phase 4)
FOUNDRY_ADMIN_KEY=your-foundry-admin-key
FOUNDRY_URL=http://foundry:30000
EOF
```

3. **Start the application**
```bash
# Build and start all services
docker compose up -d --build

# View logs
docker compose logs -f

# Stop services
docker compose down

# Clean restart (removes volumes)
docker compose down -v
docker compose up -d --build
```

4. **Access the application**
- **Web UI**: http://localhost:3000
- **API**: http://localhost:3001
- **Foundry VTT**: http://localhost:30000 (Phase 4)

5. **Create your first campaign**
- Register a new account
- Create a campaign with name, setting, theme, and player count
- Generate world lore, NPCs, and sessions
- Generate maps and tokens for your adventures
- (Phase 4) Sync content to Foundry VTT

## 📖 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Campaigns
- `GET /api/campaigns` - List user's campaigns
- `POST /api/campaigns` - Create campaign
- `GET /api/campaigns/:id` - Get campaign details
- `PUT /api/campaigns/:id` - Update campaign
- `DELETE /api/campaigns/:id` - Delete campaign

### Generation (AI-Powered)
- `POST /api/generate/campaigns/:id/lore` - Generate world lore
- `POST /api/generate/campaigns/:id/npcs` - Generate 3 NPCs
- `POST /api/generate/campaigns/:id/maps` - Generate map with PNG + Foundry data
- `POST /api/generate/campaigns/:id/npcs/:npcId/token` - Generate token for NPC
- `GET /api/generate/campaigns/:id/maps/:mapId/foundry-export` - Download Foundry scene JSON
- `POST /api/generate/campaigns/:id/backgrounds` - Generate player backgrounds
- `POST /api/generate/campaigns/:id/encounters` - Generate encounters

### Sessions
- `GET /api/sessions/:campaignId` - List campaign sessions
- `POST /api/sessions` - Create session
- `GET /api/sessions/:id` - Get session details
- `PUT /api/sessions/:id` - Update session

### Foundry VTT Sync
- `GET /api/foundry/health` - Check Foundry connection status
- `POST /api/foundry/scenes/:mapId` - Sync map to Foundry as scene
- `POST /api/foundry/actors/:npcId` - Sync NPC to Foundry as actor
- `POST /api/foundry/journals/:campaignId` - Sync campaign lore to Foundry journal
- `POST /api/foundry/campaigns/:campaignId/bulk` - Bulk sync entire campaign
- `GET /api/foundry/scenes` - List scenes from Foundry
- `GET /api/foundry/actors` - List actors from Foundry

## 🗂️ Project Structure

```
Lazy-Foundry-VTT/
├── api/                    # Backend Express API
│   ├── src/
│   │   ├── config/        # Database, environment config
│   │   ├── entities/      # TypeORM entities
│   │   ├── middleware/    # Auth middleware
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   │   ├── ai.ts              # Groq AI integration
│   │   │   ├── mapGenerator.ts    # Procedural map generation
│   │   │   ├── tokenGenerator.ts  # Token image generation
│   │   │   └── foundrySync.ts     # Foundry VTT sync (Phase 4)
│   │   └── index.ts       # Express app entry
│   ├── assets/            # Generated maps/tokens
│   │   ├── maps/          # Map PNGs
│   │   └── tokens/        # Token PNGs
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── web/                    # Frontend React app
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── context/       # React context
│   │   ├── hooks/         # Custom hooks
│   │   ├── pages/         # Page components
│   │   ├── services/      # API client
│   │   └── types/         # TypeScript types
│   ├── Dockerfile
│   ├── package.json
│   └── vite.config.ts
├── docs/                   # Phase documentation
│   ├── PHASE_1_FOUNDATION.md
│   ├── PHASE_2_AI_INTEGRATION.md
│   ├── PHASE_3_CONTENT_GENERATION.md
│   ├── PHASE_4_FOUNDRY_VTT_INTEGRATION.md
│   ├── PHASE_5_SESSION_RESULTS_AND_CONTINUITY.md
│   └── PHASE_6_POLISH_AND_ENHANCEMENTS.md
├── docker-compose.yml
├── .env
└── README.md
```

## 🎮 Foundry VTT Compatibility

### Map Export Format (Foundry v13)
- **Scene Data**: Width, height, grid type (1=square), grid size (100px)
- **Walls**: `c:[x0,y0,x1,y1]`, door types (0=none, 1=door, 2=secret)
- **Lights**: Position (x,y), dim/bright radius, color, animation
- **Fog of War**: Token vision, exploration enabled
- **Background**: Served PNG image URL

### Token Format (Foundry v13)
- **Size**: tiny(0.5), small(1), medium(1), large(2), huge(3), gargantuan(4) grid units
- **Vision**: Enabled, range (60ft), angle (360°), vision mode
- **Detection**: basicSight, seeInvisibility, etc.
- **Disposition**: -1=hostile, 0=neutral, 1=friendly
- **Display**: Name/bars on hover (30), health bar (attributes.hp)
- **Image**: 400x400px PNG, transparent background

## 🧪 Testing

```bash
# Test map generation API
curl -X POST "http://localhost:3001/api/generate/campaigns/{CAMPAIGN_ID}/maps" \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "A dark dungeon beneath an ancient castle",
    "mapType": "dungeon"
  }'

# Test token generation API
curl -X POST "http://localhost:3001/api/generate/campaigns/{CAMPAIGN_ID}/npcs/{NPC_ID}/token" \
  -H "Authorization: Bearer {JWT_TOKEN}"

# Download Foundry scene export
curl "http://localhost:3001/api/generate/campaigns/{CAMPAIGN_ID}/maps/{MAP_ID}/foundry-export" \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -o scene.json
```

## 📊 Database Schema

### Core Entities
- **users**: User accounts with JWT auth
- **campaigns**: Campaign metadata and settings
- **sessions**: Game sessions with status tracking
- **session_results**: Session summaries and continuity
- **npcs**: Generated NPCs with stats and personalities
- **maps**: Generated maps with Foundry data
- **tokens**: Generated tokens with vision/detection config

### Relationships
- User → Campaigns (1:N)
- Campaign → Sessions (1:N)
- Campaign → NPCs (1:N)
- Campaign → Maps (1:N)
- Campaign → Tokens (1:N)
- Session → SessionResult (1:1)

## 🔧 Development

### Run in Development Mode
```bash
# Backend (hot reload)
cd api
npm run dev

# Frontend (hot reload)
cd web
npm run dev
```

### Database Migrations
```bash
# TypeORM auto-syncs in development
# In production, use migrations:
cd api
npm run migration:generate -- -n MigrationName
npm run migration:run
```

### Debugging
```bash
# View API logs
docker compose logs -f api

# View database
docker compose exec db psql -U lazy_foundry_user -d lazy_foundry_db

# Inspect volumes
docker volume ls
docker volume inspect lazy-foundry-vtt_assets
```

## 🚦 Roadmap

- [x] Phase 1: Foundation (Auth, Campaigns, Sessions)
- [x] Phase 2: AI Integration (Lore, NPCs, Backgrounds)
- [x] Phase 3: Content Generation (Maps, Tokens, Assets)
- [ ] Phase 4: Foundry VTT Integration (Sync, Import/Export) 🚧
- [ ] Phase 5: Session Results & Continuity
- [ ] Phase 6: Polish & Enhancements

## 📝 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- **Groq**: Fast AI inference with llama-3.3-70b-versatile
- **rot-js**: Roguelike procedural generation toolkit
- **DiceBear**: Free avatar generation API
- **Foundry VTT**: Virtual tabletop platform
- **sharp**: High-performance image processing

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

## 📧 Support

For questions or issues, please open a GitHub issue.