# Phase 2: AI Integration - LLM Connection & Content Generation

**Duration:** 3-4 weeks
**Goal:** Integrate Claude API for AI-powered content generation with robust prompt engineering and context management

**Dependencies:** Phase 1 complete (API running, database ready)

---

## 1. Overview

Phase 2 focuses on:
- Claude API integration
- Prompt engineering for D&D content
- Campaign lore generation
- NPC/character generation
- Scenario/encounter generation
- Player background generation
- Prompt versioning and A/B testing framework

---

## 2. Claude API Setup

### 2.1 API Key Management

**Update app/config.py:**
```python
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # ... existing settings ...

    # Claude API
    CLAUDE_API_KEY: str
    CLAUDE_MODEL: str = "claude-3-5-sonnet-20241022"  # Latest Claude model
    CLAUDE_MAX_TOKENS: int = 2000
    CLAUDE_TEMPERATURE: float = 0.8  # Higher for creativity
    CLAUDE_TIMEOUT: int = 60

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
```

**Update .env:**
```
CLAUDE_API_KEY=your-claude-api-key-here
```

### 2.2 Claude Client Wrapper

**app/services/llm_service.py:**
```python
from anthropic import Anthropic
from app.config import settings
from typing import Optional
import json

class ClaudeService:
    def __init__(self):
        self.client = Anthropic(api_key=settings.CLAUDE_API_KEY)
        self.model = settings.CLAUDE_MODEL

    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: int = None,
        temperature: float = None,
        json_mode: bool = False
    ) -> str:
        """
        Generate text using Claude.

        Args:
            prompt: User message/request
            system_prompt: System instructions
            max_tokens: Max tokens to generate
            temperature: Creativity level (0-1)
            json_mode: If True, expects JSON response

        Returns:
            Generated text
        """
        max_tokens = max_tokens or settings.CLAUDE_MAX_TOKENS
        temperature = temperature if temperature is not None else settings.CLAUDE_TEMPERATURE

        messages = [{"role": "user", "content": prompt}]

        system = system_prompt or "You are a helpful assistant."

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=max_tokens,
                temperature=temperature,
                system=system,
                messages=messages,
            )

            return response.content[0].text
        except Exception as e:
            raise Exception(f"Claude API error: {str(e)}")

    async def generate_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        schema: Optional[dict] = None,
        **kwargs
    ) -> dict:
        """
        Generate JSON response from Claude.
        Automatically parses and validates response.
        """
        response_text = await self.generate_text(prompt, system_prompt, **kwargs)

        try:
            # Extract JSON from response (handle markdown code blocks)
            if "```json" in response_text:
                json_str = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                json_str = response_text.split("```")[1].split("```")[0].strip()
            else:
                json_str = response_text

            return json.loads(json_str)
        except json.JSONDecodeError:
            raise ValueError(f"Failed to parse JSON response: {response_text}")

# Singleton instance
claude_service = ClaudeService()
```

---

## 3. Prompt Templates & Engineering

### 3.1 System Prompts

**app/services/prompts.py:**
```python
"""
D&D Content Generation Prompts
These are carefully engineered prompts for generating D&D 5e content
"""

SYSTEM_PROMPTS = {
    "dm": """You are an expert Dungeon Master with years of experience creating D&D 5e campaigns.
You create engaging, balanced, and story-driven content. You understand the mechanics of D&D 5e
and create content that is both fun and mechanically sound. Your responses are creative, detailed,
and inspire players to engage with the world you create.""",

    "world_builder": """You are a master world-builder specializing in fantasy settings.
You create rich, detailed worlds with interesting locations, cultures, and histories.
Your world-building is internally consistent, has depth, and provides plenty of hooks
for adventurers to explore. Consider geography, politics, economy, magic systems, and history.""",

    "character_creator": """You are an expert character designer. You create compelling NPCs and player characters
with depth, personality, and motivations. Your characters feel alive and react believably to
the situations the party creates. You understand the psychology of characters and create
realistic personality quirks, fears, and desires.""",

    "encounter_designer": """You are an expert at designing engaging combat encounters and social encounters.
You understand D&D 5e mechanics, balance, and pacing. Your encounters are challenging but fair,
and you consider the party composition and level when suggesting encounters. You also understand
non-combat encounters and narrative conflict.""",
}

