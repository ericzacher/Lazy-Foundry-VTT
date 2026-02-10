# Phase 5: Session Results & Continuity - Session Tracking & Campaign Persistence

**Duration:** 2-3 weeks
**Goal:** Implement session result capture, summarization, and continuity-aware content generation

**Dependencies:** Phase 1-4 complete (all systems running)

---

## 1. Overview

Phase 5 focuses on:
- Session result capture and logging
- AI-powered session summarization
- NPC state tracking across sessions
- World state changes documentation
- Continuity-aware scenario generation
- Campaign timeline management
- Unresolved plot thread tracking

---

## 2. Session Result Models

### 2.1 Enhanced Session Result Model

**app/models/session_result.py (Updated):**
```python
from sqlalchemy import Column, String, Text, ForeignKey, JSON, DateTime, Integer, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from enum import Enum
from app.models.base import BaseModel

class SessionResult(BaseModel):
    __tablename__ = "session_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id"), nullable=False, unique=True)

    # Core result data
    summary = Column(Text, nullable=True)  # AI or DM summary
    duration_minutes = Column(Integer, nullable=True)

    # Structured event tracking
    events = Column(JSON, nullable=True)  # List of key events
    npc_interactions = Column(JSON, nullable=True)  # How NPCs reacted
    player_decisions = Column(JSON, nullable=True)  # Key player choices
    combat_summary = Column(JSON, nullable=True)  # Combat outcomes

    # World state changes
    world_changes = Column(JSON, nullable=True)  # How world changed
    location_updates = Column(JSON, nullable=True)  # Location-specific changes
    faction_relations = Column(JSON, nullable=True)  # Faction relationship changes

    # Story continuity
    plot_advancement = Column(Text, nullable=True)  # How main plot advanced
    unfinished_threads = Column(JSON, nullable=True)  # Plot hooks for next session
    loose_ends = Column(JSON, nullable=True)  # Things that need resolution

    # Character tracking
    character_development = Column(JSON, nullable=True)  # Character growth/changes
    npc_status_changes = Column(JSON, nullable=True)  # NPC alignment/status changes

    # Session metadata
    xp_awarded = Column(Integer, nullable=True)
    loot_awarded = Column(JSON, nullable=True)
    death_count = Column(Integer, default=0)

    # Capture method
    capture_method = Column(String(50))  # "manual", "transcribed", "auto_logged"
    transcript = Column(Text, nullable=True)  # Raw session transcript if available

    # Emotional/Meta
    highlights = Column(JSON, nullable=True)  # Player-reported highlights
    mood = Column(String(50), nullable=True)  # e.g., "intense", "comedic", "dramatic"

    session = relationship("Session", back_populates="results")
```

### 2.2 NPC State History

**app/models/npc_history.py:**
```python
from sqlalchemy import Column, String, Text, ForeignKey, JSON, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from app.models.base import BaseModel

class NPCHistory(BaseModel):
    """Track how NPCs change over time."""
    __tablename__ = "npc_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    npc_id = Column(UUID(as_uuid=True), ForeignKey("npcs.id"), nullable=False)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id"), nullable=False)

    # What changed
    alignment_before = Column(String(50), nullable=True)
    alignment_after = Column(String(50), nullable=True)

    loyalty_before = Column(String(50), nullable=True)  # e.g., "neutral", "ally", "enemy"
    loyalty_after = Column(String(50), nullable=True)

    status_before = Column(String(100), nullable=True)  # e.g., "alive", "captured", "dead"
    status_after = Column(String(100), nullable=True)

    relationship_change = Column(Text, nullable=True)  # How relationship changed
    events_involved = Column(JSON, nullable=True)  # List of events this NPC was in

    npc = relationship("NPC")
    session = relationship("Session")
```

### 2.3 Campaign Timeline

