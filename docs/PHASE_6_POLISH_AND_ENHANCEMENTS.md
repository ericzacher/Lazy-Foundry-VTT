# Phase 6: Polish & Enhancements - UI/UX, Performance & Optional Features

**Duration:** 2 weeks
**Goal:** Polish application, optimize performance, add optional features, and complete documentation

**Dependencies:** Phase 1-5 complete (all core features working)

---

## 1. Overview

Phase 6 focuses on:
- UI/UX improvements and refinement
- Performance optimization
- Comprehensive testing
- API documentation
- User documentation and guides
- Optional advanced features
- Deployment preparation
- Monitoring and logging

---

## 2. UI/UX Improvements

### 2.1 Dashboard Enhancement

**frontend/src/pages/Dashboard.jsx:**
```jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { campaignService } from '../services/campaignService';

export function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentCampaigns, setRecentCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const campaigns = await campaignService.list();

      // Get stats
      let totalSessions = 0;
      let totalNPCs = 0;

      for (const campaign of campaigns) {
        const details = await campaignService.get(campaign.id);
        totalSessions += details.sessions?.length || 0;
      }

      setRecentCampaigns(campaigns.slice(0, 5));
      setStats({
        totalCampaigns: campaigns.length,
        totalSessions,
        averageSessionsPerCampaign: campaigns.length > 0 ? (totalSessions / campaigns.length).toFixed(1) : 0
      });
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-4xl font-bold mb-8">Lazy Foundry VTT Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow">
          <p className="text-sm opacity-90">Total Campaigns</p>
          <p className="text-4xl font-bold">{stats?.totalCampaigns}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-lg shadow">
          <p className="text-sm opacity-90">Total Sessions</p>
          <p className="text-4xl font-bold">{stats?.totalSessions}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg shadow">
          <p className="text-sm opacity-90">Avg per Campaign</p>
          <p className="text-4xl font-bold">{stats?.averageSessionsPerCampaign}</p>
        </div>
      </div>

      {/* Recent Campaigns */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Recent Campaigns</h2>
          <button
            onClick={() => navigate('/campaigns/new')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + New Campaign
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recentCampaigns.map(campaign => (
            <div
              key={campaign.id}
              onClick={() => navigate(`/campaigns/${campaign.id}`)}
              className="bg-white border rounded-lg p-6 shadow hover:shadow-lg cursor-pointer transition"
            >
              <h3 className="text-xl font-bold text-blue-600">{campaign.name}</h3>
              <p className="text-gray-600 text-sm mt-2">{campaign.setting}</p>
              <p className="text-gray-500 text-xs mt-1">Theme: {campaign.theme}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-xl font-bold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 bg-white border rounded hover:border-blue-600 text-center">
            <p className="text-2xl mb-2">⚔️</p>
            <p className="text-sm">Generate Encounter</p>
          </button>
          <button className="p-4 bg-white border rounded hover:border-blue-600 text-center">
            <p className="text-2xl mb-2">🗺️</p>
            <p className="text-sm">Generate Map</p>
          </button>
          <button className="p-4 bg-white border rounded hover:border-blue-600 text-center">
            <p className="text-2xl mb-2">👤</p>
            <p className="text-sm">Create NPC</p>
          </button>
          <button className="p-4 bg-white border rounded hover:border-blue-600 text-center">
            <p className="text-2xl mb-2">⚙️</p>
            <p className="text-sm">Foundry Sync</p>
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 2.2 Campaign Detail View Enhancement

**frontend/src/components/campaigns/CampaignDetail.jsx:**
```jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { campaignService } from '../../services/campaignService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs';

