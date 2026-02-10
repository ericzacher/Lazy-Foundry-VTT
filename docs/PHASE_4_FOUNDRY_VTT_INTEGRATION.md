# Phase 4: Foundry VTT Integration - Syncing Generated Content

**Duration:** 2-3 weeks
**Goal:** Integrate with Foundry VTT API to sync maps, tokens, NPCs, and scenarios

**Dependencies:** Phase 1-3 complete (API running, content generation working)

---

## 1. Overview

Phase 4 focuses on:
- Foundry VTT Docker setup
- Foundry API authentication
- Scene creation and management
- Actor (NPC/creature) import
- Token placement
- Item and journal management
- Content synchronization workflow

---

## 2. Foundry VTT Docker Setup

### 2.1 Docker Compose Configuration

**Update docker-compose.yml:**
```yaml
version: '3.8'

services:
  db:
    # ... existing db service ...

  api:
    # ... existing api service ...

  web:
    # ... existing web service ...

  foundry:
    image: felddy/foundryvtt:latest
    environment:
      FOUNDRY_USERNAME: ${FOUNDRY_USERNAME:-dm}
      FOUNDRY_PASSWORD: ${FOUNDRY_PASSWORD:-password}
      FOUNDRY_ADMIN_KEY: ${FOUNDRY_ADMIN_TOKEN:-change-me}
      TIMEZONE: UTC
    ports:
      - "30000:30000"
    volumes:
      - foundry_data:/data
    depends_on:
      - api
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:30000/setup"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgres_data:
  assets:
  foundry_data:
```

### 2.2 Foundry Configuration

**.env:**
```
# Foundry VTT
FOUNDRY_USERNAME=dm
FOUNDRY_PASSWORD=your-secure-password
FOUNDRY_ADMIN_TOKEN=your-admin-token-change-this
FOUNDRY_URL=http://foundry:30000
FOUNDRY_API_ENDPOINT=http://localhost:30000/api
```

---

## 3. Foundry API Client

### 3.1 Foundry Service