# Campaign Generation Prompts
CAMPAIGN_GENERATION_PROMPT = """Create a D&D 5e campaign setting based on the following description:

**Campaign Name:** {campaign_name}
**Setting:** {setting}
**Theme:** {theme}
**Tone:** {tone}
**Player Count:** {player_count}

Provide the following in your response (as JSON):
1. "overview": A 2-3 sentence overview of the campaign
2. "world": Details about the world (geography, cultures, magic system, politics)
3. "major_factions": 3-5 major factions/organizations and their goals
4. "hooks": 5-7 potential starting hooks for adventures
5. "threats": 3-5 major threats or challenges in this world
6. "magic_system": Brief description of how magic works in this world
7. "cosmology": Information about gods, planes, and supernatural forces

Format your response as valid JSON only."""

# Campaign Continuation Prompt
CAMPAIGN_CONTINUATION_PROMPT = """You are continuing a D&D 5e campaign. Here is what has happened so far:

**Campaign:** {campaign_name}
**Setting:** {setting}
**Previous Sessions Summary:** {previous_summary}
**Key NPCs and Their Status:** {npc_status}
**Unresolved Plot Threads:** {plot_threads}

The DM wants to create the next session with the following description:
{session_description}

Create a scenario that:
1. Builds naturally on previous events
2. Respects the consequences of previous player decisions
3. Moves the campaign forward while leaving room for player agency
4. References established NPCs and locations when appropriate

Provide as JSON with:
1. "title": Session title
2. "overview": What this session is about
3. "key_scenes": 3-4 major scenes/encounters
4. "npc_involvement": Which NPCs appear and how they've changed
5. "plot_progression": How this session moves the story forward
6. "complications": Potential complications that could arise"""

# NPC Generation Prompt
NPC_GENERATION_PROMPT = """Create a D&D 5e NPC with the following specifications:

**Campaign Context:** {campaign_context}
**NPC Role:** {role}
**Archetype:** {archetype}
**Suggested Abilities:** {abilities}

Create a detailed NPC with personality, motivations, and story hooks. Provide as JSON:
1. "name": Character name (should fit the campaign setting)
2. "race": D&D 5e race
3. "class": D&D 5e class/profession
4. "level": Appropriate level (1-20)
5. "personality": Brief personality description
6. "appearance": Physical description
7. "background": A paragraph of background
8. "motivations": 2-3 key motivations
9. "secrets": 1-2 secrets or hidden aspects
10. "hooks": 2-3 adventure hooks related to this NPC
11. "stats": Suggested ability scores (STR, DEX, CON, INT, WIS, CHA)"""

# Scenario Generation Prompt
SCENARIO_GENERATION_PROMPT = """Design a D&D 5e scenario/adventure hook based on:

**Campaign:** {campaign_name}
**Setting:** {setting}
**Party Level:** {party_level}
**Party Composition:** {party_composition}
**Additional Notes:** {notes}

Create an engaging scenario that:
1. Is appropriate for the party level
2. Offers multiple solutions/approaches
3. Has clear objectives but flexible implementation
4. Includes interesting NPCs and locations

Provide as JSON:
1. "title": Scenario title
2. "overview": What this scenario is about
3. "objectives": Primary and secondary objectives
4. "locations": Key locations the party will visit
5. "npcs": Important NPCs in this scenario
6. "encounters": 3-5 encounter suggestions (combat and non-combat)
7. "rewards": Suggested treasures and experience
8. "complications": Things that could go wrong or unexpected twists"""

