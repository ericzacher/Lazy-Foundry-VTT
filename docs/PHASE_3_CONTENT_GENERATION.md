# Phase 3: Content Generation - Maps, Tokens & Assets

**Duration:** 3-4 weeks
**Goal:** Implement Foundry-compatible map and token generation with image processing

**Dependencies:** Phase 1 & 2 complete (API running, AI integration working)

---

## 1. Overview

Phase 3 focuses on:
- Map generation (AI description → Foundry scene format)
- Token generation (appearance description → token images)
- Asset management using Docker volumes
- Image processing and optimization
- Random generation templates
- Asset versioning and storage

---

## 2. Asset Storage Strategy

### 2.1 Docker Volume Configuration

**Update docker-compose.yml:**
```yaml
services:
  # ... existing services ...

volumes:
  postgres_data:
  assets:              # New volume for generated assets
    driver: local
    driver_opts:
      type: tmpfs
      device: tmpfs
      # For persistence, use:
      # type: none
      # o: bind
      # device: /path/on/host
```

### 2.2 Asset Directory Structure

```
/assets/
├── maps/
│   ├── {campaign_id}/
│   │   ├── {map_id}/
│   │   │   ├── map.json           # Foundry scene format
│   │   │   ├── map.png            # Visual representation
│   │   │   └── metadata.json      # Map metadata
│   │   └── ...
│   └── ...
├── tokens/
│   ├── {campaign_id}/
│   │   ├── {token_id}.png
│   │   ├── {token_id}.json        # Token metadata
│   │   └── ...
│   └── ...
├── backgrounds/
│   ├── {campaign_id}/
│   │   └── ...
│   └── ...
└── temp/                          # Temporary processing files
    └── ...
```

### 2.3 Asset Service

**app/services/asset_service.py:**
```python
import os
import json
from pathlib import Path
from uuid import UUID
from datetime import datetime
from typing import Optional
from PIL import Image
from app.config import settings

ASSETS_BASE_DIR = Path("/assets")
MAPS_DIR = ASSETS_BASE_DIR / "maps"
TOKENS_DIR = ASSETS_BASE_DIR / "tokens"
BACKGROUNDS_DIR = ASSETS_BASE_DIR / "backgrounds"
TEMP_DIR = ASSETS_BASE_DIR / "temp"

class AssetService:
    @staticmethod
    def init_directories():
        """Initialize asset directories."""
        for directory in [MAPS_DIR, TOKENS_DIR, BACKGROUNDS_DIR, TEMP_DIR]:
            directory.mkdir(parents=True, exist_ok=True)

    @staticmethod
    def get_map_directory(campaign_id: UUID, map_id: UUID) -> Path:
        """Get or create map directory."""
        map_dir = MAPS_DIR / str(campaign_id) / str(map_id)
        map_dir.mkdir(parents=True, exist_ok=True)
        return map_dir

    @staticmethod
    def get_token_directory(campaign_id: UUID) -> Path:
        """Get or create token directory."""
        token_dir = TOKENS_DIR / str(campaign_id)
        token_dir.mkdir(parents=True, exist_ok=True)
        return token_dir

    @staticmethod
    def save_map_json(campaign_id: UUID, map_id: UUID, data: dict) -> Path:
        """Save map as JSON (Foundry scene format)."""
        map_dir = AssetService.get_map_directory(campaign_id, map_id)
        map_file = map_dir / "map.json"

        with open(map_file, "w") as f:
            json.dump(data, f, indent=2)

        return map_file

    @staticmethod
    def save_map_image(campaign_id: UUID, map_id: UUID, image_data: bytes) -> Path:
        """Save map image."""
        map_dir = AssetService.get_map_directory(campaign_id, map_id)
        image_file = map_dir / "map.png"

        with open(image_file, "wb") as f:
            f.write(image_data)

        return image_file

    @staticmethod
    def save_map_metadata(campaign_id: UUID, map_id: UUID, metadata: dict) -> Path:
        """Save map metadata."""
        map_dir = AssetService.get_map_directory(campaign_id, map_id)
        metadata_file = map_dir / "metadata.json"

        with open(metadata_file, "w") as f:
            json.dump(metadata, f, indent=2)

        return metadata_file

    @staticmethod
    def save_token_image(campaign_id: UUID, token_id: str, image_data: bytes) -> Path:
        """Save token image."""
        token_dir = AssetService.get_token_directory(campaign_id)
        token_file = token_dir / f"{token_id}.png"

        with open(token_file, "wb") as f:
            f.write(image_data)

        return token_file

    @staticmethod
    def save_token_metadata(campaign_id: UUID, token_id: str, metadata: dict) -> Path:
        """Save token metadata."""
        token_dir = AssetService.get_token_directory(campaign_id)
        metadata_file = token_dir / f"{token_id}.json"

        with open(metadata_file, "w") as f:
            json.dump(metadata, f, indent=2)

        return metadata_file

    @staticmethod
    def get_asset_url(asset_path: str) -> str:
        """Convert filesystem path to accessible URL."""
        # This will be served by the API
        return f"/api/assets/{asset_path}"

    @staticmethod
    def get_map_path(campaign_id: UUID, map_id: UUID) -> Optional[Path]:
        """Get existing map directory."""
        map_dir = MAPS_DIR / str(campaign_id) / str(map_id)
        if map_dir.exists():
            return map_dir
        return None

    @staticmethod
    def cleanup_temp_assets():
        """Clean up temporary files."""
        import shutil
        if TEMP_DIR.exists():
            shutil.rmtree(TEMP_DIR)
            TEMP_DIR.mkdir(parents=True, exist_ok=True)

asset_service = AssetService()

# Initialize on import
asset_service.init_directories()
```

