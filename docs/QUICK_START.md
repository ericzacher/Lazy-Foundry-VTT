# Lazy Foundry VTT - Quick Start Guide

Get up and running with Lazy Foundry VTT in under 10 minutes!

## ⚡ 5-Minute Setup

### Prerequisites
- Docker and Docker Compose installed
- [Groq API key](https://console.groq.com/) (free)
- [Foundry VTT](https://foundryvtt.com/) license

### Setup Steps

**1. Clone and Configure** (2 minutes)
```bash
git clone <repository-url>
cd Lazy-Foundry-VTT

# Copy and edit environment file
cp .env.example .env
nano .env  # or your preferred editor
```

**2. Edit .env File** - Update these values:
```bash
# Foundry License (required)
FOUNDRY_USERNAME=your-email@example.com
FOUNDRY_PASSWORD=your-foundry-password
KEY=AAAA-BBBB-CCCC-DDDD-EEEE-FFFF

# AI API (required)
GROQ_API_KEY=your-groq-api-key-here

# Security (required)
JWT_SECRET=$(openssl rand -base64 32)  # Run this command to generate
```

**3. Start Everything** (2 minutes)
```bash
make install
# Or if make isn't installed: docker compose up --build -d
```

**4. Accept Foundry License** (1 minute)
- Open http://localhost:30000
- Accept EULA
- Enter your Foundry license key
- World will auto-launch

**5. Access Web Interface** (1 minute)
- Open http://localhost:3000
- Click "Register"
- Create your account
- Start creating!

## 🎯 Your First Campaign (5 minutes)

**1. Create Campaign**
- Click "New Campaign"
- Fill in:
  - Name: "Test Campaign"
  - Setting: "Fantasy kingdom"
  - Theme: "Adventure"
  - Tone: "Heroic"
  - Players: 4

**2. Generate Lore** (Optional)
- Click "Generate Lore"
- Wait ~30 seconds
- Review the generated world details

**3. Create First Session**
- Click "New Session"
- Title: "The Adventure Begins"
- Click "Generate Scenario"
- AI creates a complete opening scenario

**4. Generate a Map**
- Click "Generate Map"
- Select: "Tavern"
- Description: "Cozy roadside inn"
- Click Generate

**5. Sync to Foundry**
- Click "Sync to Foundry"
- Open Foundry VTT
- Find your scene in Scenes tab
- Ready to play!

## 📋 Common Commands

```bash
# Start services
make up

# Stop services
make down

# View logs
make logs-api

# Check health
make health

# Restart everything
make restart

# Clean slate
make clean && make up
```

## 🎲 Running Your First Session

### Before the Game
1. Generate session scenario
2. Create 2-3 NPCs
3. Generate a map
4. Sync all to Foundry
5. Review in Foundry

### During the Game
- Run the game normally in Foundry
- Take quick notes of key events

### After the Game
1. Click "Finalize Session" in web interface
2. Record:
   - What happened
   - Key decisions
   - Unfinished plot threads
   - NPC interactions
3. Save

### Next Session
1. Create new session
2. AI automatically references previous session
3. Generate scenario (will continue the story!)
4. Repeat the cycle

## 🆘 Quick Troubleshooting

**Services won't start?**
```bash
make clean
make up
```

**Foundry not syncing?**
```bash
make health  # Check if Foundry is running
make logs-api  # Check for sync errors
```

**API errors?**
```bash
make logs-api  # View detailed errors
```

**Need to restart?**
```bash
make restart
```

**Complete reset?**
```bash
make clean && make install
```

## 🔗 Useful URLs

- **Web Dashboard**: http://localhost:3000
- **API**: http://localhost:3001
- **API Health**: http://localhost:3001/health/ready
- **Foundry VTT**: http://localhost:30000

## 📚 Learn More

- [DM Guide](DM_GUIDE.md) - Comprehensive DM guide
- [Makefile Reference](MAKEFILE_REFERENCE.md) - All commands
- [Phase 6 Quick Reference](PHASE_6_QUICK_REFERENCE.md) - Advanced features
- [README](../README.md) - Full documentation

## 💡 Pro Tips

1. **Generate early**: Create content a day before your session
2. **Be specific**: Detailed descriptions = better AI content
3. **Record promptly**: Finalize sessions within 24 hours
4. **Backup regularly**: `make backup` before major changes
5. **Experiment**: Not happy with AI result? Regenerate!

## ✅ Success Checklist

- [ ] All services running (`make ps`)
- [ ] Foundry license accepted
- [ ] Web dashboard accessible
- [ ] Campaign created
- [ ] First session generated
- [ ] Content synced to Foundry
- [ ] Ready to play!

---

**That's it! You're ready to run your first AI-powered session!** 🎉

For detailed guidance, check out the [DM Guide](DM_GUIDE.md).