**app/models/campaign_timeline.py:**
```python
from sqlalchemy import Column, String, Text, ForeignKey, JSON, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from app.models.base import BaseModel

class TimelineEvent(BaseModel):
    """Track major campaign events on a timeline."""
    __tablename__ = "timeline_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("campaigns.id"), nullable=False)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id"), nullable=True)

    event_date = Column(String(100), nullable=False)  # In-game date
    session_number = Column(Integer, nullable=True)

    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    event_type = Column(String(50))  # "combat", "dialogue", "discovery", "death", etc.

    significance = Column(String(50))  # "minor", "major", "critical"
    people_involved = Column(JSON, nullable=True)  # List of NPC/PC names
    locations = Column(JSON, nullable=True)  # List of locations

    campaign = relationship("Campaign")
    session = relationship("Session")
```

---

## 3. Session Result Capture Service

### 3.1 Result Capture Service

**app/services/session_result_service.py:**
```python
from app.models.session_result import SessionResult
from app.models.npc_history import NPCHistory
from app.models.campaign_timeline import TimelineEvent
from app.models.session import Session
from app.models.npc import NPC
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID
from datetime import datetime
from typing import Dict, List, Optional, Any
import json

class SessionResultService:
    """Service for capturing and managing session results."""

    async def create_session_result(
        self,
        session_id: UUID,
        db: AsyncSession,
        result_data: Dict[str, Any] = None
    ) -> SessionResult:
        """Create a new session result entry."""
        result_obj = SessionResult(
            session_id=session_id,
            capture_method="manual",
            **(result_data or {})
        )

        db.add(result_obj)
        await db.flush()
        return result_obj

    async def update_session_result(
        self,
        session_id: UUID,
        result_data: Dict[str, Any],
        db: AsyncSession
    ) -> SessionResult:
        """Update session result with captured data."""
        # Fetch existing result
        query_result = await db.execute(
            select(SessionResult).where(SessionResult.session_id == session_id)
        )
        result_obj = query_result.scalars().first()

        if not result_obj:
            result_obj = await self.create_session_result(session_id, db)

        # Update fields
        for field, value in result_data.items():
            if hasattr(result_obj, field):
                setattr(result_obj, field, value)

        result_obj.updated_at = datetime.utcnow()
        await db.flush()
        return result_obj

    async def track_npc_changes(
        self,
        npc_id: UUID,
        session_id: UUID,
        changes: Dict[str, Any],
        db: AsyncSession
    ) -> NPCHistory:
        """Record how an NPC changed during a session."""
        history = NPCHistory(
            npc_id=npc_id,
            session_id=session_id,
            **changes
        )

        db.add(history)
        await db.flush()
        return history

    async def get_npc_status(
        self,
        npc_id: UUID,
        session_id: UUID = None,
        db: AsyncSession = None
    ) -> Dict[str, Any]:
        """Get current status of an NPC after a specific session (or latest)."""
        # Get NPC
        npc_result = await db.execute(
            select(NPC).where(NPC.id == npc_id)
        )
        npc = npc_result.scalars().first()

        if not npc:
            return None

        # Get latest history entry
        query_result = await db.execute(
            select(NPCHistory)
            .where(NPCHistory.npc_id == npc_id)
            .order_by(NPCHistory.created_at.desc())
            .limit(1)
        )
        latest_history = query_result.scalars().first()

        status = {
            "npc_id": str(npc_id),
            "name": npc.name,
            "alignment": latest_history.alignment_after if latest_history else None,
            "loyalty": latest_history.loyalty_after if latest_history else None,
            "status": latest_history.status_after if latest_history else "alive",
            "relationship_summary": latest_history.relationship_change if latest_history else None,
        }

        return status

    async def add_timeline_event(
        self,
        campaign_id: UUID,
        session_id: UUID,
        event_data: Dict[str, Any],
        db: AsyncSession
    ) -> TimelineEvent:
        """Add a major event to campaign timeline."""
        # Get session number
        session_result = await db.execute(
            select(Session).where(Session.id == session_id)
        )
        session = session_result.scalars().first()

        timeline_event = TimelineEvent(
            campaign_id=campaign_id,
            session_id=session_id,
            session_number=session.session_number if session else None,
            **event_data
        )

        db.add(timeline_event)
        await db.flush()
        return timeline_event

    async def get_campaign_summary(
        self,
        campaign_id: UUID,
        up_to_session: int = None,
        db: AsyncSession = None
    ) -> Dict[str, Any]:
        """Get comprehensive campaign summary up to a specific session."""
        # Get all sessions up to point
        sessions_result = await db.execute(
            select(Session)
            .where(Session.campaign_id == campaign_id)
            .order_by(Session.session_number)
        )
        sessions = sessions_result.scalars().all()

        if up_to_session:
            sessions = [s for s in sessions if s.session_number <= up_to_session]

        # Get timeline events
        timeline_result = await db.execute(
            select(TimelineEvent)
            .where(TimelineEvent.campaign_id == campaign_id)
            .order_by(TimelineEvent.session_number)
        )
        timeline = timeline_result.scalars().all()

        if up_to_session:
            timeline = [t for t in timeline if t.session_number and t.session_number <= up_to_session]

        # Get NPC status history
        npcs_result = await db.execute(
            select(NPC).where(NPC.campaign_id == campaign_id)
        )
        npcs = npcs_result.scalars().all()

        npc_statuses = {}
        for npc in npcs:
            status = await self.get_npc_status(npc.id, None, db)
            npc_statuses[npc.name] = status

        summary = {
            "sessions_completed": len([s for s in sessions if s.status == "completed"]),
            "total_sessions": len(sessions),
            "timeline_events": [
                {
                    "session": t.session_number,
                    "title": t.title,
                    "description": t.description,
                    "type": t.event_type,
                    "significance": t.significance
                }
                for t in timeline
            ],
            "npc_statuses": npc_statuses,
            "major_plot_points": [
                event for event in timeline if event.significance == "critical"
            ]
        }

        return summary

session_result_service = SessionResultService()
```