---

## 3. Map Generation

### 3.1 Map Data Models

**app/models/map.py:**
```python
from sqlalchemy import Column, String, Text, Integer, ForeignKey, JSON, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from app.models.base import BaseModel

class MapType(str, Enum):
    DUNGEON = "dungeon"
    TAVERN = "tavern"
    WILDERNESS = "wilderness"
    URBAN = "urban"
    CAVE = "cave"
    CASTLE = "castle"
    TEMPLE = "temple"

class Map(BaseModel):
    __tablename__ = "maps"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("campaigns.id"), nullable=False)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id"), nullable=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    map_type = Column(String(50), nullable=False)  # dungeon, tavern, etc.
    grid_size = Column(Integer, default=5)  # feet per grid square
    width = Column(Integer, nullable=False)  # grid width
    height = Column(Integer, nullable=False)  # grid height
    image_url = Column(String(512), nullable=True)  # URL to map image
    scene_data = Column(JSON, nullable=True)  # Foundry scene format
    metadata = Column(JSON, nullable=True)
    version = Column(Integer, default=1)
    difficulty = Column(String(50), nullable=True)  # easy, medium, hard

    campaign = relationship("Campaign")
    session = relationship("Session", foreign_keys=[session_id])
```

### 3.2 Map Generation Service

