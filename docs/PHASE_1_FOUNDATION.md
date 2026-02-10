# Phase 1: Foundation - Project Setup & Core Infrastructure

**Duration:** 2-3 weeks
**Goal:** Establish the project scaffold, database, authentication, and basic campaign/session management

---

## 1. Overview

Phase 1 establishes the foundational architecture:
- Docker Compose multi-service setup
- FastAPI backend scaffold
- PostgreSQL database with schema
- JWT authentication system
- React frontend scaffold
- Basic CRUD operations for campaigns and sessions
- Database migrations system

---

## 2. Technology Stack (Phase 1)

### Backend
- **Framework:** FastAPI 0.104+
- **Python:** 3.10+
- **ORM:** SQLAlchemy 2.0 with async support
- **Database Driver:** asyncpg (PostgreSQL async)
- **Authentication:** PyJWT, python-jose, passlib
- **Validation:** Pydantic v2
- **HTTP Client:** httpx (async)
- **Migration:** Alembic

### Database
- **PostgreSQL:** 15+
- **Connection Pooling:** SQLAlchemy asyncpg

### Frontend
- **Framework:** React 18+
- **Build Tool:** Vite
- **State Management:** Redux Toolkit or Context API
- **Styling:** Tailwind CSS
- **HTTP Client:** Axios

### Infrastructure
- **Containerization:** Docker & Docker Compose
- **Reverse Proxy:** Nginx (optional, for Phase 1 can skip)

---

## 3. Project Structure

```
lazy-foundry-vtt/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI app instance
│   │   ├── config.py               # Configuration & environment
│   │   ├── dependencies.py         # Dependency injection
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── campaign.py         # Campaign SQLAlchemy models
│   │   │   ├── session.py          # Session models
│   │   │   ├── user.py             # User models
│   │   │   └── base.py             # Base model class
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── campaign.py         # Campaign Pydantic schemas
│   │   │   ├── session.py          # Session schemas
│   │   │   ├── user.py             # User schemas
│   │   │   └── common.py           # Common/shared schemas
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py             # Authentication endpoints
│   │   │   ├── campaigns.py        # Campaign endpoints
│   │   │   ├── sessions.py         # Session endpoints
│   │   │   └── health.py           # Health check endpoint
│   │   ├── db/
│   │   │   ├── __init__.py
│   │   │   ├── database.py         # Database setup & session
│   │   │   └── base.py             # Declarative base
│   │   └── utils/
│   │       ├── __init__.py
│   │       ├── security.py         # JWT/password utilities
│   │       └── errors.py           # Custom exceptions
│   ├── alembic/
│   │   ├── env.py
│   │   ├── script.py.mako
│   │   └── versions/               # Migration files
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py             # Pytest fixtures
│   │   ├── test_auth.py
│   │   ├── test_campaigns.py
│   │   └── test_sessions.py
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── .env.example
│   └── alembic.ini
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── Layout.jsx
│   │   │   ├── auth/
│   │   │   │   ├── LoginForm.jsx
│   │   │   │   └── RegisterForm.jsx
│   │   │   ├── campaigns/
│   │   │   │   ├── CampaignList.jsx
│   │   │   │   ├── CampaignForm.jsx
│   │   │   │   └── CampaignDetail.jsx
│   │   │   └── sessions/
│   │   │       ├── SessionList.jsx
│   │   │       ├── SessionForm.jsx
│   │   │       └── SessionDetail.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── CampaignsPage.jsx
│   │   │   ├── SessionsPage.jsx
│   │   │   └── NotFound.jsx
│   │   ├── services/
│   │   │   ├── api.js             # Axios instance & interceptors
│   │   │   ├── authService.js
│   │   │   ├── campaignService.js
│   │   │   └── sessionService.js
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   └── useApi.js
│   │   ├── store/
│   │   │   ├── store.js           # Redux store
│   │   │   ├── slices/
│   │   │   │   ├── authSlice.js
│   │   │   │   ├── campaignSlice.js
│   │   │   │   └── sessionSlice.js
│   │   └── styles/
│   │       └── globals.css
│   ├── public/
│   ├── package.json
│   ├── vite.config.js
│   ├── .env.example
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
├── PLANNING.md
└── docs/
    └── PHASE_1_FOUNDATION.md
```

---