---

## 4. Session Summarization Service

### 4.1 AI Session Summarization

**app/services/session_summarization_service.py:**
```python
from app.services.llm_service import claude_service
from app.services.prompts import SYSTEM_PROMPTS
from app.models.session_result import SessionResult
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
import json

SUMMARIZATION_PROMPT = """You are a Dungeon Master documenting a D&D 5e session. Analyze the following session transcript or description and provide:

**Session Content:**
{session_content}

**Party Composition:**
{party_composition}

**Campaign Context:**
{campaign_context}

Provide analysis as JSON with:
1. "summary": 2-3 sentence executive summary
2. "key_events": 3-5 major events that occurred
3. "npc_interactions": Object with NPC names and how they changed
4. "player_decisions": List of important player choices
5. "world_changes": How the world/setting was affected
6. "plot_advancement": How main storyline advanced
7. "unresolved_threads": Plot hooks for next session
8. "highlights": Player-memorable moments
9. "mood": Overall session tone (intense, comedic, dramatic, etc.)
10. "loose_ends": Things that need resolution"""

class SessionSummarizationService:
    async def auto_summarize_session(
        self,
        session_id: UUID,
        transcript: str,
        campaign_context: str,
        party_composition: str,
        db: AsyncSession = None
    ) -> dict:
        """
        Automatically summarize a session using AI.
        """
        prompt = SUMMARIZATION_PROMPT.format(
            session_content=transcript,
            party_composition=party_composition,
            campaign_context=campaign_context
        )

        summary = await claude_service.generate_json(
            prompt=prompt,
            system_prompt=SYSTEM_PROMPTS.get("dm", ""),
            max_tokens=3000,
            temperature=0.7
        )

        return summary

    async def save_summary_to_session(
        self,
        session_id: UUID,
        summary_data: dict,
        db: AsyncSession
    ) -> SessionResult:
        """Save AI-generated summary to session result."""
        from app.models.session_result import SessionResult
        from sqlalchemy.future import select

        result = await db.execute(
            select(SessionResult).where(SessionResult.session_id == session_id)
        )
        session_result = result.scalars().first()

        if not session_result:
            from app.services.session_result_service import session_result_service
            session_result = await session_result_service.create_session_result(
                session_id, db
            )

        # Update with summary data
        session_result.summary = summary_data.get("summary")
        session_result.events = summary_data.get("key_events", [])
        session_result.npc_interactions = summary_data.get("npc_interactions", {})
        session_result.player_decisions = summary_data.get("player_decisions", [])
        session_result.world_changes = summary_data.get("world_changes", {})
        session_result.plot_advancement = summary_data.get("plot_advancement")
        session_result.unfinished_threads = summary_data.get("unresolved_threads", [])
        session_result.mood = summary_data.get("mood")
        session_result.highlights = summary_data.get("highlights", [])

        await db.flush()
        return session_result

    async def create_continuity_context(
        self,
        campaign_id: UUID,
        up_to_session: int = None,
        db: AsyncSession = None
    ) -> str:
        """Create context string for continuity-aware generation."""
        from app.services.session_result_service import session_result_service

        summary = await session_result_service.get_campaign_summary(
            campaign_id,
            up_to_session,
            db
        )

        context = f"""
**Campaign Progress Summary:**

Sessions Completed: {summary['sessions_completed']} / {summary['total_sessions']}

**Timeline of Major Events:**
{json.dumps(summary['timeline_events'], indent=2)}

**NPC Status:**
{json.dumps(summary['npc_statuses'], indent=2)}

**Major Plot Points:**
{json.dumps(summary['major_plot_points'], indent=2)}
"""
        return context

session_summarization_service = SessionSummarizationService()
```