**app/services/foundry_service.py:**
```python
import httpx
from typing import Optional, Dict, List
from uuid import UUID
from app.config import settings
import json

class FoundryService:
    """Service for interacting with Foundry VTT API."""

    def __init__(self):
        self.base_url = settings.FOUNDRY_URL or "http://foundry:30000"
        self.admin_token = settings.FOUNDRY_ADMIN_TOKEN
        self.api_url = f"{self.base_url}/api"

    def _get_headers(self) -> Dict[str, str]:
        """Get headers for Foundry API requests."""
        return {
            "Authorization": f"Bearer {self.admin_token}",
            "Content-Type": "application/json"
        }

    async def health_check(self) -> bool:
        """Check if Foundry is running."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/setup",
                    timeout=10.0
                )
                return response.status_code in [200, 302]
        except Exception as e:
            print(f"Foundry health check failed: {e}")
            return False

    async def get_world(self, world_id: str) -> Optional[Dict]:
        """Get world information."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_url}/worlds/{world_id}",
                    headers=self._get_headers(),
                    timeout=10.0
                )
                if response.status_code == 200:
                    return response.json()
        except Exception as e:
            print(f"Error getting world: {e}")

        return None

    async def create_scene(
        self,
        world_id: str,
        scene_name: str,
        scene_data: Dict
    ) -> Optional[str]:
        """
        Create a scene (map) in Foundry.

        Args:
            world_id: The world ID
            scene_name: Name of the scene
            scene_data: Scene data including walls, lighting, etc.

        Returns:
            Scene ID if successful
        """
        try:
            async with httpx.AsyncClient() as client:
                payload = {
                    "name": scene_name,
                    "width": scene_data.get("width", 1400),
                    "height": scene_data.get("height", 1400),
                    "grid": {
                        "type": 1,
                        "size": 70,
                        "distance": 5,
                        "units": "ft"
                    },
                    "walls": scene_data.get("walls", []),
                    "lights": scene_data.get("lights", []),
                }

                response = await client.post(
                    f"{self.api_url}/scenes",
                    json=payload,
                    headers=self._get_headers(),
                    timeout=30.0
                )

                if response.status_code in [200, 201]:
                    result = response.json()
                    return result.get("id") or result.get("_id")

        except Exception as e:
            print(f"Error creating scene: {e}")

        return None

    async def update_scene(
        self,
        scene_id: str,
        scene_data: Dict
    ) -> bool:
        """Update scene data."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    f"{self.api_url}/scenes/{scene_id}",
                    json=scene_data,
                    headers=self._get_headers(),
                    timeout=30.0
                )
                return response.status_code in [200, 204]

        except Exception as e:
            print(f"Error updating scene: {e}")

        return False

    async def create_actor(
        self,
        world_id: str,
        actor_name: str,
        actor_type: str = "character",
        actor_data: Dict = None
    ) -> Optional[str]:
        """
        Create an actor (NPC/creature) in Foundry.

        Args:
            world_id: The world ID
            actor_name: Name of the actor
            actor_type: Type (character, npc, creature)
            actor_data: Additional actor data (stats, abilities, etc.)

        Returns:
            Actor ID if successful
        """
        try:
            async with httpx.AsyncClient() as client:
                payload = {
                    "name": actor_name,
                    "type": actor_type,
                    "data": actor_data or {
                        "abilities": {
                            "str": {"value": 10},
                            "dex": {"value": 10},
                            "con": {"value": 10},
                            "int": {"value": 10},
                            "wis": {"value": 10},
                            "cha": {"value": 10}
                        },
                        "attributes": {
                            "hp": {"value": 10, "max": 10},
                            "ac": {"value": 10}
                        }
                    }
                }

                response = await client.post(
                    f"{self.api_url}/actors",
                    json=payload,
                    headers=self._get_headers(),
                    timeout=30.0
                )

                if response.status_code in [200, 201]:
                    result = response.json()
                    return result.get("id") or result.get("_id")

        except Exception as e:
            print(f"Error creating actor: {e}")

        return None

    async def create_token(
        self,
        scene_id: str,
        actor_id: str,
        token_data: Dict
    ) -> Optional[str]:
        """
        Place a token on a scene.

        Args:
            scene_id: The scene ID
            actor_id: The actor (NPC) ID
            token_data: Token position and appearance data

        Returns:
            Token ID if successful
        """
        try:
            async with httpx.AsyncClient() as client:
                payload = {
                    "actorId": actor_id,
                    "actorLink": False,
                    "img": token_data.get("img", ""),
                    "x": token_data.get("x", 0),
                    "y": token_data.get("y", 0),
                    "width": token_data.get("width", 1),
                    "height": token_data.get("height", 1),
                    "scale": token_data.get("scale", 1.0),
                    "name": token_data.get("name", ""),
                }

                # The token is created as part of scene data, not separate
                # This updates the scene with token
                response = await client.post(
                    f"{self.api_url}/scenes/{scene_id}/tokens",
                    json=payload,
                    headers=self._get_headers(),
                    timeout=30.0
                )

                if response.status_code in [200, 201]:
                    result = response.json()
                    return result.get("id") or result.get("_id")

        except Exception as e:
            print(f"Error creating token: {e}")

        return None

    async def create_journal_entry(
        self,
        title: str,
        content: str,
        world_id: str = None
    ) -> Optional[str]:
        """Create a journal entry (for lore, handouts, etc.)."""
        try:
            async with httpx.AsyncClient() as client:
                payload = {
                    "title": title,
                    "content": content,
                    "folder": None,
                    "permission": {"default": 0}
                }

                response = await client.post(
                    f"{self.api_url}/journal",
                    json=payload,
                    headers=self._get_headers(),
                    timeout=30.0
                )

                if response.status_code in [200, 201]:
                    result = response.json()
                    return result.get("id") or result.get("_id")

        except Exception as e:
            print(f"Error creating journal: {e}")

        return None

    async def get_scenes(self, world_id: str = None) -> List[Dict]:
        """Get all scenes in the world."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_url}/scenes",
                    headers=self._get_headers(),
                    timeout=10.0
                )

                if response.status_code == 200:
                    return response.json()

        except Exception as e:
            print(f"Error getting scenes: {e}")

        return []

    async def get_actors(self) -> List[Dict]:
        """Get all actors."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_url}/actors",
                    headers=self._get_headers(),
                    timeout=10.0
                )

                if response.status_code == 200:
                    return response.json()

        except Exception as e:
            print(f"Error getting actors: {e}")

        return []

# Singleton instance
foundry_service = FoundryService()
```