# Player Background Generation Prompt
PLAYER_BACKGROUND_PROMPT = """Create D&D 5e character backgrounds for {player_count} players.
Consider the campaign setting: {setting}
Campaign theme: {theme}

For each character, provide (as JSON array):
1. "character_name": Name
2. "race": D&D race
3. "class": D&D class (let players choose from suggestions)
4. "background": D&D background
5. "backstory": A paragraph of background story
6. "personality_traits": 2 personality traits
7. "ideals": 1 ideal they pursue
8. "bonds": 1-2 bonds to other party members or the world
9. "flaws": 1 character flaw
10. "hooks": 2-3 story hooks involving this character
11. "reasons_for_adventure": Why this character is adventuring

Make the backgrounds interconnected where possible, creating party chemistry."""

class PromptTemplate:
    @staticmethod
    def render_campaign_generation(campaign_name, setting, theme, tone, player_count):
        return CAMPAIGN_GENERATION_PROMPT.format(
            campaign_name=campaign_name,
            setting=setting,
            theme=theme,
            tone=tone,
            player_count=player_count
        )

    @staticmethod
    def render_campaign_continuation(campaign_name, setting, previous_summary, npc_status, plot_threads, session_description):
        return CAMPAIGN_CONTINUATION_PROMPT.format(
            campaign_name=campaign_name,
            setting=setting,
            previous_summary=previous_summary,
            npc_status=npc_status,
            plot_threads=plot_threads,
            session_description=session_description
        )

    @staticmethod
    def render_npc_generation(campaign_context, role, archetype, abilities):
        return NPC_GENERATION_PROMPT.format(
            campaign_context=campaign_context,
            role=role,
            archetype=archetype,
            abilities=abilities
        )

    @staticmethod
    def render_scenario_generation(campaign_name, setting, party_level, party_composition, notes):
        return SCENARIO_GENERATION_PROMPT.format(
            campaign_name=campaign_name,
            setting=setting,
            party_level=party_level,
            party_composition=party_composition,
            notes=notes
        )

    @staticmethod
    def render_player_backgrounds(player_count, setting, theme):
        return PLAYER_BACKGROUND_PROMPT.format(
            player_count=player_count,
            setting=setting,
            theme=theme
        )
```

---

## 4. Content Generation Services

### 4.1 Campaign Generation Service

**app/services/campaign_generation_service.py:**
```python
from app.services.llm_service import claude_service
from app.services.prompts import PromptTemplate, SYSTEM_PROMPTS
from app.db.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.campaign import Campaign
from app.models.generated_content import GeneratedContent
from datetime import datetime
import json

class CampaignGenerationService:
    async def generate_campaign_lore(
        self,
        campaign_id: str,
        db: AsyncSession,
        force_regenerate: bool = False
    ) -> dict:
        """
        Generate or retrieve campaign lore using Claude.
        """
        # Check if already generated
        result = await db.execute(
            select(Campaign).where(Campaign.id == campaign_id)
        )
        campaign = result.scalars().first()

        if campaign.world_lore and not force_regenerate:
            return campaign.world_lore

        # Generate new lore
        prompt = PromptTemplate.render_campaign_generation(
            campaign_name=campaign.name,
            setting=campaign.setting,
            theme=campaign.theme,
            tone=campaign.tone,
            player_count=campaign.player_count
        )

        lore = await claude_service.generate_json(
            prompt=prompt,
            system_prompt=SYSTEM_PROMPTS["world_builder"],
            max_tokens=3000,
            temperature=0.9  # Higher creativity for worldbuilding
        )

        # Store in database
        campaign.world_lore = lore
        campaign.updated_at = datetime.utcnow()

        # Log the generation
        await self._log_generation(
            db=db,
            campaign_id=campaign_id,
            content_type="campaign_lore",
            prompt=prompt,
            response=lore
        )

        await db.commit()
        return lore

    async def _log_generation(
        self,
        db: AsyncSession,
        campaign_id: str,
        content_type: str,
        prompt: str,
        response: dict
    ):
        """Log AI-generated content for auditing and analysis."""
        log = GeneratedContent(
            campaign_id=campaign_id,
            type=content_type,
            prompt=prompt,
            ai_response=response,
            processed_output=response,
            created_at=datetime.utcnow()
        )
        db.add(log)
        await db.flush()  # Don't commit, let caller handle it