---

## 5. Continuity-Aware Generation

### 5.1 Update Scenario Generation with Continuity

**Update app/services/scenario_generation_service.py:**
```python
# Add continuity-aware scenario generation

CONTINUITY_SCENARIO_PROMPT = """You are a Dungeon Master creating the next session in an ongoing D&D 5e campaign.

**Campaign Context:**
{campaign_context}

**Previous Sessions Summary:**
{previous_sessions_summary}

**NPC Status:**
{npc_status}

**Unresolved Plot Threads:**
{unresolved_threads}

**Party Level:** {party_level}
**Party Composition:** {party_composition}

**Session Request:** {session_description}

Create a scenario that:
1. Naturally continues from where the last session left off
2. Respects NPC relationships and status changes
3. Builds on unresolved plot threads
4. Reflects world changes from previous sessions
5. Offers multiple paths forward while maintaining continuity

Provide as JSON:
1. "title": Session title
2. "overview": What this session is about
3. "connection_to_previous": How this connects to past events
4. "npc_involvement": Which NPCs return and how they've changed
5. "plot_progression": How this advances the main story
6. "key_scenes": 3-4 major scenes
7. "potential_complications": What could go wrong
8. "setup_for_next": What hooks this sets up for future sessions"""

class ContinuityAwareScenarioService:
    async def generate_continuity_scenario(
        self,
        campaign_id: UUID,
        session_description: str,
        party_level: int,
        party_composition: str,
        db: AsyncSession = None
    ) -> dict:
        """Generate scenario aware of previous sessions."""
        from app.services.session_summarization_service import session_summarization_service
        from app.services.session_result_service import session_result_service
        from app.models.campaign import Campaign
        from sqlalchemy.future import select

        # Get campaign
        campaign_result = await db.execute(
            select(Campaign).where(Campaign.id == campaign_id)
        )
        campaign = campaign_result.scalars().first()

        # Get continuity context
        continuity_context = await session_summarization_service.create_continuity_context(
            campaign_id,
            db=db
        )

        # Get current NPC statuses
        summary = await session_result_service.get_campaign_summary(campaign_id, db=db)
        npc_status = json.dumps(summary.get("npc_statuses", {}), indent=2)

        # Get unresolved threads
        latest_result = await db.execute(
            select(SessionResult)
            .join(Session)
            .where(Session.campaign_id == campaign_id)
            .order_by(Session.session_number.desc())
            .limit(1)
        )
        latest_session_result = latest_result.scalars().first()
        unresolved_threads = json.dumps(
            latest_session_result.unfinished_threads if latest_session_result else [],
            indent=2
        )

        # Generate scenario
        prompt = CONTINUITY_SCENARIO_PROMPT.format(
            campaign_context=continuity_context,
            previous_sessions_summary=campaign.name,  # Simplified
            npc_status=npc_status,
            unresolved_threads=unresolved_threads,
            party_level=party_level,
            party_composition=party_composition,
            session_description=session_description
        )

        scenario = await claude_service.generate_json(
            prompt=prompt,
            system_prompt=SYSTEM_PROMPTS.get("dm", ""),
            max_tokens=3000,
            temperature=0.8
        )

        return scenario

continuity_scenario_service = ContinuityAwareScenarioService()
```