---

## 4. Foundry Sync Service

**app/services/foundry_sync_service.py:**
```python
from app.services.foundry_service import foundry_service
from app.models.campaign import Campaign
from app.models.npc import NPC
from app.models.map import Map
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID
from datetime import datetime
import json

class FoundrySyncService:
    """Service for syncing generated content to Foundry."""

    async def sync_campaign_to_foundry(
        self,
        campaign_id: UUID,
        world_id: str,
        db: AsyncSession = None
    ) -> Dict[str, any]:
        """
        Sync entire campaign to Foundry.
        Creates scenes, actors, tokens, journal entries.
        """
        from sqlalchemy.orm import selectinload

        # Fetch campaign with all related data
        result = await db.execute(
            select(Campaign)
            .where(Campaign.id == campaign_id)
            .options(
                selectinload(Campaign.sessions),
                selectinload(Campaign.npcs),
                selectinload(Campaign.maps)
            )
        )
        campaign = result.unique().scalars().first()

        if not campaign:
            raise ValueError("Campaign not found")

        sync_results = {
            "campaign_name": campaign.name,
            "world_id": world_id,
            "scenes": [],
            "actors": [],
            "journals": []
        }

        # Create campaign journal entry
        campaign_journal = await self._create_campaign_journal(campaign)
        if campaign_journal:
            sync_results["journals"].append({
                "type": "campaign",
                "id": campaign_journal,
                "name": campaign.name
            })

        # Sync NPCs as actors
        for npc in campaign.npcs:
            actor_result = await self._sync_npc_to_actor(npc)
            if actor_result:
                sync_results["actors"].append(actor_result)

        # Sync maps as scenes
        for map_obj in campaign.maps:
            scene_result = await self._sync_map_to_scene(map_obj, world_id)
            if scene_result:
                sync_results["scenes"].append(scene_result)

        return sync_results

    async def sync_map_to_foundry(
        self,
        map_id: UUID,
        world_id: str,
        db: AsyncSession = None
    ) -> Optional[Dict]:
        """Sync a single map to Foundry as a scene."""
        result = await db.execute(
            select(Map).where(Map.id == map_id)
        )
        map_obj = result.scalars().first()

        if not map_obj:
            raise ValueError("Map not found")

        return await self._sync_map_to_scene(map_obj, world_id)

    async def _sync_map_to_scene(
        self,
        map_obj: Map,
        world_id: str
    ) -> Optional[Dict]:
        """Internal method to sync map to Foundry scene."""
        try:
            # Get scene data (already in Foundry format from Phase 3)
            scene_data = map_obj.scene_data or {}

            # Create scene in Foundry
            scene_id = await foundry_service.create_scene(
                world_id,
                map_obj.name,
                scene_data
            )

            if scene_id:
                # Store Foundry scene ID in database
                map_obj.foundry_scene_id = scene_id
                map_obj.updated_at = datetime.utcnow()

                return {
                    "id": str(map_obj.id),
                    "foundry_id": scene_id,
                    "name": map_obj.name,
                    "type": map_obj.map_type,
                    "synced_at": datetime.utcnow().isoformat()
                }

        except Exception as e:
            print(f"Error syncing map to Foundry: {e}")

        return None

    async def _sync_npc_to_actor(self, npc: NPC) -> Optional[Dict]:
        """Internal method to sync NPC to Foundry actor."""
        try:
            # Create actor from NPC data
            actor_id = await foundry_service.create_actor(
                world_id="",  # Will be set in full sync
                actor_name=npc.name,
                actor_type="npc",
                actor_data={
                    "abilities": npc.stats or self._default_stats(),
                    "details": {
                        "biography": npc.background,
                        "alignment": "NN"
                    }
                }
            )

            if actor_id:
                npc.foundry_actor_id = actor_id
                return {
                    "id": str(npc.id),
                    "foundry_id": actor_id,
                    "name": npc.name,
                    "type": "npc",
                    "synced_at": datetime.utcnow().isoformat()
                }

        except Exception as e:
            print(f"Error syncing NPC to Foundry: {e}")

        return None

    async def _create_campaign_journal(self, campaign: Campaign) -> Optional[str]:
        """Create a campaign journal entry with lore."""
        try:
            lore = campaign.world_lore or {}

            content = f"""
<h1>{campaign.name}</h1>
<h2>Setting</h2>
<p>{campaign.setting}</p>
<h2>Theme</h2>
<p>{campaign.theme}</p>
<h2>World Overview</h2>
<p>{lore.get('overview', 'No overview yet')}</p>
<h2>Major Factions</h2>
<ul>
{"".join(f"<li>{faction}</li>" for faction in lore.get('major_factions', []))}
</ul>
"""

            journal_id = await foundry_service.create_journal_entry(
                title=campaign.name,
                content=content
            )

            return journal_id

        except Exception as e:
            print(f"Error creating campaign journal: {e}")

        return None

    def _default_stats(self) -> Dict:
        """Get default D&D 5e ability scores."""
        return {
            "str": {"value": 10},
            "dex": {"value": 10},
            "con": {"value": 10},
            "int": {"value": 10},
            "wis": {"value": 10},
            "cha": {"value": 10}
        }

    async def sync_token_placement(
        self,
        scene_id: UUID,
        tokens: List[Dict],
        db: AsyncSession = None
    ) -> Dict:
        """Place tokens on a scene."""
        results = {
            "scene_id": str(scene_id),
            "tokens_placed": 0,
            "errors": []
        }

        # Get Foundry scene ID
        result = await db.execute(
            select(Map).where(Map.id == scene_id)
        )
        map_obj = result.scalars().first()

        if not map_obj or not map_obj.foundry_scene_id:
            results["errors"].append("Scene not synced to Foundry")
            return results

        foundry_scene_id = map_obj.foundry_scene_id

        # Place each token
        for token_data in tokens:
            try:
                token_id = await foundry_service.create_token(
                    foundry_scene_id,
                    token_data.get("actor_id"),
                    token_data
                )

                if token_id:
                    results["tokens_placed"] += 1

            except Exception as e:
                results["errors"].append(f"Failed to place token: {str(e)}")

        return results

foundry_sync_service = FoundrySyncService()
```

