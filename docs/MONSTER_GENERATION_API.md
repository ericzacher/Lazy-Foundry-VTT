# Monster Generation API

## Overview

The Monster Generation API provides **fast, AI-powered monster creation** optimized for combat encounters. This is your solution for quick monster generation that's compatible with **Foundry VTT v13**.

## Why Use This Instead of Third-Party Modules?

| Feature | Monster API | Lazy Monster Builder |
|---------|-------------|---------------------|
| **Foundry v13 Support** | ✅ Yes | ❌ No (v10-12 only) |
| **Generation Speed** | ⚡ 10-15 seconds | ⚡ 5 seconds |
| **Campaign Integration** | ✅ Yes | ❌ Standalone |
| **Custom Tokens** | ✅ Auto-generated | ⚠️ Default only |
| **AI-Powered** | ✅ Yes | ❌ Template-based |
| **Foundry Sync** | ✅ One-click | ⚠️ Manual |

## API Endpoint

### Generate Monsters

```
POST /api/generate/campaigns/:campaignId/monsters
```

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "monsterType": "goblin",
  "cr": 0.25,
  "count": 4
}
```

**Parameters:**
- `monsterType` (required): Type of monster (e.g., "goblin", "zombie", "bandit", "wolf")
- `cr` (required): Challenge Rating (0-30, supports decimals like 0.125, 0.25, 0.5)
- `count` (optional): Number of monsters to generate (1-20, default: 1)

**Response:**
```json
{
  "message": "Generated 4 goblin(s)",
  "monsters": [
    {
      "id": "uuid",
      "campaignId": "uuid",
      "name": "Goblin Warrior 1",
      "role": "humanoid",
      "description": "A small, green-skinned creature with sharp teeth",
      "stats": {
        "strength": 8,
        "dexterity": 14,
        "constitution": 10,
        "intelligence": 10,
        "wisdom": 8,
        "charisma": 8
      },
      "combatStats": {
        "hitPoints": 7,
        "armorClass": 15,
        "speed": "30 ft.",
        "attacks": [
          {
            "name": "Scimitar",
            "bonus": 4,
            "damage": "1d6+2 slashing"
          }
        ],
        "specialAbilities": ["Nimble Escape"]
      },
      "foundryActorId": null,
      "syncStatus": "never"
    }
    // ... 3 more goblins
  ]
}
```

## Usage Examples

### Example 1: Generate Goblin Ambush

```bash
# Login and get token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dm@example.com","password":"yourpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# Get your campaign ID
CAMPAIGN_ID="your-campaign-uuid"

# Generate 5 goblins (CR 1/4)
curl -X POST "http://localhost:3001/api/generate/campaigns/$CAMPAIGN_ID/monsters" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "monsterType": "goblin warrior",
    "cr": 0.25,
    "count": 5
  }' | python3 -m json.tool
```

### Example 2: Generate Boss Monster

```bash
# Generate a single vampire (CR 13)
curl -X POST "http://localhost:3001/api/generate/campaigns/$CAMPAIGN_ID/monsters" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "monsterType": "vampire lord",
    "cr": 13,
    "count": 1
  }' | python3 -m json.tool
```

### Example 3: Generate Undead Horde

```bash
# Generate 10 zombies (CR 1/4)
curl -X POST "http://localhost:3001/api/generate/campaigns/$CAMPAIGN_ID/monsters" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "monsterType": "zombie",
    "cr": 0.25,
    "count": 10
  }' | python3 -m json.tool
```

### Example 4: Generate and Sync to Foundry

```bash
# Step 1: Generate monsters
MONSTERS=$(curl -s -X POST "http://localhost:3001/api/generate/campaigns/$CAMPAIGN_ID/monsters" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"monsterType": "bandit", "cr": 0.125, "count": 3}')

# Step 2: Extract monster IDs
MONSTER_IDS=$(echo "$MONSTERS" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for m in data['monsters']:
    print(m['id'])
")

# Step 3: Sync each to Foundry
for MONSTER_ID in $MONSTER_IDS; do
  curl -s -X POST "http://localhost:3001/api/foundry/actors/$MONSTER_ID" \
    -H "Authorization: Bearer $TOKEN" \
    | python3 -m json.tool
done
```

## Common Monster Types

### Low CR (0-1)
- `"rat"` - CR 0
- `"kobold"` - CR 1/8
- `"goblin"` - CR 1/4
- `"skeleton"` - CR 1/4
- `"zombie"` - CR 1/4
- `"bandit"` - CR 1/8
- `"cultist"` - CR 1/8
- `"wolf"` - CR 1/4
- `"giant rat"` - CR 1/8

### Medium CR (2-5)
- `"orc"` - CR 1/2
- `"hobgoblin"` - CR 1/2
- `"ghoul"` - CR 1
- `"bugbear"` - CR 1
- `"ogre"` - CR 2
- `"werewolf"` - CR 3
- `"minotaur"` - CR 3

### High CR (6-15)
- `"troll"` - CR 5
- `"giant"` - CR 7-9
- `"vampire"` - CR 13
- `"beholder"` - CR 13
- `"dragon"` - CR varies

## Features

### Automatic Token Generation

Each monster automatically gets a token image generated:
- Uses AI to create appropriate imagery
- 400×400px PNG format
- Foundry VTT compatible
- Fallback to colored initials if API fails

### Campaign Context Integration

Monsters are generated with your campaign's theme in mind:
- If your campaign is "Dark Gothic Horror", goblins will be darker/creepier
- If your campaign is "Lighthearted Adventure", monsters are less intimidating
- Uses your campaign's world lore for flavor

### Foundry VTT Sync

Sync monsters to Foundry just like NPCs:

```bash
# Sync a single monster
POST /api/foundry/actors/:monsterId

# Bulk sync all campaign content (includes monsters)
POST /api/foundry/campaigns/:campaignId/bulk
```

### Reusable Monster Library

Create a dedicated "Monster Library" campaign:

```bash
# 1. Create a campaign for storing monsters
MONSTER_LIB=$(curl -s -X POST http://localhost:3001/api/campaigns \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Monster Library",
    "setting": "Generic Fantasy",
    "theme": "Combat Reference",
    "playerCount": 0
  }' | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

# 2. Generate common monsters
curl -X POST "http://localhost:3001/api/generate/campaigns/$MONSTER_LIB/monsters" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"monsterType": "goblin", "cr": 0.25, "count": 10}'