---

## 6. API Endpoints

### 6.1 Session Result Endpoints

**app/routers/sessions.py (Updated):**
```python
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID

from app.db.database import get_db
from app.dependencies import get_current_user
from app.models.session import Session
from app.models.campaign import Campaign
from app.models.user import User
from app.schemas.session import SessionUpdate
from app.services.session_result_service import session_result_service
from app.services.session_summarization_service import session_summarization_service

router = APIRouter()

class SessionResultRequest(BaseModel):
    summary: str = None
    duration_minutes: int = None
    events: list[str] = None
    npc_interactions: dict = None
    player_decisions: list[str] = None
    world_changes: dict = None
    plot_advancement: str = None
    unfinished_threads: list[str] = None
    highlights: list[str] = None
    mood: str = None
    xp_awarded: int = None
    loot_awarded: list[str] = None

class AutoSummarizeRequest(BaseModel):
    transcript: str
    party_composition: str = "Mixed party"

@router.post("/sessions/{session_id}/results")
async def save_session_results(
    session_id: UUID,
    result_data: SessionResultRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Save session results."""
    # Verify ownership
    result = await db.execute(
        select(Session)
        .join(Campaign)
        .where((Session.id == session_id) & (Campaign.user_id == current_user.id))
    )
    if not result.scalars().first():
        raise HTTPException(status_code=404, detail="Session not found")

    # Update session result
    session_result = await session_result_service.update_session_result(
        session_id,
        result_data.model_dump(exclude_none=True),
        db
    )

    await db.commit()
    return {"success": True, "result": session_result}

@router.post("/sessions/{session_id}/auto-summarize")
async def auto_summarize_session(
    session_id: UUID,
    request: AutoSummarizeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Automatically summarize a session transcript."""
    # Verify ownership
    session_result = await db.execute(
        select(Session)
        .join(Campaign)
        .where((Session.id == session_id) & (Campaign.user_id == current_user.id))
    )
    if not session_result.scalars().first():
        raise HTTPException(status_code=404, detail="Session not found")

    # Get campaign context
    campaign_result = await db.execute(
        select(Campaign)
        .join(Session)
        .where(Session.id == session_id)
    )
    campaign = campaign_result.scalars().first()

    # Summarize
    summary = await session_summarization_service.auto_summarize_session(
        session_id,
        request.transcript,
        campaign.description or "",
        request.party_composition,
        db
    )

    # Save summary
    await session_summarization_service.save_summary_to_session(
        session_id,
        summary,
        db
    )

    await db.commit()
    return {"success": True, "summary": summary}

@router.get("/campaigns/{campaign_id}/summary")
async def get_campaign_summary(
    campaign_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive campaign summary."""
    # Verify ownership
    campaign_result = await db.execute(
        select(Campaign).where(
            (Campaign.id == campaign_id) &
            (Campaign.user_id == current_user.id)
        )
    )
    if not campaign_result.scalars().first():
        raise HTTPException(status_code=404, detail="Campaign not found")

    summary = await session_result_service.get_campaign_summary(
        campaign_id,
        db=db
    )

    return {"success": True, "summary": summary}
```

---

## 7. Database Migrations