**app/services/map_generation_service.py:**
```python
from app.services.llm_service import claude_service
from app.services.prompts import SYSTEM_PROMPTS
from app.models.map import Map
from app.services.asset_service import asset_service
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID, uuid4
from datetime import datetime
import json

class MapGenerationService:
    async def generate_map(
        self,
        campaign_id: UUID,
        location_description: str,
        map_type: str,
        difficulty: str = "medium",
        db: AsyncSession = None
    ) -> dict:
        """
        Generate a map layout based on description.
        Creates Foundry-compatible scene data.
        """
        map_id = uuid4()

        # Step 1: Use AI to generate detailed map layout
        layout = await self._generate_map_layout(
            location_description,
            map_type
        )

        # Step 2: Convert to Foundry scene format
        scene_data = await self._layout_to_foundry_scene(
            layout,
            map_type
        )

        # Step 3: Generate visual representation
        visual_data = await self._generate_visual_map(layout)

        # Step 4: Save to disk
        asset_service.save_map_json(campaign_id, map_id, scene_data)
        if visual_data:
            asset_service.save_map_image(campaign_id, map_id, visual_data)

        # Step 5: Store in database
        map_obj = Map(
            id=map_id,
            campaign_id=campaign_id,
            name=layout.get("name", "Generated Map"),
            description=location_description,
            map_type=map_type,
            width=layout.get("width", 20),
            height=layout.get("height", 20),
            difficulty=difficulty,
            scene_data=scene_data,
            metadata={
                "generated_at": datetime.utcnow().isoformat(),
                "layout_description": layout
            },
            image_url=f"/api/assets/maps/{campaign_id}/{map_id}/map.png"
        )

        if db:
            db.add(map_obj)
            await db.flush()

        return {
            "id": str(map_id),
            "name": map_obj.name,
            "type": map_type,
            "width": map_obj.width,
            "height": map_obj.height,
            "image_url": map_obj.image_url,
            "scene_data": scene_data
        }

    async def _generate_map_layout(
        self,
        description: str,
        map_type: str
    ) -> dict:
        """Use AI to generate detailed map layout."""
        prompt = f"""You are a map designer for D&D 5e. Create a detailed layout for:
Location: {description}
Type: {map_type}

Describe the map layout in terms of:
- Name of the location
- Overall dimensions (in 5-foot squares)
- Key rooms/areas and their purposes
- Walls, doors, and barriers
- Notable features (stairs, columns, etc.)
- Lighting considerations
- Hazards or interesting elements

Return as JSON with:
{{"name": "...", "width": number, "height": number, "rooms": [...]}}"""

        layout = await claude_service.generate_json(
            prompt=prompt,
            system_prompt=SYSTEM_PROMPTS.get("world_builder", ""),
            max_tokens=2000
        )

        return layout

    async def _layout_to_foundry_scene(
        self,
        layout: dict,
        map_type: str
    ) -> dict:
        """Convert AI layout description to Foundry scene format."""
        # This creates a Foundry-compatible scene structure
        scene_data = {
            "name": layout.get("name", "Map"),
            "type": "scenes",
            "width": layout.get("width", 20) * 70,  # Pixels (5ft/grid * 70px)
            "height": layout.get("height", 20) * 70,
            "gridDistance": 5,  # 5 feet per grid square
            "gridUnits": "ft",
            "padding": 0.5,
            "walls": self._generate_walls_from_layout(layout),
            "lights": self._generate_lighting_from_layout(layout),
            "tiles": [],
            "tokens": [],
            "sounds": [],
            "journal": [],
            "weather": [],
            "darkness": 0,
            "backgroundColor": "#000000"
        }

        return scene_data

    def _generate_walls_from_layout(self, layout: dict) -> list:
        """Convert layout room data to Foundry walls."""
        walls = []

        # This is simplified - would need more sophisticated conversion
        for room in layout.get("rooms", []):
            # Generate walls around each room based on coordinates
            walls.append({
                "x": room.get("x", 0) * 70,
                "y": room.get("y", 0) * 70,
                "points": room.get("walls", []),
                "move": 60,
                "sight": 60,
                "sound": 60,
                "light": 60,
                "restricted": -1,
                "door": 0,
                "ds": 0,
                "sense": ""
            })

        return walls

    def _generate_lighting_from_layout(self, layout: dict) -> list:
        """Generate lighting data for the scene."""
        lights = []

        for light_source in layout.get("lights", []):
            lights.append({
                "x": light_source.get("x", 0) * 70,
                "y": light_source.get("y", 0) * 70,
                "type": "local",
                "darkness": 0,
                "radius": light_source.get("radius", 20),
                "angle": 360,
                "rotation": 0,
                "color": light_source.get("color", "#ffffff"),
                "intensity": 1,
                "animation": {"type": None, "speed": 5}
            })

        return lights

    async def _generate_visual_map(self, layout: dict) -> bytes:
        """Generate a visual representation of the map."""
        try:
            from PIL import Image, ImageDraw

            width = layout.get("width", 20)
            height = layout.get("height", 20)
            grid_size = 30  # pixels per grid square

            # Create image
            img = Image.new('RGB', (width * grid_size, height * grid_size), 'white')
            draw = ImageDraw.Draw(img)

            # Draw grid
            for x in range(width + 1):
                draw.line([(x * grid_size, 0), (x * grid_size, height * grid_size)], fill='gray')
            for y in range(height + 1):
                draw.line([(0, y * grid_size), (width * grid_size, y * grid_size)], fill='gray')

            # Draw rooms
            for room in layout.get("rooms", []):
                x = room.get("x", 0) * grid_size
                y = room.get("y", 0) * grid_size
                w = room.get("width", 5) * grid_size
                h = room.get("height", 5) * grid_size

                # Fill room
                draw.rectangle([x, y, x + w, y + h], fill='lightblue')
                # Draw border
                draw.rectangle([x, y, x + w, y + h], outline='black', width=2)

            # Save to bytes
            import io
            img_bytes = io.BytesIO()
            img.save(img_bytes, format='PNG')
            return img_bytes.getvalue()

        except Exception as e:
            print(f"Error generating visual map: {e}")
            return None

    async def regenerate_map(
        self,
        campaign_id: UUID,
        map_id: UUID,
        db: AsyncSession = None
    ) -> dict:
        """Regenerate an existing map."""
        # Load existing map
        from app.models.map import Map
        from sqlalchemy.future import select

        result = await db.execute(
            select(Map).where((Map.id == map_id) & (Map.campaign_id == campaign_id))
        )
        map_obj = result.scalars().first()

        if not map_obj:
            raise ValueError("Map not found")

        # Regenerate with new version
        new_map = await self.generate_map(
            campaign_id,
            map_obj.description,
            map_obj.map_type,
            map_obj.difficulty,
            db
        )

        new_map["version"] = map_obj.version + 1
        map_obj.version += 1
        map_obj.updated_at = datetime.utcnow()

        if db:
            await db.flush()

        return new_map

map_generation_service = MapGenerationService()
```