---

## 5. Database Updates

**app/models/map.py - Add foundry_scene_id:**
```python
# In the Map model, add:
foundry_scene_id = Column(String(255), nullable=True, index=True)
foundry_synced_at = Column(DateTime, nullable=True)
```

**app/models/npc.py - Add foundry_actor_id:**
```python
# In the NPC model, add:
foundry_actor_id = Column(String(255), nullable=True, index=True)
foundry_synced_at = Column(DateTime, nullable=True)
```

---

## 6. API Endpoints for Foundry Sync

**app/routers/foundry.py:**
```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID
from pydantic import BaseModel

from app.db.database import get_db
from app.dependencies import get_current_user
from app.models.campaign import Campaign
from app.models.user import User
from app.services.foundry_service import foundry_service
from app.services.foundry_sync_service import foundry_sync_service

router = APIRouter()

class SyncCampaignRequest(BaseModel):
    campaign_id: UUID
    world_id: str

class SyncMapRequest(BaseModel):
    map_id: UUID
    world_id: str

class PlaceTokensRequest(BaseModel):
    scene_id: UUID
    tokens: list[dict]

@router.get("/foundry/status")
async def foundry_status():
    """Check Foundry connection status."""
    is_healthy = await foundry_service.health_check()
    return {
        "connected": is_healthy,
        "foundry_url": foundry_service.base_url
    }

@router.get("/foundry/worlds")
async def get_foundry_worlds():
    """Get available Foundry worlds."""
    # Note: This requires proper Foundry authentication
    # Simplified version - would need full API integration
    return {
        "worlds": []
    }

@router.post("/foundry/sync/campaign")
async def sync_campaign(
    request: SyncCampaignRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Sync entire campaign to Foundry."""
    # Verify ownership
    result = await db.execute(
        select(Campaign).where(
            (Campaign.id == request.campaign_id) &
            (Campaign.user_id == current_user.id)
        )
    )
    if not result.scalars().first():
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Check Foundry is running
    is_healthy = await foundry_service.health_check()
    if not is_healthy:
        raise HTTPException(status_code=503, detail="Foundry VTT not accessible")

    # Sync campaign
    sync_results = await foundry_sync_service.sync_campaign_to_foundry(
        request.campaign_id,
        request.world_id,
        db
    )

    await db.commit()
    return {
        "success": True,
        "sync_results": sync_results
    }

@router.post("/foundry/sync/map")
async def sync_map(
    request: SyncMapRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Sync a map to Foundry."""
    # Verify ownership via campaign
    from app.models.map import Map
    result = await db.execute(
        select(Map).join(Campaign).where(
            (Map.id == request.map_id) &
            (Campaign.user_id == current_user.id)
        )
    )
    if not result.scalars().first():
        raise HTTPException(status_code=404, detail="Map not found")

    is_healthy = await foundry_service.health_check()
    if not is_healthy:
        raise HTTPException(status_code=503, detail="Foundry VTT not accessible")

    sync_result = await foundry_sync_service.sync_map_to_foundry(
        request.map_id,
        request.world_id,
        db
    )

    await db.commit()
    return {
        "success": True,
        "sync_result": sync_result
    }

@router.post("/foundry/sync/tokens")
async def place_tokens(
    request: PlaceTokensRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Place tokens on a scene."""
    is_healthy = await foundry_service.health_check()
    if not is_healthy:
        raise HTTPException(status_code=503, detail="Foundry VTT not accessible")

    result = await foundry_sync_service.sync_token_placement(
        request.scene_id,
        request.tokens,
        db
    )

    await db.commit()
    return {
        "success": True,
        "result": result
    }
```

