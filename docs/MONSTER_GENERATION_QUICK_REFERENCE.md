# Monster Generation Quick Reference

## Two Ways to Generate Monsters

Your Lazy Foundry VTT setup now supports **two complementary approaches** to monster/NPC creation:

### 🤖 AI-Generated NPCs (Lazy Foundry)
**Best for: Named characters, story NPCs, quest-givers**

**Features:**
- Rich personality and backstory
- Motivations and relationships
- AI-generated custom tokens
- Integration with campaign lore
- Full D&D 5e stats (STR, DEX, CON, INT, WIS, CHA)
- Synced via API to Foundry

**How to use:**
1. Create via Web UI: http://localhost:3000
2. Click "Generate NPCs" on campaign page
3. Set count and generate
4. Generate tokens for each
5. Sync to Foundry with one click

**API Example:**
```bash
# Generate 2 NPCs with personalities
curl -X POST http://localhost:3001/api/generate/campaigns/$CAMPAIGN_ID/npcs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"count": 2}'

# Generate token for NPC
curl -X POST http://localhost:3001/api/generate/campaigns/$CAMPAIGN_ID/npcs/$NPC_ID/token \
  -H "Authorization: Bearer $TOKEN"

# Sync to Foundry
curl -X POST http://localhost:3001/api/foundry/actors/$NPC_ID \
  -H "Authorization: Bearer $TOKEN"
```

---

### ⚡ Lazy Monster Builder (Foundry Module)
**Best for: Combat encounters, minions, random enemies**

**Features:**
- Instant monster generation in Foundry
- Based on Lazy GM's 5e Monster Builder
- CR-appropriate stats
- No backstory or personality (pure combat stats)
- Generated directly in Foundry VTT

**How to use:**
1. Open Foundry VTT: http://localhost:30000
2. Click Actors Directory (person icon)
3. Click "Generate Monster" button
4. Select CR and monster type
5. Monster appears instantly in your actors list

**No API needed** - works entirely within Foundry UI

---

## Comparison Table

| Feature | AI-Generated NPCs | Lazy Monster Builder |
|---------|-------------------|---------------------|
| **Creation Location** | Web UI / API | Foundry VTT |
| **Speed** | 20-30 seconds | 2-5 seconds |
| **Personality** | ✅ Rich backstory | ❌ Stats only |
| **Custom Tokens** | ✅ AI-generated | ⚠️ Default tokens |
| **Campaign Integration** | ✅ Tied to lore | ❌ Standalone |
| **D&D 5e Stats** | ✅ Full stats | ✅ Full stats |
| **Best Use Case** | Story NPCs | Combat filler |
| **Prep Required** | Minimal | Zero |

---

## Recommended Workflow

### Pre-Session Prep (AI-Generated)
Use the **Lazy Foundry Web UI** to create:
1. Campaign world lore
2. Key NPCs (villains, allies, quest-givers)
3. Dungeon maps
4. Tokens for important NPCs
5. Bulk sync everything to Foundry

**Time: ~5 minutes for a full session**

### During Session (On-the-Fly)
Use **Lazy Monster Builder** in Foundry for:
1. Improvised encounters
2. Random monsters
3. Minions and guards
4. Filling out encounters on the fly

**Time: ~5 seconds per monster**

---

## Example: Full Session Prep

**Scenario: The Haunted Monastery**

### Step 1: AI Generation (Web UI)
```bash
# Generate campaign lore
POST /api/generate/campaigns/123/lore

# Generate key NPCs
POST /api/generate/campaigns/123/npcs {"count": 3}
# - Abbot Greyson (quest-giver)
# - Vampire Lord Draven (boss)
# - Sister Amara (ally)

# Generate tokens
POST /api/generate/campaigns/123/npcs/456/token
POST /api/generate/campaigns/123/npcs/457/token
POST /api/generate/campaigns/123/npcs/458/token

# Generate dungeon map
POST /api/generate/campaigns/123/maps
{
  "description": "Ancient monastery with crypts and prayer halls",
  "mapType": "dungeon"
}

# Sync everything
POST /api/foundry/campaigns/123/bulk
```

### Step 2: In-Session Improvisation (Foundry)
**Player triggers random encounter in hallway:**
1. Click "Generate Monster" → Select "Skeleton" CR 1/4
2. Duplicate skeleton actor 4 times
3. Place tokens on map
4. Roll initiative!

**Result:**
- ✅ Full session prepped in 5 minutes
- ✅ Unlimited improvisation capability
- ✅ Zero manual stat entry
- ✅ Professional quality content

---

## Installation & Setup

### Enable Module (First Time Only)
1. Access Foundry at http://localhost:30000
2. Login as GM
3. Settings → Manage Modules
4. Enable "Lazy Monster Builder"
5. Save

### Verify Installation
```bash
# Check if module is installed
docker exec lazy-foundry-vtt ls -la /data/Data/modules/lazy-monster-builder

# View installation logs
make logs-foundry | grep lazy-monster-builder

# Restart Foundry if needed
make restart
```

---

## Tips & Best Practices

### 🎯 Use AI for Quality, Module for Quantity
- **AI**: 2-3 memorable NPCs per session
- **Module**: 10-20 combat encounters worth of monsters

### 🎭 Layered Approach
1. **Pre-generate** important NPCs with AI (personalities matter)
2. **Keep a library** of Lazy Monster Builder creatures (reusable)
3. **Mix and match** during the session

### ⚡ Speed Tips
- Keep a folder of pre-generated minions (goblins, bandits, undead)
- Use AI for bosses and lieutenants
- Use module for everything else

### 📦 Reusability
- AI-generated NPCs: **One-time use** (unique characters)
- Lazy Monster Builder: **Reusable** (duplicate actors as needed)

---

## Troubleshooting

### Module not working?
```bash
# Reinstall
docker exec lazy-foundry-vtt rm -rf /data/Data/modules/lazy-monster-builder
make restart
```

### AI generation failing?
```bash
# Check API health
make health

# View logs
make logs-api

# Check Groq API key
grep GROQ_API_KEY .env
```

---

## Resources

- **Module Source**: https://github.com/SetaSensei/lazy-monster-builder
- **Module Docs**: [LAZY_MONSTER_BUILDER_INTEGRATION.md](./LAZY_MONSTER_BUILDER_INTEGRATION.md)
- **API Reference**: [README.md](../README.md#-api-reference)
- **DM Guide**: [DM_GUIDE.md](./DM_GUIDE.md)

---

**You now have the ultimate D&D prep toolkit!** 🎲✨