---

## 4. Token Generation

### 4.1 Token Data Model

**app/models/token.py:**
```python
from sqlalchemy import Column, String, Text, ForeignKey, JSON, Integer, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from app.models.base import BaseModel

class Token(BaseModel):
    __tablename__ = "tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("campaigns.id"), nullable=False)
    npc_id = Column(UUID(as_uuid=True), ForeignKey("npcs.id"), nullable=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String(512), nullable=True)
    image_path = Column(String(512), nullable=True)  # Local file path
    type = Column(String(50), default="character")  # character, monster, object
    size = Column(String(50), default="Medium")
    width = Column(Integer, default=1)  # Grid squares
    height = Column(Integer, default=1)
    metadata = Column(JSON, nullable=True)

    campaign = relationship("Campaign")
    npc = relationship("NPC", foreign_keys=[npc_id])
```

### 4.2 Token Generation Service

**app/services/token_generation_service.py:**
```python
import httpx
import asyncio
from uuid import UUID, uuid4
from app.services.asset_service import asset_service
from app.models.token import Token
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
import json

class TokenGenerationService:
    async def generate_token_from_description(
        self,
        campaign_id: UUID,
        name: str,
        description: str,
        npc_id: UUID = None,
        db: AsyncSession = None
    ) -> dict:
        """
        Generate a token image from a character description.
        Uses free token sources or simple generation.
        """
        token_id = str(uuid4())

        # Option 1: Use a free token API or service
        image_data = await self._fetch_token_image(description, name)

        if image_data:
            # Save token image
            image_path = asset_service.save_token_image(
                campaign_id,
                token_id,
                image_data
            )

            image_url = f"/api/assets/tokens/{campaign_id}/{token_id}.png"
        else:
            # Fallback to generated image or placeholder
            image_url = f"https://api.dicebear.com/7.x/avataaars/png?seed={name}"
            image_path = None

        # Create token object
        token = Token(
            id=uuid4(),
            campaign_id=campaign_id,
            npc_id=npc_id,
            name=name,
            description=description,
            image_url=image_url,
            image_path=str(image_path) if image_path else None,
            type="character",
            metadata={
                "generated_at": datetime.utcnow().isoformat(),
                "source_description": description
            }
        )

        if db:
            db.add(token)
            await db.flush()

        # Save metadata
        asset_service.save_token_metadata(
            campaign_id,
            token_id,
            {
                "name": name,
                "description": description,
                "npc_id": str(npc_id) if npc_id else None,
                "created_at": datetime.utcnow().isoformat()
            }
        )

        return {
            "id": str(token.id),
            "name": name,
            "image_url": image_url,
            "type": "character"
        }

    async def _fetch_token_image(self, description: str, name: str) -> bytes:
        """
        Fetch token image from external source.
        Options:
        1. DiceBear API (free, no API key)
        2. Token Quest (if available)
        3. Local generation using PIL
        """
        try:
            # Using DiceBear as primary source (free, no auth)
            async with httpx.AsyncClient() as client:
                url = f"https://api.dicebear.com/7.x/avataaars/png?seed={name}"
                response = await client.get(url, timeout=10.0)

                if response.status_code == 200:
                    return response.content

        except Exception as e:
            print(f"Error fetching token image: {e}")

        # Fallback: generate simple token locally
        return await self._generate_simple_token(name)

    async def _generate_simple_token(self, name: str) -> bytes:
        """Generate a simple token image using PIL."""
        try:
            from PIL import Image, ImageDraw, ImageFont
            import io

            # Create circular token
            size = 200
            img = Image.new('RGB', (size, size), 'lightblue')
            draw = ImageDraw.Draw(img)

            # Draw circle
            draw.ellipse([0, 0, size-1, size-1], outline='black', width=3)

            # Add text
            try:
                font = ImageFont.load_default()
                text_bbox = draw.textbbox((0, 0), name[:3].upper(), font=font)
                text_width = text_bbox[2] - text_bbox[0]
                text_height = text_bbox[3] - text_bbox[1]
                x = (size - text_width) // 2
                y = (size - text_height) // 2
                draw.text((x, y), name[:3].upper(), fill='black', font=font)
            except Exception:
                pass

            # Save to bytes
            img_bytes = io.BytesIO()
            img.save(img_bytes, format='PNG')
            return img_bytes.getvalue()

        except Exception as e:
            print(f"Error generating simple token: {e}")
            return None

    async def generate_tokens_for_npcs(
        self,
        campaign_id: UUID,
        npc_ids: list[UUID],
        db: AsyncSession = None
    ) -> list[dict]:
        """Generate tokens for multiple NPCs."""
        from app.models.npc import NPC
        from sqlalchemy.future import select

        tokens = []

        # Fetch NPCs
        result = await db.execute(
            select(NPC).where(NPC.id.in_(npc_ids))
        )
        npcs = result.scalars().all()

        for npc in npcs:
            token = await self.generate_token_from_description(
                campaign_id,
                npc.name,
                npc.description or npc.personality,
                npc_id=npc.id,
                db=db
            )
            tokens.append(token)

        return tokens

token_generation_service = TokenGenerationService()
```