## 4. Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ${DB_NAME:-lazy_foundry}
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-postgres}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql+asyncpg://${DB_USER:-postgres}:${DB_PASSWORD:-postgres}@db:5432/${DB_NAME:-lazy_foundry}
      JWT_SECRET: ${JWT_SECRET:-your-secret-key-change-in-production}
      API_TITLE: Lazy Foundry VTT
      API_VERSION: 0.1.0
    ports:
      - "8000:8000"
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - ./backend:/app
      - assets:/assets
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  web:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    environment:
      VITE_API_URL: http://localhost:8000
    ports:
      - "5173:5173"
    volumes:
      - ./frontend/src:/app/src
    depends_on:
      - api

volumes:
  postgres_data:
  assets:
```

---

## 5. Backend Implementation

### 5.1 FastAPI Application Structure

**app/main.py:**
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.db.database import init_db
from app.routers import auth, campaigns, sessions, health

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    yield
    # Shutdown
    pass

app = FastAPI(
    title="Lazy Foundry VTT API",
    description="AI-powered Foundry VTT campaign generator",
    version="0.1.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "${FRONTEND_URL}"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api/health", tags=["health"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(campaigns.router, prefix="/api/campaigns", tags=["campaigns"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["sessions"])
```

### 5.2 Database Models

**app/models/base.py:**
```python
from sqlalchemy import Column, DateTime, func
from sqlalchemy.orm import declarative_base
from datetime import datetime

Base = declarative_base()

class BaseModel(Base):
    __abstract__ = True

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
```

**app/models/user.py:**
```python
from sqlalchemy import Column, String, Boolean
from sqlalchemy.dialects.postgresql import UUID
import uuid
from app.models.base import BaseModel

class User(BaseModel):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
```

**app/models/campaign.py:**
```python
from sqlalchemy import Column, String, Text, Integer, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from app.models.base import BaseModel

class Campaign(BaseModel):
    __tablename__ = "campaigns"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    setting = Column(String(255), nullable=True)
    theme = Column(String(255), nullable=True)
    tone = Column(String(255), nullable=True)
    player_count = Column(Integer, nullable=True)
    world_lore = Column(JSON, nullable=True)  # AI-generated lore
    rules = Column(JSON, nullable=True)       # House rules, etc.

    user = relationship("User")
    sessions = relationship("Session", back_populates="campaign")
```

**app/models/session.py:**
```python
from sqlalchemy import Column, String, Text, Integer, ForeignKey, JSON, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from enum import Enum
from app.models.base import BaseModel

class SessionStatus(str, Enum):
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"

class Session(BaseModel):
    __tablename__ = "sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("campaigns.id"), nullable=False)
    session_number = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(SQLEnum(SessionStatus), default=SessionStatus.PLANNED)
    scenario = Column(JSON, nullable=True)    # Generated scenario

    campaign = relationship("Campaign", back_populates="sessions")
    results = relationship("SessionResult", back_populates="session", uselist=False)
```

**app/models/session_result.py:**
```python
from sqlalchemy import Column, String, Text, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from app.models.base import BaseModel

class SessionResult(BaseModel):
    __tablename__ = "session_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id"), nullable=False, unique=True)
    summary = Column(Text, nullable=True)
    events = Column(JSON, nullable=True)  # List of key events
    npc_interactions = Column(JSON, nullable=True)
    player_decisions = Column(JSON, nullable=True)
    world_changes = Column(JSON, nullable=True)
    unfinished_threads = Column(JSON, nullable=True)  # Plot hooks for next session

    session = relationship("Session", back_populates="results")
```

### 5.3 Pydantic Schemas

**app/schemas/campaign.py:**
```python
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime
from typing import Any

class CampaignBase(BaseModel):
    name: str
    description: Optional[str] = None
    setting: Optional[str] = None
    theme: Optional[str] = None
    tone: Optional[str] = None
    player_count: Optional[int] = None
    rules: Optional[dict[str, Any]] = None

class CampaignCreate(CampaignBase):
    pass

class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    setting: Optional[str] = None
    theme: Optional[str] = None
    tone: Optional[str] = None
    player_count: Optional[int] = None
    world_lore: Optional[dict[str, Any]] = None
    rules: Optional[dict[str, Any]] = None

class CampaignResponse(CampaignBase):
    id: UUID
    user_id: UUID
    world_lore: Optional[dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CampaignDetail(CampaignResponse):
    session_count: Optional[int] = 0
```

**app/schemas/session.py:**
```python
from pydantic import BaseModel
from typing import Optional, Any
from uuid import UUID
from datetime import datetime
from enum import Enum

class SessionStatus(str, Enum):
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"

class SessionBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: SessionStatus = SessionStatus.PLANNED

class SessionCreate(SessionBase):
    campaign_id: UUID

class SessionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[SessionStatus] = None
    scenario: Optional[dict[str, Any]] = None

class SessionResponse(SessionBase):
    id: UUID
    campaign_id: UUID
    session_number: int
    scenario: Optional[dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class SessionDetail(SessionResponse):
    has_results: bool = False
```