---

## 7. Configuration

**Update app/config.py:**
```python
class Settings(BaseSettings):
    # ... existing settings ...

    # Foundry VTT
    FOUNDRY_URL: str = "http://foundry:30000"
    FOUNDRY_ADMIN_TOKEN: str
    FOUNDRY_USERNAME: str = "dm"
    FOUNDRY_PASSWORD: str = "password"

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
```

---

## 8. Frontend Components

**frontend/src/services/foundryService.js:**
```javascript
import api from './api';

export const foundryService = {
  checkStatus: async () => {
    const response = await api.get('/foundry/status');
    return response.data;
  },

  getWorlds: async () => {
    const response = await api.get('/foundry/worlds');
    return response.data;
  },

  syncCampaign: async (campaignId, worldId) => {
    const response = await api.post('/foundry/sync/campaign', {
      campaign_id: campaignId,
      world_id: worldId,
    });
    return response.data;
  },

  syncMap: async (mapId, worldId) => {
    const response = await api.post('/foundry/sync/map', {
      map_id: mapId,
      world_id: worldId,
    });
    return response.data;
  },

  placeTokens: async (sceneId, tokens) => {
    const response = await api.post('/foundry/sync/tokens', {
      scene_id: sceneId,
      tokens,
    });
    return response.data;
  },
};
```