---

## 5. Random Generation Templates

**app/services/random_generation.py:**
```python
import random
from typing import Dict, List
from app.services.llm_service import claude_service
from app.services.prompts import SYSTEM_PROMPTS

class RandomGenerationService:
    """Service for random/procedural content generation."""

    ROOM_TYPES = [
        "Guard Post", "Barracks", "Dining Hall", "Kitchen",
        "Throne Room", "Treasury", "Library", "Laboratory",
        "Prison", "Torture Chamber", "Shrine", "Tavern",
        "Bedchamber", "Armory", "Workshop", "Stable"
    ]

    ENCOUNTER_TYPES = [
        "Combat", "Roleplay", "Social Encounter", "Skill Challenge",
        "Puzzle", "Trap", "Mystery", "Negotiation"
    ]

    TREASURE_TYPES = [
        "Gold", "Gems", "Magic Item", "Art Object",
        "Document", "Key", "Map", "Artifact"
    ]

    @staticmethod
    async def random_dungeon_layout(width: int = 20, height: int = 20) -> dict:
        """Generate a random dungeon layout."""
        num_rooms = random.randint(5, 12)
        rooms = []

        for _ in range(num_rooms):
            room_width = random.randint(4, 10)
            room_height = random.randint(4, 10)

            rooms.append({
                "name": random.choice(RandomGenerationService.ROOM_TYPES),
                "x": random.randint(0, width - room_width),
                "y": random.randint(0, height - room_height),
                "width": room_width,
                "height": room_height,
                "purpose": random.choice([
                    "rest", "defense", "storage", "living", "ritual"
                ])
            })

        return {
            "name": "Random Dungeon",
            "width": width,
            "height": height,
            "rooms": rooms,
            "lights": [
                {
                    "x": room.get("x", 0) + room.get("width", 5) // 2,
                    "y": room.get("y", 0) + room.get("height", 5) // 2,
                    "radius": 30,
                    "color": "#ffff99"
                }
                for room in rooms
            ]
        }

    @staticmethod
    async def random_encounter(party_level: int) -> dict:
        """Generate a random encounter appropriate for party level."""
        encounter_type = random.choice(RandomGenerationService.ENCOUNTER_TYPES)

        cr_multiplier = {
            1: 0.25, 2: 0.5, 3: 1, 4: 1.5,
            5: 2, 10: 3, 15: 4, 20: 5
        }.get(party_level, 1)

        return {
            "type": encounter_type,
            "difficulty": random.choice(["Easy", "Medium", "Hard", "Deadly"]),
            "creatures": random.randint(1, 5),
            "estimated_cr": cr_multiplier,
            "treasure": random.choice(RandomGenerationService.TREASURE_TYPES)
        }

    @staticmethod
    async def random_npc() -> dict:
        """Generate a random NPC template."""
        races = ["Human", "Elf", "Dwarf", "Halfling", "Tiefling", "Dragonborn", "Gnome", "Half-Orc"]
        classes = ["Barbarian", "Bard", "Cleric", "Druid", "Fighter", "Monk", "Paladin", "Ranger", "Rogue", "Sorcerer", "Warlock", "Wizard"]
        traits = ["gruff", "cheerful", "mysterious", "arrogant", "humble", "nervous", "confident"]

        return {
            "name": f"NPC_{random.randint(1000, 9999)}",
            "race": random.choice(races),
            "class": random.choice(classes),
            "personality_trait": random.choice(traits),
            "alignment": random.choice(["LG", "NG", "CG", "LN", "NN", "CN", "LE", "NE", "CE"])
        }

random_generation_service = RandomGenerationService()
```