**app/schemas/user.py:**
```python
from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: UUID
    username: str
    email: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
```

### 5.4 API Routers

**app/routers/auth.py:**
```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, TokenResponse
from app.utils.security import hash_password, verify_password, create_access_token

router = APIRouter()

@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check if user exists
    result = await db.execute(select(User).where(User.username == user_data.username))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Username already registered")

    # Create user
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hash_password(user_data.password)
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return new_user

@router.post("/login", response_model=TokenResponse)
async def login(username: str, password: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalars().first()

    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token, user=user)
```

**app/routers/campaigns.py:**
```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from uuid import UUID
from app.db.database import get_db
from app.models.campaign import Campaign
from app.models.user import User
from app.schemas.campaign import CampaignCreate, CampaignResponse, CampaignDetail, CampaignUpdate
from app.dependencies import get_current_user

router = APIRouter()

@router.post("", response_model=CampaignResponse)
async def create_campaign(
    campaign_data: CampaignCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    campaign = Campaign(
        user_id=current_user.id,
        **campaign_data.model_dump()
    )
    db.add(campaign)
    await db.commit()
    await db.refresh(campaign)
    return campaign

@router.get("", response_model=list[CampaignResponse])
async def list_campaigns(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Campaign)
        .where(Campaign.user_id == current_user.id)
        .orderby(Campaign.created_at.desc())
    )
    return result.scalars().all()

@router.get("/{campaign_id}", response_model=CampaignDetail)
async def get_campaign(
    campaign_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Campaign)
        .where((Campaign.id == campaign_id) & (Campaign.user_id == current_user.id))
        .options(selectinload(Campaign.sessions))
    )
    campaign = result.scalars().first()

    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    return campaign

@router.put("/{campaign_id}", response_model=CampaignResponse)
async def update_campaign(
    campaign_id: UUID,
    campaign_data: CampaignUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Campaign).where((Campaign.id == campaign_id) & (Campaign.user_id == current_user.id))
    )
    campaign = result.scalars().first()

    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    for field, value in campaign_data.model_dump(exclude_unset=True).items():
        setattr(campaign, field, value)

    await db.commit()
    await db.refresh(campaign)
    return campaign

@router.delete("/{campaign_id}")
async def delete_campaign(
    campaign_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Campaign).where((Campaign.id == campaign_id) & (Campaign.user_id == current_user.id))
    )
    campaign = result.scalars().first()

    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    await db.delete(campaign)
    await db.commit()
    return {"deleted": True}
```

**app/routers/sessions.py:**
```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID
from app.db.database import get_db
from app.models.session import Session
from app.models.campaign import Campaign
from app.models.user import User
from app.schemas.session import SessionCreate, SessionResponse, SessionUpdate
from app.dependencies import get_current_user

router = APIRouter()

@router.post("", response_model=SessionResponse)
async def create_session(
    session_data: SessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify campaign ownership
    result = await db.execute(
        select(Campaign).where((Campaign.id == session_data.campaign_id) & (Campaign.user_id == current_user.id))
    )
    if not result.scalars().first():
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Get next session number
    result = await db.execute(
        select(Session).where(Session.campaign_id == session_data.campaign_id).order_by(Session.session_number.desc())
    )
    last_session = result.scalars().first()
    session_number = (last_session.session_number + 1) if last_session else 1

    session = Session(
        campaign_id=session_data.campaign_id,
        session_number=session_number,
        title=session_data.title,
        description=session_data.description
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session

@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Session)
        .join(Campaign)
        .where((Session.id == session_id) & (Campaign.user_id == current_user.id))
    )
    session = result.scalars().first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return session

@router.put("/{session_id}", response_model=SessionResponse)
async def update_session(
    session_id: UUID,
    session_data: SessionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Session)
        .join(Campaign)
        .where((Session.id == session_id) & (Campaign.user_id == current_user.id))
    )
    session = result.scalars().first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    for field, value in session_data.model_dump(exclude_unset=True).items():
        setattr(session, field, value)

    await db.commit()
    await db.refresh(session)
    return session
```

### 5.5 Security Utilities

**app/utils/security.py:**
```python
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=7)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm="HS256")
    return encoded_jwt

def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        return payload
    except JWTError:
        return None
```

**app/dependencies.py:**
```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID
from app.db.database import get_db
from app.models.user import User
from app.utils.security import decode_token

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    token = credentials.credentials
    payload = decode_token(token)

    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalars().first()

    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    return user
```

### 5.6 Database Setup