export function CampaignDetail() {
  const { campaignId } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadCampaign();
  }, [campaignId]);

  const loadCampaign = async () => {
    try {
      const data = await campaignService.get(campaignId);
      setCampaign(data);
    } catch (error) {
      console.error('Failed to load campaign:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!campaign) return <div>Campaign not found</div>;

  return (
    <div className="max-w-6xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold">{campaign.name}</h1>
        <p className="text-gray-600 mt-2">{campaign.description}</p>
        <div className="flex gap-4 mt-4">
          <button
            onClick={() => navigate(`/campaigns/${campaignId}/sessions/new`)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + New Session
          </button>
          <button
            onClick={() => navigate(`/campaigns/${campaignId}/edit`)}
            className="px-4 py-2 border rounded hover:bg-gray-100"
          >
            Edit Campaign
          </button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sessions">Sessions ({campaign.sessions?.length || 0})</TabsTrigger>
          <TabsTrigger value="npcs">NPCs</TabsTrigger>
          <TabsTrigger value="maps">Maps</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded p-4">
              <h3 className="font-bold">Setting</h3>
              <p className="text-gray-600">{campaign.setting}</p>
            </div>
            <div className="border rounded p-4">
              <h3 className="font-bold">Theme</h3>
              <p className="text-gray-600">{campaign.theme}</p>
            </div>
            <div className="border rounded p-4">
              <h3 className="font-bold">Tone</h3>
              <p className="text-gray-600">{campaign.tone}</p>
            </div>
            <div className="border rounded p-4">
              <h3 className="font-bold">Player Count</h3>
              <p className="text-gray-600">{campaign.player_count}</p>
            </div>
          </div>

          {campaign.world_lore && (
            <div className="mt-6 border rounded p-4">
              <h3 className="font-bold mb-2">Campaign Lore</h3>
              <div className="prose text-sm">
                <p>{campaign.world_lore.overview}</p>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="sessions" className="mt-6">
          {/* Sessions list component */}
          <div className="space-y-4">
            {campaign.sessions?.map(session => (
              <div
                key={session.id}
                className="border rounded p-4 hover:shadow-lg cursor-pointer transition"
                onClick={() => navigate(`/sessions/${session.id}`)}
              >
                <h4 className="font-bold">Session {session.session_number}: {session.title}</h4>
                <p className="text-sm text-gray-600">{session.description}</p>
                <p className="text-xs text-gray-400 mt-2">
                  Status: <span className="capitalize">{session.status}</span>
                </p>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Other tabs... */}
      </Tabs>
    </div>
  );
}
```

---

## 3. Performance Optimization

### 3.1 Backend Optimization

**Update app/main.py for performance:**
```python
# Add caching and compression
from fastapi_cache2 import FastAPICache2
from fastapi_cache2.backends.redis import RedisBackend
from fastapi_compression import FastAPI as FastAPIWithCompression
from redis import asyncio as aioredis

app = FastAPIWithCompression()

@app.on_event("startup")
async def startup():
    redis = aioredis.from_url("redis://localhost")
    FastAPICache2.init(RedisBackend(redis), prefix="fastapi-cache")

# Add response compression
app.add_middleware(GZipMiddleware, minimum_size=1000)
```

### 3.2 Frontend Optimization

**frontend/vite.config.js:**
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    minify: 'terser',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui': ['@reduxjs/toolkit', 'react-redux'],
        }
      }
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      }
    }
  }
})
```

### 3.3 Database Query Optimization

```python
# Add indexes
# In migration or directly

from sqlalchemy import Index

# Strategic indexes
Index('idx_campaigns_user_created', Campaign.user_id, Campaign.created_at)
Index('idx_sessions_campaign_number', Session.campaign_id, Session.session_number)
Index('idx_npcs_campaign_name', NPC.campaign_id, NPC.name)
Index('idx_maps_campaign_type', Map.campaign_id, Map.map_type)
```

---

## 4. Comprehensive Testing

### 4.1 Integration Tests

**tests/test_integration_campaign_workflow.py:**
```python
import pytest
from httpx import AsyncClient
from app.main import app
from sqlalchemy.ext.asyncio import AsyncSession

@pytest.mark.asyncio
async def test_complete_campaign_workflow(client: AsyncClient, db: AsyncSession):
    """Test complete workflow: create campaign -> generate content -> sync to foundry"""

    # 1. Register and login
    register_response = await client.post(
        "/api/auth/register",
        json={
            "username": "testdm",
            "email": "dm@test.com",
            "password": "password123"
        }
    )
    assert register_response.status_code == 200

    login_response = await client.post(
        "/api/auth/login",
        json={"username": "testdm", "password": "password123"}
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]

    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create campaign
    campaign_response = await client.post(
        "/api/campaigns",
        json={
            "name": "Test Campaign",
            "setting": "Fantasy",
            "theme": "Adventure",
            "tone": "Heroic",
            "player_count": 4
        },
        headers=headers
    )
    assert campaign_response.status_code == 200
    campaign_id = campaign_response.json()["id"]

    # 3. Generate lore
    lore_response = await client.post(
        "/api/generate/lore",
        json={"campaign_id": campaign_id},
        headers=headers
    )
    assert lore_response.status_code == 200

    # 4. Generate NPCs
    npc_response = await client.post(
        "/api/generate/npcs",
        json={
            "campaign_id": campaign_id,
            "role": "tavern keeper",
            "archetype": "quest giver",
            "count": 2
        },
        headers=headers
    )
    assert npc_response.status_code == 200

    # 5. Create session
    session_response = await client.post(
        "/api/sessions",
        json={
            "campaign_id": campaign_id,
            "title": "First Session",
            "description": "The adventure begins"
        },
        headers=headers
    )
    assert session_response.status_code == 200
    session_id = session_response.json()["id"]

    # 6. Generate scenario
    scenario_response = await client.post(
        "/api/generate/scenario",
        json={
            "campaign_id": campaign_id,
            "party_level": 1,
            "party_composition": "Fighter, Wizard, Rogue, Cleric"
        },
        headers=headers
    )
    assert scenario_response.status_code == 200

    # 7. Capture session results
    results_response = await client.post(
        f"/api/sessions/{session_id}/results",
        json={
            "summary": "The party met in the tavern and received their first quest",
            "mood": "dramatic",
            "events": ["Met quest giver", "Received map"],
            "unfinished_threads": ["Find the lost artifact"]
        },
        headers=headers
    )
    assert results_response.status_code == 200

    # 8. Generate next session with continuity
    next_scenario_response = await client.post(
        "/api/generate/scenario",
        json={
            "campaign_id": campaign_id,
            "party_level": 1,
            "party_composition": "Fighter, Wizard, Rogue, Cleric",
            "notes": "Continue the artifact hunt"
        },
        headers=headers
    )
    assert next_scenario_response.status_code == 200
```

### 4.2 Performance Tests

**tests/test_performance.py:**
```python
import pytest
import time
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_campaign_creation_performance(client: AsyncClient):
    """Campaign creation should be < 500ms"""
    headers = {"Authorization": "Bearer " + "valid_token"}

    start = time.time()
    response = await client.post(
        "/api/campaigns",
        json={
            "name": "Perf Test Campaign",
            "setting": "Fantasy",
            "theme": "Adventure",
            "tone": "Heroic",
            "player_count": 4
        },
        headers=headers
    )
    elapsed = time.time() - start

    assert response.status_code == 200
    assert elapsed < 0.5, f"Campaign creation took {elapsed}s, should be < 0.5s"

@pytest.mark.asyncio
async def test_scenario_generation_performance(client: AsyncClient, campaign_id: str):
    """Scenario generation should be < 30s"""
    headers = {"Authorization": "Bearer " + "valid_token"}

    start = time.time()
    response = await client.post(
        "/api/generate/scenario",
        json={
            "campaign_id": campaign_id,
            "party_level": 5,
            "party_composition": "Mixed party"
        },
        headers=headers
    )
    elapsed = time.time() - start

    assert response.status_code == 200
    assert elapsed < 30, f"Scenario generation took {elapsed}s, should be < 30s"
```

---

## 5. API Documentation

### 5.1 OpenAPI/Swagger Integration

**Update app/main.py:**
```python
app = FastAPI(
    title="Lazy Foundry VTT API",
    description="AI-powered Foundry VTT campaign generator API",
    version="0.1.0",
    openapi_url="/api/openapi.json",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)
```

Auto-generated at: `/api/docs` and `/api/redoc`

---

## 6. User Documentation

### 6.1 README

**Create README.md:**
```markdown
# Lazy Foundry VTT

AI-powered Dungeons & Dragons 5e campaign generation and management system integrated with Foundry VTT.

## Features

- **AI Campaign Generation**: Generate complete campaigns with lore, settings, and hooks
- **Dynamic Content**: Create maps, NPCs, scenarios, and encounters with AI
- **Session Management**: Capture session results and build on them in future sessions
- **Foundry Integration**: Sync generated content directly to Foundry VTT
- **Web Interface**: Easy-to-use DM dashboard

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Claude API key (get from https://console.anthropic.com)

### Installation

1. Clone repository
2. Copy `.env.example` to `.env` and fill in API keys
3. Run: `docker-compose up`
4. Access dashboard at http://localhost:5173

### First Time Setup

1. Create account at http://localhost:5173/register
2. Create a campaign
3. Generate lore
4. Create a session
5. Generate content
6. Sync to Foundry

## Documentation

- [User Guide](./docs/USER_GUIDE.md)
- [API Reference](./docs/API_REFERENCE.md)
- [Development Guide](./docs/DEVELOPMENT.md)
- [Phase 1-6 Implementation Plans](./docs/PHASE_*.md)

## Architecture

See [PLANNING.md](./PLANNING.md) for high-level architecture and system design.
```

### 6.2 User Guide

**Create docs/USER_GUIDE.md:**
```markdown
# Lazy Foundry VTT - User Guide

## Getting Started

### Creating Your First Campaign

1. Click "New Campaign"
2. Fill in campaign details:
   - Name: Your campaign name
   - Setting: Where does this take place?
   - Theme: What's the tone? (dark, heroic, comedic, etc.)
   - Player Count: How many players?
3. Click "Generate Campaign"
4. AI generates world lore and background

### Running a Session

1. Open your campaign
2. Click "New Session"
3. Click "Generate" to create scenario
4. Create maps and NPCs
5. Run session in Foundry VTT
6. After session, click "Save Results"
7. AI summarizes and captures what happened

### Continuing Your Campaign

1. Create a new session
2. Click "Generate with Continuity"
3. AI aware of previous events, NPC status, world changes
4. Scenario builds naturally on what came before

## Tips & Best Practices

- Be specific when describing locations/NPCs
- Review AI-generated content and tweak as needed
- Regularly save session results for better continuity
- Use Foundry sync to keep everything in sync
```

---

## 7. Logging & Monitoring

### 7.1 Structured Logging

**app/utils/logging.py:**
```python
import logging
from pythonjsonlogger import jsonlogger
import sys

def setup_logging():
    logHandler = logging.StreamHandler(sys.stdout)
    formatter = jsonlogger.JsonFormatter()
    logHandler.setFormatter(formatter)

    logger = logging.getLogger()
    logger.addHandler(logHandler)
    logger.setLevel(logging.INFO)

    return logger

logger = setup_logging()

def log_generation(
    user_id: str,
    content_type: str,
    generation_time: float,
    tokens_used: int,
    success: bool,
    error: str = None
):
    """Log AI generation metrics"""
    logger.info(
        "Content generation",
        extra={
            "user_id": user_id,
            "content_type": content_type,
            "generation_time": generation_time,
            "tokens_used": tokens_used,
            "success": success,
            "error": error
        }
    )
```

---

## 8. Optional Advanced Features

### 8.1 Real-time Collaboration

**Feature**: WebSocket support for multi-DM sessions

```python
# app/routers/websocket.py
from fastapi import WebSocket
from typing import Set

class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

@app.websocket("/ws/campaign/{campaign_id}")
async def websocket_endpoint(websocket: WebSocket, campaign_id: str):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await manager.broadcast(f"Campaign {campaign_id}: {data}")
    except Exception:
        manager.disconnect(websocket)
```

### 8.2 Content Marketplace

**Feature**: Share and discover user-generated campaigns

```python
# Add tables for sharing
class SharedCampaign(BaseModel):
    id: UUID
    campaign_id: UUID
    user_id: UUID
    title: str
    description: str
    downloads: int
    rating: float
    public: bool
```

### 8.3 Mobile Companion App

**Feature**: React Native app for session logging during play

```javascript
// Mobile app for during-session logging
// Upload logs to backend when wifi available
```

---

## 9. Deployment

### 9.1 Production Docker Compose

**docker-compose.prod.yml:**
```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always

  api:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}
      JWT_SECRET: ${JWT_SECRET}
      CLAUDE_API_KEY: ${CLAUDE_API_KEY}
      FOUNDRY_ADMIN_TOKEN: ${FOUNDRY_ADMIN_TOKEN}
    depends_on:
      - db
    restart: always

  web:
    build: ./frontend
    restart: always

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - api
      - web
    restart: always

  foundry:
    image: felddy/foundryvtt:latest
    environment:
      FOUNDRY_ADMIN_KEY: ${FOUNDRY_ADMIN_TOKEN}
    volumes:
      - foundry_data:/data
    restart: always

volumes:
  postgres_data:
  foundry_data:
  assets:
```

### 9.2 Deployment Checklist

- [ ] SSL certificates configured
- [ ] Database backups automated
- [ ] Environment variables set for production
- [ ] Rate limiting enabled
- [ ] CORS configured for production domain
- [ ] Monitoring/alerting setup
- [ ] Logging aggregation (ELK stack, etc.)
- [ ] Health checks configured
- [ ] Security headers added

---

## 10. Implementation Checklist

### UI/UX
- [ ] Dashboard redesign
- [ ] Campaign detail page
- [ ] Session management UI
- [ ] Better error messages
- [ ] Loading states and spinners
- [ ] Dark mode (optional)
- [ ] Mobile responsive design
- [ ] Accessibility improvements

### Performance
- [ ] Database query optimization
- [ ] API response caching
- [ ] Frontend code splitting
- [ ] Image optimization
- [ ] Database indexes
- [ ] Connection pooling

### Testing
- [ ] Integration tests
- [ ] Performance tests
- [ ] E2E tests (Cypress/Playwright)
- [ ] Load testing
- [ ] Security testing

### Documentation
- [ ] README
- [ ] User guide
- [ ] API documentation
- [ ] Architecture documentation
- [ ] Deployment guide
- [ ] Development setup guide

### Monitoring
- [ ] Structured logging
- [ ] Metrics collection
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring
- [ ] Uptime monitoring

---

## 11. Success Criteria

- Application fully functional end-to-end
- All major workflows tested
- Performance acceptable (API <200ms, generation <30s)
- Documentation complete and accurate
- Code is clean and maintainable
- Error handling comprehensive
- UI/UX professional and intuitive
- Optional features working (if implemented)

---

## 12. Post-Launch

### Ongoing Maintenance
- Monitor error logs
- Gather user feedback
- Optimize based on usage patterns
- Regular security updates
- Database maintenance and optimization

### Future Enhancements
- Mobile app
- Content marketplace
- Advanced analytics
- Module support
- Voice integration
- Community features

---

## 13. Project Complete!

Upon successful completion of Phase 6, you have:

✅ Fully functional AI-powered campaign generator
✅ Foundry VTT integration
✅ Session tracking and continuity
✅ Professional web interface
✅ Complete documentation
✅ Production-ready deployment

### Next Steps for Users
- Deploy to production
- Gather feedback from DMs
- Iterate based on usage
- Plan Phase 2 features