---

## 6. Asset Serving Endpoints

**app/routers/assets.py:**
```python
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from pathlib import Path
from uuid import UUID

router = APIRouter()

ASSETS_BASE_DIR = Path("/assets")

@router.get("/assets/maps/{campaign_id}/{map_id}/map.png")
async def get_map_image(campaign_id: UUID, map_id: UUID):
    """Serve map image."""
    image_path = ASSETS_BASE_DIR / "maps" / str(campaign_id) / str(map_id) / "map.png"

    if not image_path.exists():
        raise HTTPException(status_code=404, detail="Map image not found")

    return FileResponse(image_path, media_type="image/png")

@router.get("/assets/maps/{campaign_id}/{map_id}/map.json")
async def get_map_json(campaign_id: UUID, map_id: UUID):
    """Serve map JSON (Foundry scene format)."""
    json_path = ASSETS_BASE_DIR / "maps" / str(campaign_id) / str(map_id) / "map.json"

    if not json_path.exists():
        raise HTTPException(status_code=404, detail="Map data not found")

    return FileResponse(json_path, media_type="application/json")

@router.get("/assets/tokens/{campaign_id}/{token_id}.png")
async def get_token_image(campaign_id: UUID, token_id: str):
    """Serve token image."""
    image_path = ASSETS_BASE_DIR / "tokens" / str(campaign_id) / f"{token_id}.png"

    if not image_path.exists():
        raise HTTPException(status_code=404, detail="Token image not found")

    return FileResponse(image_path, media_type="image/png")

@router.get("/assets/tokens/{campaign_id}/{token_id}.json")
async def get_token_metadata(campaign_id: UUID, token_id: str):
    """Serve token metadata."""
    json_path = ASSETS_BASE_DIR / "tokens" / str(campaign_id) / f"{token_id}.json"

    if not json_path.exists():
        raise HTTPException(status_code=404, detail="Token metadata not found")

    return FileResponse(json_path, media_type="application/json")
```

