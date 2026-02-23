# 🎲 Monster API - Quick Start

## Setup (One-Time)

```bash
# 1. Apply database migration
docker exec lazy-foundry-api psql -U postgres -d lazy_foundry -f /app/migrations/add-combat-stats.sql

# 2. Restart API
docker compose restart api

# 3. Test it
./test-monster-api.sh
```

## Basic Usage

```bash
# Get your auth token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpass"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# Get your campaign ID (or create one via web UI)
CAMPAIGN_ID="your-campaign-uuid"

# Generate monsters!
curl -X POST "http://localhost:3001/api/generate/campaigns/$CAMPAIGN_ID/monsters" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "monsterType": "goblin warrior",
    "cr": 0.25,
    "count": 4
  }' | python3 -m json.tool
```

## Common Examples

### Generate 5 Goblins
```bash
curl ... -d '{"monsterType": "goblin", "cr": 0.25, "count": 5}'
```

### Generate 1 Boss
```bash
curl ... -d '{"monsterType": "vampire lord", "cr": 13, "count": 1}'
```

### Generate 10 Zombies
```bash
curl ... -d '{"monsterType": "zombie", "cr": 0.25, "count": 10}'
```

### Generate 3 Bandits
```bash
curl ... -d '{"monsterType": "bandit thug", "cr": 0.125, "count": 3}'
```

## Sync to Foundry

```bash
# Option 1: Bulk sync entire campaign
curl -X POST "http://localhost:3001/api/foundry/campaigns/$CAMPAIGN_ID/bulk" \
  -H "Authorization: Bearer $TOKEN"

# Option 2: Sync individual monster
curl -X POST "http://localhost:3001/api/foundry/actors/$MONSTER_ID" \
  -H "Authorization: Bearer $TOKEN"
```

## Recommended Workflow

**Pre-Session:**
1. Generate boss + lieutenants via Monster API (~30 seconds)
2. Bulk sync to Foundry (~10 seconds)

**During Session:**
1. Drag generic monsters from Foundry's SRD compendium (~5 seconds)

**Total prep: <1 minute per session!**

## Performance

- 1 monster: 10 seconds
- 5 monsters: 12 seconds
- 10 monsters: 15 seconds
- + Tokens: +2 seconds each
- + Foundry sync: +3 seconds each

## Documentation

- **Full API docs**: `docs/MONSTER_GENERATION_API.md`
- **Implementation details**: `MONSTER_API_IMPLEMENTATION.md`
- **Alternatives guide**: `MONSTER_GENERATION_ALTERNATIVES.md`

## Troubleshooting

**"Column combatStats does not exist"**
→ Run the migration (step 1 above)

**"No response from AI"**
→ Check GROQ_API_KEY in `.env`

**Monsters not in Foundry**
→ Check: `curl http://localhost:3001/api/foundry/health -H "Authorization: Bearer $TOKEN"`

---

**That's it! Start generating monsters! 🐉**