**app/db/database.py:**
```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.config import settings
from app.db.base import Base

engine = None
SessionLocal = None

async def init_db():
    global engine, SessionLocal
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=settings.DEBUG,
        future=True
    )
    SessionLocal = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_db():
    async with SessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
```

**app/config.py:**
```python
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@db:5432/lazy_foundry"

    # JWT
    JWT_SECRET: str = "your-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"

    # API
    API_TITLE: str = "Lazy Foundry VTT"
    API_VERSION: str = "0.1.0"
    DEBUG: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
```

---

## 6. Frontend Implementation

### 6.1 React Project Setup

**frontend/package.json:**
```json
{
  "name": "lazy-foundry-vtt-frontend",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint src"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.18.0",
    "axios": "^1.6.0",
    "@reduxjs/toolkit": "^1.9.7",
    "react-redux": "^8.1.3"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.3.0",
    "postcss": "^8.4.31"
  }
}
```

### 6.2 API Service Layer

**frontend/src/services/api.js:**
```javascript
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

**frontend/src/services/authService.js:**
```javascript
import api from './api';

export const authService = {
  register: async (username, email, password) => {
    const response = await api.post('/auth/register', {
      username,
      email,
      password,
    });
    return response.data;
  },

  login: async (username, password) => {
    const response = await api.post('/auth/login', {
      username,
      password,
    });
    localStorage.setItem('token', response.data.access_token);
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
  },
};
```

**frontend/src/services/campaignService.js:**
```javascript
import api from './api';

export const campaignService = {
  create: async (campaignData) => {
    const response = await api.post('/campaigns', campaignData);
    return response.data;
  },

  list: async () => {
    const response = await api.get('/campaigns');
    return response.data;
  },

  get: async (id) => {
    const response = await api.get(`/campaigns/${id}`);
    return response.data;
  },

  update: async (id, campaignData) => {
    const response = await api.put(`/campaigns/${id}`, campaignData);
    return response.data;
  },

  delete: async (id) => {
    await api.delete(`/campaigns/${id}`);
  },
};
```

**frontend/src/services/sessionService.js:**
```javascript
import api from './api';

export const sessionService = {
  create: async (sessionData) => {
    const response = await api.post('/sessions', sessionData);
    return response.data;
  },

  get: async (id) => {
    const response = await api.get(`/sessions/${id}`);
    return response.data;
  },

  update: async (id, sessionData) => {
    const response = await api.put(`/sessions/${id}`, sessionData);
    return response.data;
  },
};
```

### 6.3 Redux Store Setup

**frontend/src/store/store.js:**
```javascript
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import campaignReducer from './slices/campaignSlice';
import sessionReducer from './slices/sessionSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    campaigns: campaignReducer,
    sessions: sessionReducer,
  },
});
```

**frontend/src/store/slices/authSlice.js:**
```javascript
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null,
  token: localStorage.getItem('token'),
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    loginSuccess: (state, action) => {
      state.isLoading = false;
      state.user = action.payload.user;
      state.token = action.payload.access_token;
      localStorage.setItem('user', JSON.stringify(action.payload.user));
      localStorage.setItem('token', action.payload.access_token);
    },
    loginFailure: (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    },
  },
});

export const { loginStart, loginSuccess, loginFailure, logout } = authSlice.actions;
export default authSlice.reducer;
```

### 6.4 React Components

**frontend/src/components/campaigns/CampaignList.jsx:**
```jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { campaignService } from '../../services/campaignService';