**frontend/src/components/foundry/FoundrySync.jsx:**
```jsx
import { useState, useEffect } from 'react';
import { foundryService } from '../../services/foundryService';

export function FoundrySync({ campaignId }) {
  const [foundryStatus, setFoundryStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState(null);

  useEffect(() => {
    checkFoundryStatus();
  }, []);

  const checkFoundryStatus = async () => {
    try {
      const status = await foundryService.checkStatus();
      setFoundryStatus(status);
    } catch (error) {
      console.error('Failed to check Foundry status:', error);
      setFoundryStatus({ connected: false });
    }
  };

  const handleSyncCampaign = async () => {
    setSyncing(true);
    try {
      const result = await foundryService.syncCampaign(campaignId, 'world1');
      setSyncResults(result.sync_results);
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncResults({ error: error.message });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-bold">Foundry VTT Status</h3>
        {foundryStatus && (
          <div className={`p-4 rounded ${foundryStatus.connected ? 'bg-green-100' : 'bg-red-100'}`}>
            {foundryStatus.connected ? (
              <>
                <p className="text-green-800">✓ Connected to Foundry VTT</p>
                <p className="text-sm">{foundryStatus.foundry_url}</p>
              </>
            ) : (
              <p className="text-red-800">✗ Foundry VTT not connected</p>
            )}
          </div>
        )}
      </div>

      {foundryStatus?.connected && (
        <button
          onClick={handleSyncCampaign}
          disabled={syncing}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {syncing ? 'Syncing...' : 'Sync Campaign to Foundry'}
        </button>
      )}

      {syncResults && (
        <div className="border rounded p-4 bg-gray-50">
          <h4 className="font-bold">Sync Results</h4>
          {syncResults.error && (
            <p className="text-red-600">{syncResults.error}</p>
          )}
          {syncResults.scenes && (
            <div>
              <p>Scenes: {syncResults.scenes.length}</p>
              {syncResults.scenes.map(scene => (
                <p key={scene.id} className="text-sm text-gray-700">
                  - {scene.name} (ID: {scene.foundry_id})
                </p>
              ))}
            </div>
          )}
          {syncResults.actors && (
            <div>
              <p>Actors: {syncResults.actors.length}</p>
              {syncResults.actors.map(actor => (
                <p key={actor.id} className="text-sm text-gray-700">
                  - {actor.name} (ID: {actor.foundry_id})
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## 9. Database Migrations

**alembic/versions/003_add_foundry_sync.py:**
```python
"""Add Foundry sync fields

Revision ID: 003
Create Date: 2024-01-03 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('maps', sa.Column('foundry_scene_id', sa.String(255)))
    op.add_column('maps', sa.Column('foundry_synced_at', sa.DateTime))
    op.create_index('ix_maps_foundry_scene_id', 'maps', ['foundry_scene_id'])

    op.add_column('npcs', sa.Column('foundry_actor_id', sa.String(255)))
    op.add_column('npcs', sa.Column('foundry_synced_at', sa.DateTime))
    op.create_index('ix_npcs_foundry_actor_id', 'npcs', ['foundry_actor_id'])

def downgrade():
    op.drop_index('ix_npcs_foundry_actor_id')
    op.drop_index('ix_maps_foundry_scene_id')
    op.drop_column('npcs', 'foundry_synced_at')
    op.drop_column('npcs', 'foundry_actor_id')
    op.drop_column('maps', 'foundry_synced_at')
    op.drop_column('maps', 'foundry_scene_id')
```

---

## 10. Testing Strategy

**tests/test_foundry_service.py:**
```python
import pytest
from app.services.foundry_service import foundry_service

@pytest.mark.asyncio
async def test_foundry_health_check():
    """Test Foundry health check."""
    # This will fail if Foundry isn't running, which is expected in test env
    health = await foundry_service.health_check()
    # Don't assert, just verify it returns a bool
    assert isinstance(health, bool)

@pytest.mark.asyncio
async def test_create_scene():
    """Test scene creation (requires running Foundry)."""
    # Skip if Foundry not available
    if not await foundry_service.health_check():
        pytest.skip("Foundry VTT not running")

    scene_data = {
        "width": 1400,
        "height": 1400,
        "walls": [],
        "lights": []
    }

    scene_id = await foundry_service.create_scene(
        "world1",
        "Test Scene",
        scene_data
    )

    assert scene_id is not None
```

---

## 11. Implementation Checklist

### Backend
- [ ] Foundry Docker image in compose
- [ ] FoundryService API client
- [ ] FoundrySyncService sync logic
- [ ] Foundry API endpoints
- [ ] Database schema updates for Foundry IDs
- [ ] Configuration for Foundry connection
- [ ] Error handling and retry logic
- [ ] Tests for Foundry integration

### Frontend
- [ ] Foundry status checker
- [ ] Campaign sync button
- [ ] Map sync button
- [ ] Token placement UI
- [ ] Sync results display
- [ ] Error messages and feedback

### Infrastructure
- [ ] Foundry service in docker-compose
- [ ] Volume mounts for Foundry data
- [ ] Environment variables for auth
- [ ] Healthcheck configuration

---

## 12. Success Criteria

- Foundry container starts and is accessible
- Campaign content syncs to Foundry
- Maps appear as scenes in Foundry
- NPCs appear as actors in Foundry
- Tokens placeable on scenes
- Journal entries created for lore
- Sync status displayed in frontend
- Error handling for connection issues
- All tests passing

---

## 13. Next Phase

Upon completion of Phase 4, proceed to **Phase 5: Session Results & Continuity** for implementing session tracking and campaign continuation features.