---

## 7. Generation API Endpoints

**Update app/routers/generation.py:**
```python
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.database import get_db
from app.dependencies import get_current_user
from app.models.campaign import Campaign
from app.models.user import User
from app.services.map_generation_service import map_generation_service
from app.services.token_generation_service import token_generation_service
from app.services.random_generation import random_generation_service

router = APIRouter()

class GenerateMapRequest(BaseModel):
    campaign_id: UUID
    location_description: str
    map_type: str
    difficulty: str = "medium"

class GenerateTokenRequest(BaseModel):
    campaign_id: UUID
    name: str
    description: str
    npc_id: UUID = None

@router.post("/generate/map")
async def generate_map(
    request: GenerateMapRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate a map."""
    # Verify ownership
    result = await db.execute(
        select(Campaign).where(
            (Campaign.id == request.campaign_id) &
            (Campaign.user_id == current_user.id)
        )
    )
    if not result.scalars().first():
        raise HTTPException(status_code=404, detail="Campaign not found")

    map_data = await map_generation_service.generate_map(
        request.campaign_id,
        request.location_description,
        request.map_type,
        request.difficulty,
        db
    )

    await db.commit()
    return {"success": True, "map": map_data}

@router.post("/generate/token")
async def generate_token(
    request: GenerateTokenRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate a token."""
    # Verify ownership
    result = await db.execute(
        select(Campaign).where(
            (Campaign.id == request.campaign_id) &
            (Campaign.user_id == current_user.id)
        )
    )
    if not result.scalars().first():
        raise HTTPException(status_code=404, detail="Campaign not found")

    token_data = await token_generation_service.generate_token_from_description(
        request.campaign_id,
        request.name,
        request.description,
        request.npc_id,
        db
    )

    await db.commit()
    return {"success": True, "token": token_data}

@router.get("/generate/random/dungeon")
async def random_dungeon(width: int = 20, height: int = 20):
    """Generate a random dungeon layout."""
    layout = await random_generation_service.random_dungeon_layout(width, height)
    return {"success": True, "layout": layout}

@router.get("/generate/random/npc")
async def random_npc():
    """Generate a random NPC."""
    npc = await random_generation_service.random_npc()
    return {"success": True, "npc": npc}

@router.get("/generate/random/encounter/{party_level}")
async def random_encounter(party_level: int):
    """Generate a random encounter."""
    encounter = await random_generation_service.random_encounter(party_level)
    return {"success": True, "encounter": encounter}
```

---

## 8. Dependencies

**Update backend/requirements.txt:**
```
# ... existing requirements ...
Pillow==10.0.0              # Image processing
httpx==0.25.2               # HTTP client for external APIs
aiofiles==23.2.1            # Async file operations
```

---

## 9. Database Migrations

**alembic/versions/002_add_maps_tokens.py:**
```python
"""Add maps and tokens tables

Revision ID: 002
Create Date: 2024-01-02 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None

def upgrade():
    # Create maps table
    op.create_table(
        'maps',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('campaign_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('campaigns.id')),
        sa.Column('session_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('sessions.id'), nullable=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text),
        sa.Column('map_type', sa.String(50)),
        sa.Column('grid_size', sa.Integer, default=5),
        sa.Column('width', sa.Integer),
        sa.Column('height', sa.Integer),
        sa.Column('image_url', sa.String(512)),
        sa.Column('scene_data', postgresql.JSON),
        sa.Column('metadata', postgresql.JSON),
        sa.Column('version', sa.Integer, default=1),
        sa.Column('difficulty', sa.String(50)),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now()),
    )

    # Create tokens table
    op.create_table(
        'tokens',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('campaign_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('campaigns.id')),
        sa.Column('npc_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('npcs.id'), nullable=True),
        sa.Column('name', sa.String(255)),
        sa.Column('description', sa.Text),
        sa.Column('image_url', sa.String(512)),
        sa.Column('image_path', sa.String(512)),
        sa.Column('type', sa.String(50), default='character'),
        sa.Column('size', sa.String(50), default='Medium'),
        sa.Column('width', sa.Integer, default=1),
        sa.Column('height', sa.Integer, default=1),
        sa.Column('metadata', postgresql.JSON),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now()),
    )

def downgrade():
    op.drop_table('tokens')
    op.drop_table('maps')
```