**alembic/versions/004_add_session_results.py:**
```python
"""Add session results and continuity tracking

Revision ID: 004
Create Date: 2024-01-04 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None

def upgrade():
    # Update session_results table
    op.add_column('session_results', sa.Column('duration_minutes', sa.Integer))
    op.add_column('session_results', sa.Column('combat_summary', postgresql.JSON))
    op.add_column('session_results', sa.Column('location_updates', postgresql.JSON))
    op.add_column('session_results', sa.Column('faction_relations', postgresql.JSON))
    op.add_column('session_results', sa.Column('character_development', postgresql.JSON))
    op.add_column('session_results', sa.Column('npc_status_changes', postgresql.JSON))
    op.add_column('session_results', sa.Column('xp_awarded', sa.Integer))
    op.add_column('session_results', sa.Column('loot_awarded', postgresql.JSON))
    op.add_column('session_results', sa.Column('death_count', sa.Integer, default=0))
    op.add_column('session_results', sa.Column('capture_method', sa.String(50)))
    op.add_column('session_results', sa.Column('transcript', sa.Text))
    op.add_column('session_results', sa.Column('highlights', postgresql.JSON))
    op.add_column('session_results', sa.Column('mood', sa.String(50)))

    # Create npc_history table
    op.create_table(
        'npc_history',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('npc_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('npcs.id')),
        sa.Column('session_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('sessions.id')),
        sa.Column('alignment_before', sa.String(50)),
        sa.Column('alignment_after', sa.String(50)),
        sa.Column('loyalty_before', sa.String(50)),
        sa.Column('loyalty_after', sa.String(50)),
        sa.Column('status_before', sa.String(100)),
        sa.Column('status_after', sa.String(100)),
        sa.Column('relationship_change', sa.Text),
        sa.Column('events_involved', postgresql.JSON),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now()),
    )

    # Create timeline_events table
    op.create_table(
        'timeline_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('campaign_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('campaigns.id')),
        sa.Column('session_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('sessions.id'), nullable=True),
        sa.Column('event_date', sa.String(100)),
        sa.Column('session_number', sa.Integer),
        sa.Column('title', sa.String(255)),
        sa.Column('description', sa.Text),
        sa.Column('event_type', sa.String(50)),
        sa.Column('significance', sa.String(50)),
        sa.Column('people_involved', postgresql.JSON),
        sa.Column('locations', postgresql.JSON),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now()),
    )

def downgrade():
    op.drop_table('timeline_events')
    op.drop_table('npc_history')

    op.drop_column('session_results', 'mood')
    op.drop_column('session_results', 'highlights')
    op.drop_column('session_results', 'transcript')
    op.drop_column('session_results', 'capture_method')
    op.drop_column('session_results', 'death_count')
    op.drop_column('session_results', 'loot_awarded')
    op.drop_column('session_results', 'xp_awarded')
    op.drop_column('session_results', 'npc_status_changes')
    op.drop_column('session_results', 'character_development')
    op.drop_column('session_results', 'faction_relations')
    op.drop_column('session_results', 'location_updates')
    op.drop_column('session_results', 'combat_summary')
    op.drop_column('session_results', 'duration_minutes')
```

---

## 8. Frontend Components