campaign_generation_service = CampaignGenerationService()
```

### 4.2 NPC Generation Service

**app/services/npc_generation_service.py:**
```python
from app.services.llm_service import claude_service
from app.services.prompts import PromptTemplate, SYSTEM_PROMPTS
from app.models.npc import NPC
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from datetime import datetime
import json

class NPCGenerationService:
    async def generate_npc(
        self,
        campaign_id: UUID,
        role: str,
        archetype: str,
        abilities: str,
        db: AsyncSession,
        campaign_context: str = ""
    ) -> dict:
        """
        Generate a single NPC using Claude.
        """
        prompt = PromptTemplate.render_npc_generation(
            campaign_context=campaign_context,
            role=role,
            archetype=archetype,
            abilities=abilities
        )

        npc_data = await claude_service.generate_json(
            prompt=prompt,
            system_prompt=SYSTEM_PROMPTS["character_creator"],
            max_tokens=2000,
            temperature=0.85
        )

        # Store NPC in database
        npc = NPC(
            campaign_id=campaign_id,
            name=npc_data.get("name"),
            role=role,
            description=npc_data.get("appearance"),
            personality=npc_data.get("personality"),
            motivations=npc_data.get("motivations", []),
            background=npc_data.get("background"),
            stats=npc_data.get("stats")
        )

        db.add(npc)
        await db.flush()

        return {
            "id": npc.id,
            "name": npc.name,
            "role": role,
            "full_data": npc_data
        }

    async def generate_npcs_for_scenario(
        self,
        campaign_id: UUID,
        campaign_context: str,
        scenario_description: str,
        count: int = 3,
        db: AsyncSession = None
    ) -> list[dict]:
        """
        Generate multiple NPCs relevant to a scenario.
        """
        npcs = []
        archetypes = [
            "Quest Giver",
            "Ally",
            "Rival",
            "Mysterious Stranger",
            "Comic Relief"
        ]

        for i in range(min(count, len(archetypes))):
            npc = await self.generate_npc(
                campaign_id=campaign_id,
                role=scenario_description.split(",")[0] if "," in scenario_description else scenario_description,
                archetype=archetypes[i],
                abilities=f"Relevant to: {scenario_description}",
                db=db,
                campaign_context=campaign_context
            )
            npcs.append(npc)

        return npcs

npc_generation_service = NPCGenerationService()
```

### 4.3 Scenario Generation Service

**app/services/scenario_generation_service.py:**
```python
from app.services.llm_service import claude_service
from app.services.prompts import PromptTemplate, SYSTEM_PROMPTS
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
import json

class ScenarioGenerationService:
    async def generate_scenario(
        self,
        campaign_id: UUID,
        campaign_name: str,
        setting: str,
        party_level: int,
        party_composition: str,
        additional_notes: str = "",
        db: AsyncSession = None
    ) -> dict:
        """
        Generate a complete scenario/session outline.
        """
        prompt = PromptTemplate.render_scenario_generation(
            campaign_name=campaign_name,
            setting=setting,
            party_level=party_level,
            party_composition=party_composition,
            notes=additional_notes
        )

        scenario = await claude_service.generate_json(
            prompt=prompt,
            system_prompt=SYSTEM_PROMPTS["encounter_designer"],
            max_tokens=3000,
            temperature=0.8
        )

        return scenario

scenario_generation_service = ScenarioGenerationService()
```

### 4.4 Player Background Generation Service

**app/services/background_generation_service.py:**
```python
from app.services.llm_service import claude_service
from app.services.prompts import PromptTemplate, SYSTEM_PROMPTS
from uuid import UUID
import json