---

## 10. Frontend Components

**frontend/src/components/generation/MapGenerator.jsx:**
```jsx
import { useState } from 'react';
import { generationService } from '../../services/generationService';

export function MapGenerator({ campaignId }) {
  const [loading, setLoading] = useState(false);
  const [mapDescription, setMapDescription] = useState('');
  const [mapType, setMapType] = useState('dungeon');
  const [generatedMap, setGeneratedMap] = useState(null);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await generationService.generateMap(
        campaignId,
        mapDescription,
        mapType
      );
      setGeneratedMap(result.map);
    } catch (error) {
      console.error('Failed to generate map:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <textarea
        value={mapDescription}
        onChange={(e) => setMapDescription(e.target.value)}
        placeholder="Describe the location..."
        className="w-full p-2 border rounded"
        rows={4}
      />

      <select
        value={mapType}
        onChange={(e) => setMapType(e.target.value)}
        className="px-4 py-2 border rounded"
      >
        <option value="dungeon">Dungeon</option>
        <option value="tavern">Tavern</option>
        <option value="wilderness">Wilderness</option>
        <option value="urban">Urban</option>
      </select>

      <button
        onClick={handleGenerate}
        disabled={loading || !mapDescription}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        {loading ? 'Generating...' : 'Generate Map'}
      </button>

      {generatedMap && (
        <div className="border rounded p-4">
          <h3 className="font-bold">{generatedMap.name}</h3>
          <img src={generatedMap.image_url} alt="Generated Map" className="mt-4 max-w-full" />
        </div>
      )}
    </div>
  );
}
```

---

## 11. Testing Strategy

**tests/test_map_generation.py:**
```python
import pytest
from uuid import uuid4
from app.services.map_generation_service import map_generation_service

@pytest.mark.asyncio
async def test_generate_map_layout():
    """Test map layout generation."""
    layout = await map_generation_service._generate_map_layout(
        "A wizard's tower with multiple levels",
        "dungeon"
    )

    assert "name" in layout
    assert "width" in layout
    assert "height" in layout
    assert "rooms" in layout

@pytest.mark.asyncio
async def test_layout_to_foundry():
    """Test conversion to Foundry format."""
    layout = {
        "name": "Test Dungeon",
        "width": 20,
        "height": 20,
        "rooms": []
    }

    scene_data = await map_generation_service._layout_to_foundry_scene(layout, "dungeon")

    assert scene_data["name"] == "Test Dungeon"
    assert "walls" in scene_data
    assert "lights" in scene_data
```

---

## 12. Implementation Checklist

### Backend
- [ ] AssetService for file management
- [ ] Map generation service
- [ ] Token generation service
- [ ] Random generation service
- [ ] Map and Token database models
- [ ] Asset serving endpoints
- [ ] Generation endpoints (/generate/map, /generate/token)
- [ ] Image processing with PIL
- [ ] Docker volume configuration
- [ ] Tests for generation services

### Frontend
- [ ] MapGenerator component
- [ ] TokenGenerator component
- [ ] Asset display components
- [ ] Generation integration with backend

### Infrastructure
- [ ] Docker volume mount for /assets
- [ ] Asset directory structure
- [ ] File permission configuration

---

## 13. Success Criteria

- Maps generated and stored as JSON + PNG
- Tokens generated with images
- Foundry-compatible scene format created
- Assets persisted in Docker volumes
- Random generation working
- Image serving endpoints functional
- File size optimization working
- Generation time < 20 seconds per asset

---

## 14. Next Phase

Upon completion of Phase 3, proceed to **Phase 4: Foundry VTT Integration** for syncing generated content to Foundry instances.