export function CampaignList() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      const data = await campaignService.list();
      setCampaigns(data);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure?')) {
      await campaignService.delete(id);
      setCampaigns(campaigns.filter(c => c.id !== id));
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <button
        onClick={() => navigate('/campaigns/new')}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        New Campaign
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {campaigns.map(campaign => (
          <div key={campaign.id} className="p-4 border rounded">
            <h3 className="font-bold">{campaign.name}</h3>
            <p className="text-sm text-gray-600">{campaign.description}</p>
            <div className="mt-4 space-x-2">
              <button
                onClick={() => navigate(`/campaigns/${campaign.id}`)}
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
              >
                View
              </button>
              <button
                onClick={() => handleDelete(campaign.id)}
                className="px-3 py-1 bg-red-500 text-white rounded text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 7. Database Migrations (Alembic)

**alembic/versions/001_initial_schema.py:**
```python
"""Initial schema

Revision ID: 001
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('username', sa.String(50), unique=True, nullable=False),
        sa.Column('email', sa.String(255), unique=True, nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index('ix_users_username', 'users', ['username'])
    op.create_index('ix_users_email', 'users', ['email'])

    # Create campaigns table
    op.create_table(
        'campaigns',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text),
        sa.Column('setting', sa.String(255)),
        sa.Column('theme', sa.String(255)),
        sa.Column('tone', sa.String(255)),
        sa.Column('player_count', sa.Integer),
        sa.Column('world_lore', postgresql.JSON),
        sa.Column('rules', postgresql.JSON),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now()),
    )

    # Create sessions table
    op.create_table(
        'sessions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('campaign_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('campaigns.id'), nullable=False),
        sa.Column('session_number', sa.Integer, nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text),
        sa.Column('status', sa.String(50), default='planned'),
        sa.Column('scenario', postgresql.JSON),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now()),
    )

    # Create session_results table
    op.create_table(
        'session_results',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('session_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('sessions.id'), unique=True, nullable=False),
        sa.Column('summary', sa.Text),
        sa.Column('events', postgresql.JSON),
        sa.Column('npc_interactions', postgresql.JSON),
        sa.Column('player_decisions', postgresql.JSON),
        sa.Column('world_changes', postgresql.JSON),
        sa.Column('unfinished_threads', postgresql.JSON),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now()),
    )

def downgrade():
    op.drop_table('session_results')
    op.drop_table('sessions')
    op.drop_table('campaigns')
    op.drop_table('users')
```

---

## 8. Testing Strategy

### Unit Tests (Phase 1)

**tests/test_auth.py:**
```python
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_register_user():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/auth/register",
            json={
                "username": "testuser",
                "email": "test@example.com",
                "password": "password123"
            }
        )
        assert response.status_code == 200
        assert response.json()["username"] == "testuser"

@pytest.mark.asyncio
async def test_login_user():
    async with AsyncClient(app=app, base_url="http://test") as client:
        await client.post(
            "/api/auth/register",
            json={
                "username": "testuser",
                "email": "test@example.com",
                "password": "password123"
            }
        )

        response = await client.post(
            "/api/auth/login",
            json={"username": "testuser", "password": "password123"}
        )
        assert response.status_code == 200
        assert "access_token" in response.json()
```

---

## 9. Docker Files

**backend/Dockerfile:**
```dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**frontend/Dockerfile:**
```dockerfile
FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**backend/requirements.txt:**
```
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
asyncpg==0.29.0
alembic==1.13.0
pydantic==2.5.0
pydantic-settings==2.1.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
httpx==0.25.2
pytest==7.4.3
pytest-asyncio==0.21.1
```

---

## 10. Environment Configuration

**.env.example:**
```
# Database
DB_NAME=lazy_foundry
DB_USER=postgres
DB_PASSWORD=postgres
DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/lazy_foundry

# API
JWT_SECRET=your-super-secret-key-change-in-production
DEBUG=true

# Frontend
VITE_API_URL=http://localhost:8000/api
```

---

## 11. Implementation Checklist

### Infrastructure
- [ ] Create project repository
- [ ] Set up Docker Compose with db, api, web services
- [ ] Configure postgres volume mounts
- [ ] Set up environment files (.env)
- [ ] Verify all services start and communicate

### Backend
- [ ] FastAPI app scaffold
- [ ] Database models (User, Campaign, Session, SessionResult)
- [ ] Alembic migration setup
- [ ] Authentication system (register, login, JWT)
- [ ] Campaign CRUD endpoints
- [ ] Session CRUD endpoints
- [ ] Dependencies and security middleware
- [ ] Error handling and validation

### Frontend
- [ ] React + Vite setup
- [ ] Router configuration
- [ ] API service layer
- [ ] Redux store setup
- [ ] Authentication flow (login, register)
- [ ] Campaign list and detail pages
- [ ] Campaign creation form
- [ ] Session management pages
- [ ] Navigation and layout components
- [ ] Tailwind CSS configuration

### Testing
- [ ] Set up pytest fixtures
- [ ] Write auth endpoint tests
- [ ] Write campaign endpoint tests
- [ ] Write session endpoint tests
- [ ] Run tests locally

### Documentation
- [ ] API endpoint documentation (OpenAPI)
- [ ] Database schema documentation
- [ ] Setup instructions for running locally
- [ ] Environmental configuration guide

---

## 12. Success Criteria

- Docker Compose environment runs without errors
- All CRUD endpoints functional and tested
- Authentication system working (register/login)
- Frontend can create, list, and view campaigns
- Frontend can create and view sessions
- Database persists data correctly
- API documentation available at `/docs`
- All tests passing

---

## 13. Next Phase

Upon completion of Phase 1, proceed to **Phase 2: AI Integration** for LLM API setup and content generation capabilities.
