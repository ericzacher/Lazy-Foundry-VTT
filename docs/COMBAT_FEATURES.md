# Combat Enhancement Features

**Lazy Foundry VTT - Automatic Combat Scene Generation**

This document describes the combat enhancement features that enable automatic token placement and intelligent encounter generation for Foundry VTT.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Party Configuration](#party-configuration)
3. [CR Calculator](#cr-calculator)
4. [Encounter Generation](#encounter-generation)
5. [Automatic Token Placement](#automatic-token-placement)
6. [Complete Workflow](#complete-workflow)
7. [Technical Details](#technical-details)
8. [Troubleshooting](#troubleshooting)

---

## Overview

### The Problem

Previously, when generating combat scenarios:
- Encounters were abstract data in JSON
- DMs had to manually create actors in Foundry
- Token placement was entirely manual
- No guidance on CR/difficulty selection
- Time-consuming setup before combat could start

### The Solution

**End-to-end automated combat scene preparation:**

1. **Set party configuration** (player count + level) at campaign level
2. **Generate maps with encounters** using CR-based difficulty selection
3. **Sync to Foundry** with automatic token placement
4. **Play immediately** - combat-ready scene with positioned tokens

**Result:** 15-minute workflow from idea to playable combat encounter.

---

## Party Configuration

### Campaign-Level Defaults

**Location:** Campaign creation/edit form

**Fields:**
- **Player Count**: 1-10 players (default: 4)
- **Party Level**: 1-20 (default: 3)

**Where It's Used:**
- Default values for encounter generation
- CR calculator default values
- Displayed throughout UI

**Example:**
```
Campaign: "The Dragon's Crown"
Players: 4
Party Level: 5
```

All encounters will default to a party of 4 level-5 characters (but can be overridden per map).

### Per-Map Custom Configuration

**NEW: Override defaults for specific encounters**

**Location:** Map generation form, when "Include Combat Encounters" is enabled

**Custom Fields:**
- **Party Size**: Override campaign player count for this map
- **Party Level**: Override campaign level for this map

**Use Cases:**
- **Absent Players**: Generate for 3 players instead of usual 4
- **Level Variance**: Create encounters for level 7 when campaign is level 5
- **Side Quests**: Balance differently than main campaign
- **Playtesting**: Test encounters for different party compositions

**Example:**
```
Campaign Defaults: 4 players, Level 5
Custom Config for This Map: 3 players, Level 7

Result: Encounters balanced for 3 level-7 characters
```

**How to Use:**
1. Navigate to Maps tab
2. Enable "Include Combat Encounters"
3. See "Party Size" and "Party Level" inputs
4. Input fields show campaign defaults in labels
5. Enter custom values to override
6. Leave blank to use campaign defaults
7. Click "🧮 CR Calculator" to verify balance

### Updating Party Configuration

**Campaign Defaults:**
1. Go to campaign dashboard
2. Edit campaign settings
3. Update "Player Count" and "Party Level"
4. Save

**Per-Map Custom:**
1. In map generation form
2. Adjust "Party Size" or "Party Level" fields
3. Use CR Calculator to verify difficulty
4. Generate with custom values

---

## CR Calculator

### Accessing the Calculator

**Location:** Map generation form, click "🧮 CR Calculator" button

### What It Shows

#### 1. Party Configuration (Interactive)
- **Party Size**: Adjustable (1-10)
- **Party Level**: Adjustable (1-20)
- **Default Values**: Shows current form values or campaign defaults
- **Interactive**: Change values to preview different scenarios

**NEW: Apply & Close Functionality**
- After adjusting party size/level in calculator
- Click "Apply & Close" to update the map generation form
- Values are applied to "Party Size" and "Party Level" inputs
- Use this to quickly try different configurations

#### 2. XP Thresholds
Shows total party XP for each difficulty:

**Example (4 players, Level 5):**
- **Easy**: 1,000 XP
- **Medium**: 2,000 XP
- **Hard**: 3,000 XP
- **Deadly**: 4,400 XP

#### 3. Recommended CR Ranges
Shows appropriate CR values for each difficulty:

**Example (4 players, Level 5):**
- **Easy**: CR 1/2 - 1
- **Medium**: CR 1 - 2
- **Hard**: CR 2 - 3
- **Deadly**: CR 3 - 5

#### 4. Understanding CR Guide

**Easy Difficulty:**
- Most characters won't be hurt badly
- Resource drain only
- Good for: Random encounters, weak guards

**Medium Difficulty:**
- One or two might get hurt
- Short rest needed after
- Good for: Standard combat, patrol groups

**Hard Difficulty:**
- Dangerous fight
- Long rest recommended
- Good for: Elite enemies, boss minions

**Deadly Difficulty:**
- One or more characters could die
- Uses all resources
- Good for: Major boss fights, climactic battles

### CR Calculation Details

Based on official D&D 5e encounter building rules:

**CR to XP Mapping:**
```
CR 0     = 10 XP
CR 1/8   = 25 XP
CR 1/4   = 50 XP
CR 1/2   = 100 XP
CR 1     = 200 XP
CR 2     = 450 XP
CR 3     = 700 XP
... up to CR 30
```

**XP Thresholds Per Level:**
```
Level 1: Easy=25, Medium=50, Hard=75, Deadly=100
Level 5: Easy=250, Medium=500, Hard=750, Deadly=1100
Level 10: Easy=600, Medium=1200, Hard=1900, Deadly=2800
Level 20: Easy=2800, Medium=5700, Hard=8500, Deadly=12700
```

**Party Threshold = Individual Threshold × Party Size**

---

## Encounter Generation

### Generating Encounters with Maps

#### Step 1: Navigate to Maps Tab

From campaign dashboard → Maps

#### Step 2: Configure Map

- **Map Type**: Dungeon, Cave, Building, etc.
- **Description**: "Ancient dwarven forge beneath a volcano"

#### Step 3: Enable Encounters

✅ **Check "Include Combat Encounters"**

**Configuration Options:**
- **Number of Encounters**: 1-4
- **Difficulty**: Easy 🟢 / Medium 🟡 / Hard 🟠 / Deadly 🔴
- **Party Size (Custom)**: Override campaign default (optional)
- **Party Level (Custom)**: Override campaign default (optional)

**Default Behavior:**
- Uses campaign's player count and party level
- Input fields show defaults in labels: "Party Size (defaults to 4)"

**Custom Override:**
- Enter different values to generate for specific party
- Example: Campaign has 4 players, but generate for 3 (someone absent)
- Click "🧮 CR Calculator" to verify balance for custom values

**Workflow Example:**
```
1. Campaign defaults: 4 players, Level 5
2. Leave inputs blank → generates for 4 players, Level 5
3. Enter custom: 3 players, Level 7 → generates for 3 players, Level 7
4. Use CR Calculator to preview difficulty
5. Apply calculator values back to form if adjusting
```

#### Step 4: Generate

Click "Generate Map with Encounters"

**Processing:**
1. Generates map layout
2. Calls `generateDetailedEncounters()` API
3. Creates 3 encounter options (AI picks best based on difficulty)
4. Attaches encounters to map details
5. If linked to session, updates session scenario

### Generated Encounter Structure

```json
{
  "name": "Goblin Ambush",
  "description": "A group of goblins hiding in the shadows...",
  "difficulty": "medium",
  "challengeRating": "2",
  "enemies": [
    {
      "name": "Goblin Warrior",
      "count": 4,
      "cr": "1/4",
      "hitPoints": 7,
      "armorClass": 15,
      "abilities": [
        "Nimble Escape",
        "Pack Tactics"
      ],
      "tactics": "Use hit-and-run tactics, focus fire on weakest PC"
    },
    {
      "name": "Goblin Boss",
      "count": 1,
      "cr": "1",
      "hitPoints": 21,
      "armorClass": 17,
      "abilities": [
        "Redirect Attack",
        "Leadership"
      ],
      "tactics": "Stay back, command minions, retreat if alone"
    }
  ],
  "terrain": "Rocky cave passage with stalagmites for cover",
  "objectives": [
    "Defeat the goblins",
    "Rescue the captured merchant"
  ],
  "rewards": [
    "120 XP",
    "35 gold pieces",
    "Goblin boss's +1 scimitar"
  ],
  "tacticalNotes": "Goblins use terrain for hit-and-run. Boss flees at half HP.",
  "alternativeResolutions": [
    "Intimidate goblins into fleeing",
    "Negotiate passage with food offering"
  ]
}
```

### Important JSON Requirements

**All CR values MUST be strings:**
- ✅ `"cr": "1/4"`
- ✅ `"cr": "1/2"`
- ✅ `"cr": "3"`
- ❌ `"cr": 1/4` (causes JSON parse error)

**Rewards must be simple strings:**
- ✅ `"rewards": ["120 XP", "Magic sword +1"]`
- ❌ `"rewards": [{"type": "xp", "value": 120}]`

**Alternative resolutions must be strings:**
- ✅ `"alternativeResolutions": ["Intimidate them", "Bribe with gold"]`
- ❌ `"alternativeResolutions": [{"description": "Intimidate them"}]`

---

## Automatic Token Placement

### How It Works

When you sync a session (not bulk sync!) that has:
- ✅ A generated scenario with encounters
- ✅ At least one map

The system automatically:
1. Expands enemy counts to individual enemies
2. Selects appropriate rooms for placement
3. Calculates token positions
4. Creates Foundry actors
5. Places tokens on the scene

### Room Selection Algorithm

**Criteria:**
1. **Skip room[0]**: Assumed to be player spawn area
2. **Filter by size**: Rooms must be ≥4x4 grid units
3. **Sort by distance**: Furthest rooms from origin first
4. **Round-robin distribution**: Spreads encounters across multiple rooms

**Example:**
```
Map has 8 rooms
3 encounters to place

Room selection:
- Skip room[0] (player spawn)
- Filter: rooms[1,2,3,5,7] are big enough
- Sort by distance: [7, 5, 3, 2, 1]
- Encounter 1 → Room 7
- Encounter 2 → Room 5
- Encounter 3 → Room 3
```

### Position Calculation

**1 Enemy:**
- Position: Room center + random jitter (±0.3 grid units)
- Purpose: Natural-looking placement, not perfectly centered

**2-4 Enemies:**
- Formation: Circular around room center
- Radius: 25% of max(room.width, room.height)
- Purpose: Spread out formation, tactical positioning

**5+ Enemies:**
- Formation: Grid layout
- Spacing: Largest enemy size × 1.2 (prevents overlap)
- Purpose: Organized groups, room for movement

**Coordinate Conversion:**
```
pixelX = gridX × gridSize
pixelY = gridY × gridSize

Where gridSize = 100 (Foundry standard)
```

### Enemy Expansion

**Input:**
```json
{
  "name": "Goblin",
  "count": 3
}
```

**Expands to:**
```
Goblin 1
Goblin 2
Goblin 3
```

**Naming Rules:**
- count = 1: Use name as-is
- count > 1: Add numbering (1, 2, 3...)

### Token Sizing

**Size Mapping:**
```
Tiny       → 0.5 × 0.5 grid units
Small      → 1 × 1 grid units
Medium     → 1 × 1 grid units
Large      → 2 × 2 grid units
Huge       → 3 × 3 grid units
Gargantuan → 4 × 4 grid units
```

**Size Inference:**
If enemy doesn't specify size, system infers from name:
- "tiny", "sprite", "pixie" → Tiny
- "small", "goblin", "kobold" → Small
- "large", "ogre", "troll" → Large
- "huge", "giant", "dragon" → Huge
- "gargantuan", "tarrasque" → Gargantuan
- Default → Medium

### Token Properties

All tokens created with:
- **disposition**: -1 (hostile, red border)
- **width/height**: Based on size mapping
- **actorId**: Linked to created Foundry actor
- **x/y**: Calculated pixel coordinates
- **displayName**: 20 (owner hover)
- **displayBars**: 20 (owner hover)

### Actor Creation

Each enemy becomes a Foundry actor with:
```json
{
  "name": "Goblin 1",
  "type": "npc",
  "system": {
    "attributes": {
      "hp": {
        "value": 7,
        "max": 7
      },
      "ac": {
        "value": 15
      }
    },
    "details": {
      "cr": "1/4"
    }
  }
}
```

---

## Complete Workflow

### End-to-End: Idea to Combat-Ready Scene

**Total Time: ~15 minutes**

#### Step 1: Set Party Configuration (1 min, one-time)

1. Navigate to campaign
2. Edit campaign settings
3. Set player count: 4
4. Set party level: 5
5. Save

#### Step 2: Generate Map with Encounters (5 min)

1. Go to Maps tab
2. Select map type: "Dungeon"
3. Describe: "Ancient dwarven forge infested with fire elementals"
4. ✅ Check "Include Combat Encounters"
5. Select: 2 encounters
6. Choose difficulty: Medium
7. **(Optional)** Customize party size/level if different from campaign defaults
8. **(Optional)** Click "🧮 CR Calculator" to preview difficulty and adjust values
9. Click "Generate Map with Encounters"
10. Wait for generation (~30 seconds)

#### Step 3: Review Generated Content (3 min)

1. Check map layout
2. Read encounter descriptions
3. Review enemy stats and tactics
4. Note rewards and alternative resolutions
5. Read tactical notes

#### Step 4: Sync to Foundry (2 min)

1. Find session linked to this map
2. Click "🎲 Sync" button next to session
3. Confirm sync prompt
4. Wait for completion

**Sync Results:**
```
Sync completed!
Scenes: 1 synced, 0 failed
Actors: 8 synced, 0 failed
Journals: 1 synced, 0 failed
Tokens: 12 placed, 0 failed
```

#### Step 5: Verify in Foundry (4 min)

1. Open Foundry VTT (http://localhost:30000)
2. Navigate to Scenes tab
3. Open newly synced scene
4. Check:
   - ✅ Map rendered correctly
   - ✅ Walls and doors present
   - ✅ Enemy tokens positioned
   - ✅ Token sizes correct
   - ✅ Red borders (hostile)
5. Click enemy token → View actor sheet
6. Verify HP/AC values
7. **Ready to play!**

---

## Technical Details

### File Structure

**Backend:**
```
/api/src/
├── services/
│   ├── encounterPlacement.ts    (NEW - Token placement logic)
│   ├── ai.ts                     (Modified - Fixed CR generation)
│   └── foundrySync.ts            (Existing - Foundry integration)
├── routes/
│   ├── foundry.ts                (Modified - Added sessionId param)
│   └── generate.ts               (Modified - Encounter generation)
└── entities/
    └── Campaign.ts               (Modified - Added partyLevel field)
```

**Frontend:**
```
/web/src/
├── components/
│   └── CRCalculator.tsx          (NEW - CR calculator modal)
├── pages/
│   ├── CampaignDetail.tsx        (Modified - Encounter config UI)
│   └── Dashboard.tsx             (Modified - Party level field)
├── services/
│   └── api.ts                    (Modified - encounterConfig param)
└── types/
    └── index.ts                  (Modified - Added partyLevel)
```

### API Endpoints

#### Generate Map with Encounters

**Endpoint:** `POST /api/generate/campaigns/:id/maps`

**Request:**
```json
{
  "description": "Ancient dwarven forge",
  "mapType": "dungeon",
  "sessionId": "uuid-here",
  "encounterConfig": {
    "count": 2,
    "difficulty": "medium",
    "partyLevel": 5,
    "partySize": 4
  }
}
```

**Response:**
```json
{
  "map": {
    "id": "uuid",
    "name": "Ancient Forge",
    "details": {
      "encounters": [
        /* Generated encounters */
      ]
    },
    "foundryData": {
      "rooms": [
        /* Room data with centerX, centerY */
      ]
    }
  }
}
```

#### Bulk Sync with Token Placement

**Endpoint:** `POST /api/foundry/campaigns/:id/bulk`

**Request:**
```json
{
  "sessionId": "uuid-here"
}
```

**Response:**
```json
{
  "success": true,
  "results": {
    "scenes": { "success": 1, "failed": 0 },
    "actors": { "success": 8, "failed": 0 },
    "journals": { "success": 1, "failed": 0 },
    "tokens": { "success": 12, "failed": 0 }
  }
}
```

### Database Schema

**Campaign Table:**
```sql
ALTER TABLE campaigns
ADD COLUMN party_level INTEGER DEFAULT 3;
```

**Session Table:**
```sql
-- scenario column stores encounters
scenario JSONB
```

**Map Table:**
```sql
-- foundryData stores room positions
foundry_data JSONB
```

### Key Functions

#### `placeEncounterTokens(sessionId, sceneId, foundrySyncService)`

**Purpose:** Main token placement orchestrator

**Process:**
1. Load session and scenario data
2. Load map with room data
3. For each encounter:
   - Expand enemies by count
   - Select room for placement
   - Calculate token positions
   - Create Foundry actors
   - Return placement data
4. Return all placements

#### `expandEnemyCount(enemies)`

**Purpose:** Flatten count field to individual enemies

**Input:**
```javascript
[{ name: "Goblin", count: 3 }]
```

**Output:**
```javascript
[
  { name: "Goblin 1", cr: "1/4", ... },
  { name: "Goblin 2", cr: "1/4", ... },
  { name: "Goblin 3", cr: "1/4", ... }
]
```

#### `selectRoomsForEncounters(rooms, encounterCount)`

**Purpose:** Choose appropriate rooms

**Algorithm:**
1. Filter rooms ≥4x4
2. Sort by distance from (0,0)
3. Return top N (furthest rooms)

#### `calculateTokenPositions(enemies, room, gridSize)`

**Purpose:** Determine x,y coordinates for tokens

**Returns:**
```javascript
[
  { x: 1250, y: 800, enemy: {...} },
  { x: 1350, y: 900, enemy: {...} },
  ...
]
```

---

## Troubleshooting

### JSON Generation Errors

**Error:** `Failed to generate JSON. Please adjust your prompt.`

**Cause:** AI generated invalid JSON (CR values not quoted)

**Solution:**
- System now explicitly requires string CR values
- Retry generation
- Check API logs: `make logs-api`
- Verify Groq API key is valid

### Tokens Not Appearing

**Problem:** Synced but no tokens in Foundry

**Checklist:**
- ✅ Used "🎲 Sync" button (not bulk sync)
- ✅ Session has scenario with encounters
- ✅ Session has linked map
- ✅ Map has room data in foundryData
- ✅ Sync results show token count > 0

**Debug:**
```bash
# Check API logs
make logs-api

# Look for:
[EncounterPlacement] Processing N encounter(s)
[EncounterPlacement] Created actor for X
[Bulk Sync] Token placement complete: N success
```

### Token Positioning Issues

**Problem:** Tokens overlapping or poorly positioned

**Causes:**
- Rooms too small (< 4x4)
- Too many enemies for room size
- Map generation created unusual room shapes

**Solutions:**
- Generate map again (different layout)
- Manually adjust in Foundry
- Reduce encounter count
- Choose larger map type

### Wrong Token Sizes

**Problem:** Medium creature shows as Large

**Cause:** Size inference from name

**Solution:**
- Edit encounter enemy data
- Explicitly set size field
- Resync

### Encounter Balance Issues

**Problem:** Encounters too easy or too hard

**Causes:**
- Wrong party level set
- Party smaller/larger than expected
- Difficulty miscalculated

**Solutions:**
- Use CR calculator to verify
- Update campaign party level
- Choose different difficulty
- Remember action economy (many weak > one strong)

---

## Best Practices

### Party Configuration
- ✅ Update party level as they progress
- ✅ Account for missing players (reduce party size temporarily)
- ✅ Consider party composition (all melee vs balanced)

### Encounter Generation
- ✅ Use CR calculator before selecting difficulty
- ✅ Mix encounter difficulties in a session
- ✅ Read tactical notes before running
- ✅ Prepare alternative resolutions

### Token Placement
- ✅ Review positions in Foundry before session
- ✅ Adjust manually if needed (system does 90%)
- ✅ Use tactical positioning hints from encounter
- ✅ Consider line of sight and cover

### Session Workflow
- ✅ Generate encounters 24 hours before session
- ✅ Sync to Foundry night before
- ✅ Review and adjust in Foundry
- ✅ Have backup encounters ready

---

## Feature Roadmap

### Planned Enhancements

**Short Term:**
- [ ] Save CR calculator preferences
- [ ] Encounter difficulty preview before generation
- [ ] Token vision/detection pre-configuration
- [ ] Initiative ordering suggestions

**Medium Term:**
- [ ] Multi-room encounter support
- [ ] Environmental hazards auto-placement
- [ ] Treasure placement automation
- [ ] Trap integration

**Long Term:**
- [ ] AI-driven tactical AI for enemies
- [ ] Dynamic encounter scaling
- [ ] Player statistics integration
- [ ] Combat pacing analysis

---

## Support

### Getting Help

**Documentation:**
- [DM Guide](DM_GUIDE.md) - Complete usage guide
- [Quick Start](QUICK_START.md) - Getting started
- [Makefile Reference](MAKEFILE_REFERENCE.md) - System commands

**Debugging:**
```bash
# View logs
make logs-api

# Check health
make health

# Restart if stuck
make restart
```

**Common Issues:**
See [Troubleshooting](#troubleshooting) section above

---

**Last Updated:** February 2026
**Version:** 1.1 (Phase 6 Complete + Enhanced Party Configuration)