class BackgroundGenerationService:
    async def generate_player_backgrounds(
        self,
        campaign_id: UUID,
        player_count: int,
        setting: str,
        theme: str
    ) -> list[dict]:
        """
        Generate interconnected player character backgrounds.
        """
        prompt = PromptTemplate.render_player_backgrounds(
            player_count=player_count,
            setting=setting,
            theme=theme
        )

        response = await claude_service.generate_json(
            prompt=prompt,
            system_prompt=SYSTEM_PROMPTS["character_creator"],
            max_tokens=4000,
            temperature=0.85
        )

        # Ensure it's a list
        if isinstance(response, dict):
            response = response.get("characters", [response])

        return response

background_generation_service = BackgroundGenerationService()
```

---

## 5. API Endpoints for Phase 2

### 5.1 Campaign Generation Endpoints

**app/routers/generation.py:**
```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID
from pydantic import BaseModel

from app.db.database import get_db
from app.dependencies import get_current_user
from app.models.campaign import Campaign
from app.models.user import User
from app.services.campaign_generation_service import campaign_generation_service
from app.services.npc_generation_service import npc_generation_service
from app.services.scenario_generation_service import scenario_generation_service
from app.services.background_generation_service import background_generation_service

router = APIRouter()

# Request schemas
class GenerateLoreRequest(BaseModel):
    campaign_id: UUID
    force_regenerate: bool = False

class GenerateNPCRequest(BaseModel):
    campaign_id: UUID
    role: str
    archetype: str
    abilities: str = ""
    count: int = 1

class GenerateScenarioRequest(BaseModel):
    campaign_id: UUID
    party_level: int = 1
    party_composition: str = "Mixed party"
    notes: str = ""

class GenerateBackgroundsRequest(BaseModel):
    campaign_id: UUID
    player_count: int

