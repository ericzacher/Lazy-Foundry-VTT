# 📚 Lazy Foundry VTT Documentation Index

Complete documentation for the AI-powered Foundry VTT platform.

---

## 🚀 Getting Started

Start here if you're new to Lazy Foundry VTT.

| Document | Description | Audience |
|----------|-------------|----------|
| **[Quick Start Guide](QUICK_START.md)** | Get up and running in 5 minutes | Everyone |
| **[README](../README.md)** | Project overview and features | Everyone |
| **[DM Guide](DM_GUIDE.md)** | Comprehensive guide for running campaigns | Dungeon Masters |

---

## 👨‍💼 For Dungeon Masters

Documentation for using Lazy Foundry VTT to run campaigns.

| Document | Description | Key Topics |
|----------|-------------|------------|
| **[DM Guide](DM_GUIDE.md)** | Complete guide for DMs | Campaign creation, session planning, AI generation, Foundry sync |
| **[Quick Start](QUICK_START.md)** | First campaign walkthrough | Setup, first session, common commands |
| **[Best Practices](#)** *(coming soon)* | Tips for effective play | Prompt engineering, session structure |

---

## 👨‍💻 For Developers

Documentation for contributing to or understanding the codebase.

### Architecture & Design

| Document | Description | Key Topics |
|----------|-------------|------------|
| **[Planning Document](../PLANNING.md)** | System architecture and design | Component overview, data models, API design |
| **[Database Schema](../README.md#-database-schema)** | Database structure | Tables, relationships, migrations |

### Implementation Phases

| Phase | Document | Status | Key Features |
|-------|----------|--------|--------------|
| **Phase 1** | [Foundation](PHASE_1_FOUNDATION.md) | ✅ Complete | API, database, auth, Docker setup |
| **Phase 2** | [AI Integration](PHASE_2_AI_INTEGRATION.md) | ✅ Complete | LLM integration, campaign/session generation |
| **Phase 3** | [Content Generation](PHASE_3_CONTENT_GENERATION.md) | ✅ Complete | Maps, tokens, NPCs |
| **Phase 4** | [Foundry Integration](PHASE_4_FOUNDRY_VTT_INTEGRATION.md) | ✅ Complete | Bi-directional sync, world creation |
| **Phase 5** | [Session Continuity](PHASE_5_SESSION_RESULTS_AND_CONTINUITY.md) | ✅ Complete | Session results, timeline, NPC history |
| **Phase 6** | [Production Hardening](PHASE_6_IMPLEMENTATION_COMPLETE.md) | ✅ Complete | Security, logging, performance, deployment |

### Phase 4 Supplemental

| Document | Description |
|----------|-------------|
| [Implementation Summary](PHASE_4_IMPLEMENTATION_SUMMARY.md) | Phase 4 completion details |

### Phase 5 Supplemental

| Document | Description |
|----------|-------------|
| [Implementation Details](PHASE_5_IMPLEMENTATION.md) | Technical implementation guide |

### Phase 6 Supplemental

| Document | Description |
|----------|-------------|
| [Quick Reference](PHASE_6_QUICK_REFERENCE.md) | Feature reference and API examples |
| [Production Hardening](PHASE_6_HARDENING_AND_PRODUCTION.md) | Original planning document |
| [Polish & Enhancements](PHASE_6_POLISH_AND_ENHANCEMENTS.md) | Enhancement planning |

---

## 🔧 For System Administrators

Documentation for deploying and managing Lazy Foundry VTT.

### Deployment & Operations

| Document | Description | Key Topics |
|----------|-------------|------------|
| **[Makefile Reference](MAKEFILE_REFERENCE.md)** | Complete command reference | All 40+ Make commands with examples |
| **[Environment Configuration](ENV_CONFIGURATION.md)** | Configuration guide | Environment variables, secrets, production setup |
| **[Phase 6 Quick Reference](PHASE_6_QUICK_REFERENCE.md)** | Production features | Health checks, logging, monitoring |

### Security

| Document | Description | Key Topics |
|----------|-------------|------------|
| **[Security Guidelines](SECURITY_GUIDELINES.md)** | Security best practices | Authentication, secrets, validation, production hardening |

---

## 📖 Reference Documentation

### Quick References

| Document | Description |
|----------|-------------|
| **[Phase 6 Quick Reference](PHASE_6_QUICK_REFERENCE.md)** | Production features and APIs |
| **[Makefile Reference](MAKEFILE_REFERENCE.md)** | Make commands cheat sheet |

### Configuration

| Document | Description |
|----------|-------------|
| **[Environment Configuration](ENV_CONFIGURATION.md)** | All environment variables |
| **[Docker Compose](../docker-compose.yml)** | Service configuration |

---

## 🎯 By Use Case

### "I want to run my first campaign"
1. [Quick Start Guide](QUICK_START.md)
2. [DM Guide](DM_GUIDE.md)

### "I want to deploy to production"
1. [Makefile Reference](MAKEFILE_REFERENCE.md)
2. [Environment Configuration](ENV_CONFIGURATION.md)
3. [Phase 6 Quick Reference](PHASE_6_QUICK_REFERENCE.md)
4. [Security Guidelines](SECURITY_GUIDELINES.md)

### "I want to understand the codebase"
1. [Planning Document](../PLANNING.md)
2. [Phase 1-6 Documentation](#implementation-phases)
3. [Database Schema](../README.md#-database-schema)

### "I want to contribute"
1. [README - Contributing](../README.md#-contributing)
2. [Planning Document](../PLANNING.md)
3. Implementation Phase docs

### "Something's broken, help!"
1. [Quick Start - Troubleshooting](QUICK_START.md#-troubleshooting)
2. [DM Guide - Troubleshooting](DM_GUIDE.md#-troubleshooting)
3. [README - Troubleshooting](../README.md#-troubleshooting)
4. [Makefile Reference - Debugging](MAKEFILE_REFERENCE.md#debugging-commands)

---

## 📊 Documentation Status

| Category | Status | Notes |
|----------|--------|-------|
| **Getting Started** | ✅ Complete | Quick Start, DM Guide, README |
| **Implementation** | ✅ Complete | All 6 phases documented |
| **Deployment** | ✅ Complete | Makefile, environment, security |
| **Reference** | ✅ Complete | Phase 6 Quick Ref, Makefile Ref |
| **API Documentation** | ⏳ Planned | OpenAPI/Swagger coming soon |
| **Best Practices Guide** | ⏳ Planned | Advanced DM tips |

---

## 🔄 Recently Updated

- **2024** - Phase 6 implementation complete
- **2024** - DM Guide created
- **2024** - Quick Start Guide created
- **2024** - Makefile Reference created
- **2024** - This index created

---

## 📝 Contributing to Documentation

Found a typo? Want to add clarification? 

1. Documentation is in Markdown format
2. Follow existing structure and style
3. Update this index when adding new docs
4. Keep examples practical and tested
5. Submit a PR!

---

## 💡 Need Help?

1. Check the [Quick Start Guide](QUICK_START.md)
2. Search the [DM Guide](DM_GUIDE.md)
3. Check logs: `make logs-api`
4. Check health: `make health`
5. Open a GitHub Issue

---

**Last Updated:** 2024 (Phase 6 Complete)