# 3. Sync to Foundry once
curl -X POST "http://localhost:3001/api/foundry/campaigns/$MONSTER_LIB/bulk" \
  -H "Authorization: Bearer $TOKEN"

# 4. Reuse in Foundry by duplicating actors
```

## Integration with Existing Workflows

### Pre-Session Monster Prep

```bash
#!/bin/bash
# prep-monsters.sh - Generate all monsters for tonight's session

TOKEN="your-jwt-token"
CAMPAIGN_ID="your-campaign-id"

# Boss encounter
curl -X POST "http://localhost:3001/api/generate/campaigns/$CAMPAIGN_ID/monsters" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"monsterType": "ogre chieftain", "cr": 3, "count": 1}'

# Minions
curl -X POST "http://localhost:3001/api/generate/campaigns/$CAMPAIGN_ID/monsters" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"monsterType": "goblin", "cr": 0.25, "count": 8}'

# Guards
curl -X POST "http://localhost:3001/api/generate/campaigns/$CAMPAIGN_ID/monsters" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"monsterType": "bandit veteran", "cr": 2, "count": 3}'

# Bulk sync to Foundry
curl -X POST "http://localhost:3001/api/foundry/campaigns/$CAMPAIGN_ID/bulk" \
  -H "Authorization: Bearer $TOKEN"

echo "Session prep complete!"
```

## Performance

| Operation | Time |
|-----------|------|
| Generate 1 monster | ~10 seconds |
| Generate 5 monsters | ~12 seconds |
| Generate 10 monsters | ~15 seconds |
| Token generation per monster | ~2 seconds |
| Sync to Foundry (per monster) | ~3 seconds |

**Total time for 10 monsters + tokens + Foundry sync: ~45 seconds**

## Error Handling

### Common Errors

**401 Unauthorized:**
```json
{"error": "Invalid or expired token"}
```
Solution: Login again to get a fresh token.

**404 Campaign Not Found:**
```json
{"error": "Campaign not found"}
```
Solution: Verify the campaign ID and that you own it.

**400 Validation Error:**
```json
{
  "errors": [
    {"msg": "Invalid value", "param": "cr"}
  ]
}
```
Solution: Check that CR is between 0 and 30.

**500 AI Generation Failed:**
```json
{"error": "Failed to generate monsters"}
```
Solution: Check your GROQ_API_KEY in `.env` and API quota.

## Database Schema

Monsters are stored in the `npcs` table with:

```sql
CREATE TABLE npcs (
  id UUID PRIMARY KEY,
  campaignId UUID NOT NULL,
  name VARCHAR NOT NULL,
  role VARCHAR,
  description TEXT,
  personality JSONB,
  motivations TEXT[],
  background TEXT,
  stats JSONB,              -- Ability scores
  combatStats JSONB,        -- HP, AC, attacks, etc.
  tokenImageUrl VARCHAR,
  foundryActorId VARCHAR,
  syncStatus VARCHAR,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

## Comparison: NPCs vs Monsters

| Field | NPCs | Monsters |
|-------|------|----------|
| **Generation Time** | 30 seconds | 15 seconds |
| **Personality** | Rich backstory | Combat-focused |
| **Combat Stats** | Basic | Detailed (HP, AC, attacks) |
| **Use Case** | Story characters | Combat encounters |
| **Tokens** | Custom AI art | Custom AI art |
| **Foundry Sync** | Full support | Full support |

## Tips & Best Practices

### 1. Pre-generate Common Monsters
Create a "Monster Library" campaign and generate:
- 20× goblins
- 20× bandits
- 20× zombies
- 10× orcs
- 5× ogres

### 2. Use Descriptive Monster Types
Instead of generic types, be specific:
- ❌ "undead" → ✅ "skeletal archer"
- ❌ "humanoid" → ✅ "bandit crossbowman"
- ❌ "beast" → ✅ "dire wolf"

### 3. Batch Generate
Generate all monsters for an encounter at once:
```bash
# Instead of 3 separate calls, do one call with count=3
curl ... -d '{"monsterType": "orc", "cr": 0.5, "count": 3}'
```

### 4. Combine with SRD Compendium
- **AI-generate**: Unique monsters, bosses, special enemies
- **SRD drag-and-drop**: Generic fodder (goblins, zombies, etc.)

## Future Enhancements

Planned features:
- [ ] Bulk monster generation from encounter descriptions
- [ ] Monster stat adjustments (scale HP/damage)
- [ ] Monster variant generation (elite, weakened versions)
- [ ] Export to Foundry compendium packs
- [ ] Monster search and filtering
- [ ] Pre-built monster packs by CR/type

## Summary

The Monster Generation API gives you:

✅ **Fast monster creation** (10-15 seconds)
✅ **Foundry v13 compatible**
✅ **Campaign-aware** AI generation
✅ **Auto-generated tokens**
✅ **One-click Foundry sync**
✅ **Minimal DM handling**

**Perfect for zero-prep DMing!** 🎲