**frontend/src/components/session/SessionResults.jsx:**
```jsx
import { useState } from 'react';
import { sessionService } from '../../services/sessionService';
import { generationService } from '../../services/generationService';

export function SessionResults({ sessionId, campaignId }) {
  const [results, setResults] = useState({
    summary: '',
    events: [],
    npc_interactions: {},
    player_decisions: [],
    world_changes: {},
    plot_advancement: '',
    unfinished_threads: [],
    highlights: [],
    mood: '',
  });

  const [transcript, setTranscript] = useState('');
  const [autoSummarizing, setAutoSummarizing] = useState(false);

  const handleAutoSummarize = async () => {
    setAutoSummarizing(true);
    try {
      const summary = await sessionService.autoSummarizeSession(sessionId, transcript);
      setResults(summary);
    } catch (error) {
      console.error('Failed to summarize:', error);
    } finally {
      setAutoSummarizing(false);
    }
  };

  const handleSave = async () => {
    try {
      await sessionService.saveResults(sessionId, results);
      alert('Results saved!');
    } catch (error) {
      console.error('Failed to save results:', error);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Session Results</h2>

      <div className="border rounded p-4">
        <h3 className="font-bold">Transcript/Session Log</h3>
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Paste session transcript or notes here..."
          className="w-full p-2 border rounded mt-2"
          rows={6}
        />
        <button
          onClick={handleAutoSummarize}
          disabled={autoSummarizing || !transcript}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {autoSummarizing ? 'Summarizing...' : 'Auto-Summarize with AI'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded p-4">
          <label className="font-bold">Summary</label>
          <textarea
            value={results.summary}
            onChange={(e) => setResults({...results, summary: e.target.value})}
            className="w-full p-2 border rounded mt-2"
            rows={4}
          />
        </div>

        <div className="border rounded p-4">
          <label className="font-bold">Mood</label>
          <select
            value={results.mood}
            onChange={(e) => setResults({...results, mood: e.target.value})}
            className="w-full p-2 border rounded mt-2"
          >
            <option>Select mood...</option>
            <option value="intense">Intense</option>
            <option value="comedic">Comedic</option>
            <option value="dramatic">Dramatic</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>
      </div>

      <button
        onClick={handleSave}
        className="px-4 py-2 bg-green-600 text-white rounded"
      >
        Save Session Results
      </button>
    </div>
  );
}
```

**frontend/src/components/campaign/CampaignTimeline.jsx:**
```jsx
import { useEffect, useState } from 'react';
import { campaignService } from '../../services/campaignService';

export function CampaignTimeline({ campaignId }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSummary();
  }, [campaignId]);

  const loadSummary = async () => {
    try {
      const data = await campaignService.getSummary(campaignId);
      setSummary(data.summary);
    } catch (error) {
      console.error('Failed to load summary:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Campaign Timeline</h2>

      {summary && (
        <>
          <div className="bg-blue-50 p-4 rounded">
            <p className="text-sm">
              Sessions Completed: {summary.sessions_completed} / {summary.total_sessions}
            </p>
          </div>

          <div className="space-y-2">
            {summary.timeline_events.map((event, idx) => (
              <div key={idx} className="border-l-4 border-blue-600 pl-4 py-2">
                <h4 className="font-bold">{event.title}</h4>
                <p className="text-sm text-gray-600">Session {event.session}: {event.type}</p>
                <p className="text-sm">{event.description}</p>
              </div>
            ))}
          </div>

          <div className="border rounded p-4">
            <h3 className="font-bold">NPC Status</h3>
            <div className="mt-2 space-y-1 text-sm">
              {Object.entries(summary.npc_statuses).map(([name, status]) => (
                <p key={name}>
                  {name}: {status.status} - {status.loyalty}
                </p>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
```

---

## 9. Implementation Checklist

### Backend
- [ ] SessionResult model enhancements
- [ ] NPCHistory tracking model
- [ ] TimelineEvent model
- [ ] SessionResultService
- [ ] SessionSummarizationService
- [ ] ContinuityAwareScenarioService
- [ ] Session result endpoints
- [ ] Auto-summarize endpoint
- [ ] Campaign summary endpoint
- [ ] Database migrations for new tables

### Frontend
- [ ] SessionResults component
- [ ] CampaignTimeline component
- [ ] Auto-summarize UI
- [ ] Results form with all fields
- [ ] Timeline visualization
- [ ] NPC status tracking display

### Integration
- [ ] Update scenario generation to use continuity context
- [ ] Link session results to next session generation
- [ ] NPC status changes reflected in future encounters

---

## 10. Success Criteria

- Session results can be captured manually or auto-summarized
- AI summarization extracts key events and changes
- NPC status tracked across sessions
- Campaign timeline displays major events
- Scenario generation aware of previous events
- Continuity prompts include campaign context
- Campaign summary accurate and accessible
- All new tables created and migrated

---

## 11. Next Phase

Upon completion of Phase 5, proceed to **Phase 6: Polish & Enhancement** for UI/UX improvements and optional features.