# Endpoints
@router.post("/generate/lore")
async def generate_campaign_lore(
    request: GenerateLoreRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate or regenerate campaign lore."""
    # Verify ownership
    result = await db.execute(
        select(Campaign).where(
            (Campaign.id == request.campaign_id) &
            (Campaign.user_id == current_user.id)
        )
    )
    if not result.scalars().first():
        raise HTTPException(status_code=404, detail="Campaign not found")

    lore = await campaign_generation_service.generate_campaign_lore(
        str(request.campaign_id),
        db,
        request.force_regenerate
    )

    return {"success": True, "lore": lore}

@router.post("/generate/npcs")
async def generate_npcs(
    request: GenerateNPCRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate NPCs for a campaign."""
    # Verify ownership
    result = await db.execute(
        select(Campaign).where(
            (Campaign.id == request.campaign_id) &
            (Campaign.user_id == current_user.id)
        )
    )
    campaign = result.scalars().first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    npcs = []
    for _ in range(request.count):
        npc = await npc_generation_service.generate_npc(
            campaign_id=request.campaign_id,
            role=request.role,
            archetype=request.archetype,
            abilities=request.abilities,
            db=db,
            campaign_context=campaign.description or ""
        )
        npcs.append(npc)

    await db.commit()
    return {"success": True, "npcs": npcs}

@router.post("/generate/scenario")
async def generate_scenario(
    request: GenerateScenarioRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate a scenario/encounter outline."""
    # Verify ownership
    result = await db.execute(
        select(Campaign).where(
            (Campaign.id == request.campaign_id) &
            (Campaign.user_id == current_user.id)
        )
    )
    campaign = result.scalars().first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    scenario = await scenario_generation_service.generate_scenario(
        campaign_id=request.campaign_id,
        campaign_name=campaign.name,
        setting=campaign.setting,
        party_level=request.party_level,
        party_composition=request.party_composition,
        additional_notes=request.notes,
        db=db
    )

    return {"success": True, "scenario": scenario}

@router.post("/generate/backgrounds")
async def generate_backgrounds(
    request: GenerateBackgroundsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate player character backgrounds."""
    # Verify ownership
    result = await db.execute(
        select(Campaign).where(
            (Campaign.id == request.campaign_id) &
            (Campaign.user_id == current_user.id)
        )
    )
    campaign = result.scalars().first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    backgrounds = await background_generation_service.generate_player_backgrounds(
        campaign_id=request.campaign_id,
        player_count=request.player_count,
        setting=campaign.setting or "Fantasy",
        theme=campaign.theme or "Adventure"
    )

    return {"success": True, "backgrounds": backgrounds}
```

---

## 6. Error Handling & Validation

**app/utils/validation.py:**
```python
from typing import Any, Optional
import json

class ContentValidator:
    @staticmethod
    def validate_npc_data(npc_data: dict) -> tuple[bool, Optional[str]]:
        """Validate NPC generated data."""
        required_fields = ["name", "personality", "background"]

        for field in required_fields:
            if field not in npc_data or not npc_data[field]:
                return False, f"Missing required field: {field}"

        return True, None

    @staticmethod
    def validate_scenario_data(scenario_data: dict) -> tuple[bool, Optional[str]]:
        """Validate scenario generated data."""
        required_fields = ["title", "overview", "objectives"]

        for field in required_fields:
            if field not in scenario_data or not scenario_data[field]:
                return False, f"Missing required field: {field}"

        return True, None

    @staticmethod
    def validate_lore_data(lore_data: dict) -> tuple[bool, Optional[str]]:
        """Validate campaign lore data."""
        required_fields = ["overview", "world", "major_factions"]

        for field in required_fields:
            if field not in lore_data or not lore_data[field]:
                return False, f"Missing required field: {field}"

        return True, None

validator = ContentValidator()
```

---

## 7. Database Models for Generated Content

**app/models/generated_content.py:**
```python
from sqlalchemy import Column, String, Text, ForeignKey, JSON, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from enum import Enum
from app.models.base import BaseModel

class ContentType(str, Enum):
    CAMPAIGN_LORE = "campaign_lore"
    NPC = "npc"
    SCENARIO = "scenario"
    BACKGROUND = "background"
    MAP = "map"

class GeneratedContent(BaseModel):
    __tablename__ = "generated_content"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("campaigns.id"), nullable=False)
    type = Column(SQLEnum(ContentType), nullable=False)
    prompt = Column(Text, nullable=False)  # The prompt used
    ai_response = Column(JSON, nullable=False)  # Raw AI response
    processed_output = Column(JSON, nullable=False)  # Processed/formatted output

    campaign = relationship("Campaign")
```

---

## 8. Testing Strategy

**tests/test_llm_service.py:**
```python
import pytest
from app.services.llm_service import claude_service

@pytest.mark.asyncio
async def test_generate_text():
    """Test basic text generation."""
    response = await claude_service.generate_text(
        prompt="Write a short fantasy tavern description.",
        max_tokens=500
    )
    assert isinstance(response, str)
    assert len(response) > 0

@pytest.mark.asyncio
async def test_generate_json():
    """Test JSON generation."""
    prompt = """Generate a simple NPC. Return JSON with fields: name, role, personality"""
    response = await claude_service.generate_json(prompt=prompt)
    assert isinstance(response, dict)
    assert "name" in response

@pytest.mark.asyncio
async def test_campaign_generation():
    """Test campaign lore generation."""
    # This would need a test database setup
    pass
```

---

## 9. Rate Limiting & Cost Control

**app/utils/rate_limiter.py:**
```python
from datetime import datetime, timedelta
from typing import Optional
import asyncio

class RateLimiter:
    def __init__(self, requests_per_minute: int = 10):
        self.requests_per_minute = requests_per_minute
        self.requests = []

    async def check_rate_limit(self, user_id: str) -> tuple[bool, Optional[str]]:
        """Check if user has exceeded rate limit."""
        now = datetime.utcnow()
        cutoff = now - timedelta(minutes=1)

        # Remove old requests
        self.requests = [
            r for r in self.requests
            if r["timestamp"] > cutoff and r["user_id"] == user_id
        ]

        if len(self.requests) >= self.requests_per_minute:
            return False, "Rate limit exceeded. Please wait before generating more content."

        self.requests.append({"user_id": user_id, "timestamp": now})
        return True, None

rate_limiter = RateLimiter()
```

---

## 10. Prompt Versioning & A/B Testing

**app/services/prompt_versions.py:**
```python
from enum import Enum
from typing import Dict

class PromptVersion(str, Enum):
    V1 = "v1"  # Initial prompts
    V2 = "v2"  # Refined prompts
    V3 = "v3"  # Latest iteration

PROMPT_TEMPLATES = {
    PromptVersion.V1: {
        # ... V1 prompts
    },
    PromptVersion.V2: {
        # ... V2 prompts (improved, more detailed)
    },
    PromptVersion.V3: {
        # ... V3 prompts (latest, best performing)
    }
}

class PromptManager:
    @staticmethod
    def get_prompt_template(prompt_type: str, version: PromptVersion = PromptVersion.V3):
        """Get a specific prompt template version."""
        return PROMPT_TEMPLATES[version].get(prompt_type)
```

---

## 11. Frontend Integration

**frontend/src/services/generationService.js:**
```javascript
import api from './api';

export const generationService = {
  generateLore: async (campaignId) => {
    const response = await api.post('/generate/lore', {
      campaign_id: campaignId,
      force_regenerate: false,
    });
    return response.data;
  },

  generateNPCs: async (campaignId, role, archetype, count = 1) => {
    const response = await api.post('/generate/npcs', {
      campaign_id: campaignId,
      role,
      archetype,
      count,
    });
    return response.data;
  },

  generateScenario: async (campaignId, partyLevel, partyComposition) => {
    const response = await api.post('/generate/scenario', {
      campaign_id: campaignId,
      party_level: partyLevel,
      party_composition: partyComposition,
    });
    return response.data;
  },

  generateBackgrounds: async (campaignId, playerCount) => {
    const response = await api.post('/generate/backgrounds', {
      campaign_id: campaignId,
      player_count: playerCount,
    });
    return response.data;
  },
};
```

---

## 12. Environment Configuration

**Update .env:**
```
# Claude API
CLAUDE_API_KEY=sk-ant-... # Get from https://console.anthropic.com
CLAUDE_MODEL=claude-3-5-sonnet-20241022
CLAUDE_MAX_TOKENS=2000
CLAUDE_TEMPERATURE=0.8
CLAUDE_TIMEOUT=60
```

---

## 13. Implementation Checklist

### Backend
- [ ] Claude API integration (ClaudeService)
- [ ] Prompt templates for all content types
- [ ] Campaign lore generation service
- [ ] NPC generation service
- [ ] Scenario generation service
- [ ] Player background generation service
- [ ] /generate endpoints (lore, npcs, scenario, backgrounds)
- [ ] Generated content logging (audit trail)
- [ ] Rate limiting implementation
- [ ] Error handling and validation
- [ ] Tests for LLM services

### Frontend
- [ ] Generation service integration
- [ ] Campaign lore display component
- [ ] NPC list and generation UI
- [ ] Scenario preview component
- [ ] Background generation workflow
- [ ] Loading states during generation
- [ ] Error handling and user feedback
- [ ] Display AI-generated content beautifully

### Database
- [ ] GeneratedContent model and table
- [ ] Migration for generated_content table
- [ ] Indexes for campaign_id and type

---

## 14. Success Criteria

- Claude API successfully integrates and generates content
- All content generation endpoints working
- Generated content meets D&D quality standards
- Rate limiting prevents excessive API calls
- Content properly validated before storage
- Frontend displays generated content
- Error messages helpful and user-friendly
- Generation time < 30 seconds per item
- Cost monitoring in place

---

## 15. Next Phase

Upon completion of Phase 2, proceed to **Phase 3: Content Generation** for map/token generation and Foundry-compatible asset creation.
