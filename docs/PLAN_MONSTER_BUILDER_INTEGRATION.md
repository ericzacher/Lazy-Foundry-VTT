# Lazy Monster Builder Integration Plan

**Goal:** Integrate the Lazy GM's 5e Monster Builder methodology into Lazy Foundry VTT, enabling GMs to generate balanced, CR-appropriate monsters on the fly and sync them directly to Foundry VTT as fully-formed actors.

**Dependencies:** Existing NPC generation (Phase 2), Foundry sync service (Phase 4), encounter generation system

**License:** The Lazy GM's 5e Monster Builder Resource Document is CC-BY-4.0, authored by Teos Abadia, Scott Fitzgerald Gray, and Michael E. Shea. The stat tables and formulas can be freely used with attribution.

---

## 1. Problem Statement

The current system generates NPCs with basic ability scores (STR/DEX/CON/INT/WIS/CHA values 8-18) and encounters with ad-hoc HP/AC values. There is no structured, rules-grounded system for producing combat-ready monster stat blocks. The AI sometimes generates unbalanced stats because it has no constraint framework.

The Lazy Monster Builder solves this by providing:
- A deterministic CR-to-stats lookup table (CR 0-30)
- Quick formulas for deriving AC, HP, attack bonus, and damage
- Seven reskinnable general-use stat block templates
- Ten plug-and-play monster features for customization

Integrating this gives GMs one-click monster generation that is both narratively rich (via AI) and mechanically balanced (via the stat tables).

---

## 2. Data Foundation: Monster Statistics by CR

### 2.1 The Core Table

The monster builder is grounded in a single reference table mapping CR to baseline combat statistics. This data will be stored as a static JSON file in the API.

| CR | AC | HP | Prof Bonus | Dmg/Round | # Attacks | Dmg/Attack | Save DC |
|----|----|----|------------|-----------|-----------|------------|---------|
| 0 | 10 | 3 | +2 | 2 | 1 | 2 (1d4) | 10 |
| 1/8 | 11 | 9 | +3 | 3 | 1 | 4 (1d6+1) | 11 |
| 1/4 | 11 | 13 | +3 | 5 | 1 | 5 (1d6+2) | 11 |
| 1/2 | 12 | 22 | +4 | 8 | 2 | 4 (1d4+2) | 12 |
| 1 | 12 | 33 | +5 | 12 | 2 | 6 (1d8+2) | 12 |
| 2 | 13 | 45 | +5 | 17 | 2 | 9 (2d6+2) | 13 |
| 3 | 13 | 65 | +5 | 23 | 2 | 12 (2d8+3) | 13 |
| 4 | 14 | 84 | +6 | 28 | 2 | 14 (3d8+1) | 14 |
| 5 | 15 | 95 | +7 | 35 | 3 | 12 (3d6+2) | 15 |
| 6 | 15 | 112 | +7 | 41 | 3 | 14 (3d6+4) | 15 |
| 7 | 15 | 130 | +7 | 47 | 3 | 16 (3d8+3) | 15 |
| 8 | 15 | 136 | +7 | 53 | 3 | 18 (3d10+2) | 15 |
| 9 | 16 | 145 | +8 | 59 | 3 | 19 (3d10+3) | 16 |
| 10 | 17 | 155 | +9 | 65 | 4 | 16 (3d8+3) | 17 |
| 11 | 17 | 165 | +9 | 71 | 4 | 18 (3d10+2) | 17 |
| 12 | 17 | 175 | +9 | 77 | 4 | 19 (3d10+3) | 17 |
| 13 | 18 | 184 | +10 | 83 | 4 | 21 (4d8+3) | 18 |
| 14 | 19 | 196 | +11 | 89 | 4 | 22 (4d10) | 19 |
| 15 | 19 | 210 | +11 | 95 | 5 | 19 (3d10+3) | 19 |
| 16 | 19 | 229 | +11 | 101 | 5 | 21 (4d8+3) | 19 |
| 17 | 20 | 246 | +12 | 107 | 5 | 22 (3d12+3) | 20 |
| 18 | 21 | 266 | +13 | 113 | 5 | 23 (4d10+1) | 21 |
| 19 | 21 | 285 | +13 | 119 | 5 | 24 (4d10+2) | 21 |
| 20 | 21 | 300 | +13 | 132 | 5 | 26 (4d12) | 21 |
| 21 | 22 | 325 | +14 | 150 | 5 | 30 (4d12+4) | 22 |
| 22 | 23 | 350 | +15 | 168 | 5 | 34 (4d12+8) | 23 |
| 23 | 23 | 375 | +15 | 186 | 5 | 37 (6d10+4) | 23 |
| 24 | 23 | 400 | +15 | 204 | 5 | 41 (6d10+8) | 23 |
| 25 | 24 | 430 | +16 | 222 | 5 | 44 (6d10+11) | 24 |
| 26 | 25 | 460 | +17 | 240 | 5 | 48 (6d10+15) | 25 |
| 27 | 25 | 490 | +17 | 258 | 5 | 52 (6d10+19) | 25 |
| 28 | 25 | 540 | +17 | 276 | 5 | 55 (6d10+22) | 25 |
| 29 | 26 | 600 | +18 | 294 | 5 | 59 (6d10+26) | 26 |
| 30 | 27 | 666 | +19 | 312 | 5 | 62 (6d10+29) | 27 |

### 2.2 Quick Formulas (Alternative to Table Lookup)

For any CR, these formulas approximate the table values:

- **AC** = 12 + (CR / 2), rounded down
- **HP** = (15 x CR) + 15
- **Attack Bonus** = 4 + (CR / 2), rounded down
- **Damage per Round** = (7 x CR) + 5
- **Save DC** = AC (same as AC in the table)
- **Proficiency Bonus** = 2 + (CR / 4), rounded up

### 2.3 General-Use Stat Block Templates

Seven reskinnable base templates at different power tiers:

| Template | CR | Role | Notes |
|----------|----|------|-------|
| Minion | 1/8 | Weak fodder | 1 attack, low HP |
| Soldier | 1 | Standard combatant | 2 attacks, balanced |
| Brute | 3 | Heavy hitter | High HP, fewer attacks |
| Specialist | 5 | Tactical threat | 3 attacks, special abilities |
| Myrmidon | 7 | Elite warrior | Multiattack, high damage |
| Sentinel | 11 | Boss-tier | 4 attacks, legendary-adjacent |
| Champion | 15 | Legendary threat | 5 attacks, very high stats |

### 2.4 Ten Useful Monster Features

Plug-and-play abilities to add mechanical flavor:

1. **Damaging Blast** - Ranged attack, single target, full damage
2. **Damage Reflection** - Melee attackers take damage back
3. **Misty Step** - Bonus action 30ft teleport
4. **Knockdown** - Target must save or fall prone
5. **Restraining Grab** - Target grappled and restrained
6. **Damaging Burst** - AoE, half damage on save, affects 2+ targets
7. **Cunning Action** - Bonus action dash/disengage/hide
8. **Damaging Aura** - Creatures starting turn nearby take damage
9. **Energy Weapons** - Attacks deal extra elemental damage
10. **Damage Transference** - Redirect damage to nearby ally

---

## 3. Architecture Overview

### 3.1 New Files

```
api/
├── src/
│   ├── data/
│   │   └── monsterStatsByCR.json          # Static CR table data
│   ├── entities/
│   │   └── Monster.ts                     # New Monster entity (extends beyond NPC)
│   ├── services/
│   │   └── monsterBuilder.ts              # Core builder logic
│   ├── routes/
│   │   └── monsters.ts                    # Monster CRUD + generation endpoints
│   └── types/
│       └── monster.ts                     # TypeScript interfaces
web/
├── src/
│   ├── components/
│   │   └── MonsterBuilder/
│   │       ├── MonsterBuilderPanel.tsx     # Main builder UI
│   │       ├── CRSelector.tsx             # CR picker with stat preview
│   │       ├── MonsterFeaturePicker.tsx    # Feature selection UI
│   │       ├── MonsterStatBlock.tsx        # Stat block display/edit
│   │       └── MonsterCard.tsx            # Compact monster card for lists
│   └── types/
│       └── monster.ts                     # Frontend type definitions
```

### 3.2 How It Fits Into Existing Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Frontend (React)                       │
│                                                          │
│  CampaignDetail Page                                     │
│  ├── NPCs Tab (existing)                                 │
│  ├── Maps Tab (existing)                                 │
│  ├── Encounters Tab (existing)                           │
│  └── Monsters Tab (NEW)  ←── MonsterBuilderPanel         │
│       ├── Quick Build (CR → instant stat block)          │
│       ├── AI Build (description → themed monster)        │
│       └── Encounter Build (party info → monster group)   │
└───────────────────────┬──────────────────────────────────┘
                        │ HTTP
┌───────────────────────▼──────────────────────────────────┐
│                    API (Express)                          │
│                                                          │
│  /api/monsters/*  (NEW routes)                           │
│  ├── POST /generate          Quick build from CR         │
│  ├── POST /generate/ai       AI-enhanced build           │
│  ├── POST /generate/encounter Build for encounter        │
│  ├── GET  /campaigns/:id     List campaign monsters      │
│  ├── PUT  /:id               Edit monster                │
│  └── DELETE /:id             Delete monster               │
│                                                          │
│  monsterBuilder.ts (NEW service)                         │
│  ├── buildFromCR()           Table lookup + stat block   │
│  ├── buildFromAI()           AI desc + table stats       │
│  ├── buildForEncounter()     Party-balanced group        │
│  ├── addFeature()            Attach monster features     │
│  └── toFoundryActor()        Convert to Foundry format   │
│                                                          │
│  ai.ts (MODIFIED)                                        │
│  └── generateMonsterDescription()  NEW function          │
│                                                          │
│  foundrySync.ts (EXISTING - no changes needed)           │
│  └── createActor()           Already handles NPC actors  │
└───────────────────────┬──────────────────────────────────┘
                        │ Socket.io
┌───────────────────────▼──────────────────────────────────┐
│              Foundry VTT (D&D 5e System)                 │
│                                                          │
│  Actor (type: "npc")                                     │
│  ├── Abilities (STR/DEX/CON/INT/WIS/CHA)                │
│  ├── HP, AC, Speed                                       │
│  ├── Attacks (Items of type "weapon")                    │
│  ├── Features (Items of type "feat")                     │
│  └── Token (image, size, vision)                         │
└──────────────────────────────────────────────────────────┘
```

---

## 4. Implementation Steps

### Step 1: Static Data Layer

**File:** `api/src/data/monsterStatsByCR.json`

Create the JSON file containing the full CR table from Section 2.1, the seven general-use stat block templates, the ten monster features, and example monsters per CR. This is a static, read-only dataset loaded at startup.

**File:** `api/src/types/monster.ts`

Define TypeScript interfaces:

```typescript
interface MonsterStatsByCR {
  cr: string;              // "0", "1/8", "1/4", "1/2", "1" ... "30"
  ac: number;
  hp: number;
  hpRange: { min: number; max: number };
  proficiencyBonus: number;
  damagePerRound: number;
  numAttacks: number;
  damagePerAttack: { average: number; dice: string };
  saveDC: number;
  exampleMonsters: string[];
}

interface MonsterFeature {
  id: string;
  name: string;
  description: string;
  effect: string;           // Mechanical description
  damageScaling: boolean;   // Whether damage scales with CR
}

interface MonsterTemplate {
  id: string;               // "minion", "soldier", etc.
  name: string;
  cr: string;
  abilities: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
  savingThrows: string[];
  skills: string[];
  speed: string;
  attacks: MonsterAttack[];
}

interface GeneratedMonster {
  id: string;
  campaignId: string;
  name: string;
  cr: string;
  type: string;             // "beast", "fiend", "undead", etc.
  size: string;             // "tiny" ... "gargantuan"
  alignment: string;
  description: string;
  ac: number;
  hp: number;
  hpDice: string;
  speed: Record<string, number>;  // { walk: 30, fly: 60 }
  abilities: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
  savingThrows: Record<string, number>;
  skills: Record<string, number>;
  damageResistances: string[];
  damageImmunities: string[];
  conditionImmunities: string[];
  senses: string[];
  languages: string[];
  proficiencyBonus: number;
  attacks: MonsterAttack[];
  features: MonsterFeature[];
  legendaryActions?: LegendaryAction[];
  lairActions?: string[];
  tactics: string;          // AI-generated tactical notes
  // Foundry sync
  foundryActorId?: string;
  syncStatus: 'never' | 'pending' | 'synced' | 'error';
  tokenImageUrl?: string;
}
```

### Step 2: Monster Entity

**File:** `api/src/entities/Monster.ts`

A new TypeORM entity dedicated to monsters. Separate from NPC because monsters carry combat-specific data (attacks, features, resistances, legendary actions) that NPCs don't need.

Key columns:
- Core identity: `name`, `cr`, `type`, `size`, `alignment`, `description`
- Combat stats: `ac`, `hp`, `hpDice`, `speed` (JSONB), `abilities` (JSONB)
- Offenses: `attacks` (JSONB array), `features` (JSONB array)
- Defenses: `damageResistances`, `damageImmunities`, `conditionImmunities` (text arrays)
- Senses and languages (text arrays)
- Optional: `legendaryActions` (JSONB), `lairActions` (text array)
- AI-generated: `tactics` (text), `description` (text)
- Foundry: `foundryActorId`, `syncStatus`, `tokenImageUrl`
- Relations: `campaignId` (FK to Campaign)

### Step 3: Monster Builder Service

**File:** `api/src/services/monsterBuilder.ts`

This is the core logic. Three build modes:

#### 3a. Quick Build (`buildFromCR`)

Input: CR, name, creature type, size
Process:
1. Look up CR in the static table
2. Derive ability scores from CR (CON drives HP, STR/DEX drives attacks)
3. Apply the stat block template closest to the CR
4. Return a complete `GeneratedMonster`

No AI call needed. Pure table lookup + derivation. This should be instant.

#### 3b. AI-Enhanced Build (`buildFromAI`)

Input: Description/concept (e.g., "a fire-breathing lizard guardian"), CR (optional), campaign context
Process:
1. Call AI to generate: name, type, size, alignment, description, tactics, damage types, special abilities flavor, and suggested CR
2. If CR not provided, use AI's suggestion
3. Look up CR table for mechanical baseline
4. Merge AI flavor with table-derived stats
5. AI picks from the ten monster features based on the concept
6. Return `GeneratedMonster` with both rich narrative and balanced mechanics

The key insight: **AI provides the fiction, the table provides the numbers.** This prevents the AI from generating unbalanced stat blocks while still getting creative monster concepts.

#### 3c. Encounter Build (`buildForEncounter`)

Input: Party level, party size, desired difficulty (easy/medium/hard/deadly), encounter theme
Process:
1. Calculate XP budget based on party level/size/difficulty (using standard 5e encounter building rules)
2. Determine monster composition (e.g., 1 boss + 3 minions, or 5 soldiers)
3. Call `buildFromAI` for each monster with appropriate CR
4. Return array of `GeneratedMonster[]` as a group

This replaces the existing `generateDetailedEncounters` AI function with a hybrid approach where the AI still provides narrative but the stats come from the deterministic table.

### Step 4: Foundry Actor Conversion

**Method:** `toFoundryActor(monster: GeneratedMonster)`

Converts a `GeneratedMonster` into the D&D 5e actor format that the existing `foundrySync.createActor()` method expects.

Mapping:
- `monster.abilities` → `system.abilities.{str,dex,con,int,wis,cha}.value`
- `monster.hp` → `system.attributes.hp.value` and `.max`
- `monster.ac` → `system.attributes.ac.flat`
- `monster.speed` → `system.attributes.movement`
- `monster.attacks` → Array of Items with `type: "weapon"`
- `monster.features` → Array of Items with `type: "feat"`
- `monster.cr` → `system.details.cr`
- `monster.type` → `system.details.type.value`
- Token data from existing `tokenGenerator.ts`

This reuses the existing Foundry sync infrastructure entirely. No changes to `foundrySync.ts` needed.

### Step 5: API Routes

**File:** `api/src/routes/monsters.ts`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/monsters/generate` | Quick build: CR + name → stat block |
| `POST` | `/api/monsters/generate/ai` | AI build: description → themed monster |
| `POST` | `/api/monsters/generate/encounter` | Encounter build: party info → monster group |
| `GET` | `/api/monsters/campaigns/:id` | List all monsters for a campaign |
| `GET` | `/api/monsters/:id` | Get single monster |
| `PUT` | `/api/monsters/:id` | Update/customize a monster |
| `DELETE` | `/api/monsters/:id` | Delete a monster |
| `POST` | `/api/monsters/:id/token` | Generate token image for a monster |
| `POST` | `/api/foundry/monsters/:id` | Sync monster to Foundry as actor |

Mount in `api/src/index.ts` alongside existing routes.

### Step 6: Enhance Existing Encounter Generation

Modify `api/src/services/ai.ts` → `generateDetailedEncounters()`:

Currently the AI invents HP/AC/abilities for encounter enemies. Change this so:
1. AI generates the narrative (enemy names, descriptions, tactics, terrain)
2. For each enemy, look up the CR table to fill in AC, HP, attack bonus, damage
3. Return encounters with both AI narrative and table-balanced stats

This is a non-breaking enhancement. The `GeneratedEncounter` interface stays the same, but the `enemies` array gets more accurate stats.

### Step 7: Frontend - Monster Builder Panel

**File:** `web/src/components/MonsterBuilder/MonsterBuilderPanel.tsx`

A new tab on the CampaignDetail page, alongside NPCs, Maps, and Encounters.

Three modes accessible via sub-tabs or toggle:

**Quick Build Mode:**
- CR slider/dropdown (0-30)
- Name text field
- Creature type dropdown (aberration, beast, celestial, construct, dragon, elemental, fey, fiend, giant, humanoid, monstrosity, ooze, plant, undead)
- Size dropdown
- Live stat preview that updates as CR changes
- "Generate" button → instant, no AI call

**AI Build Mode:**
- Text area for monster concept description
- Optional CR override
- Campaign context auto-populated
- "Generate" button → calls AI endpoint
- Editable stat block result

**Encounter Build Mode:**
- Party level input
- Party size input
- Difficulty selector (easy/medium/hard/deadly)
- Theme text area
- "Generate Encounter" button → returns group of monsters
- Bulk "Sync All to Foundry" button

**Shared UI elements:**
- `MonsterStatBlock.tsx` - Renders a full stat block in the familiar D&D style
- `MonsterCard.tsx` - Compact card for list views with name, CR, type, HP, AC
- `CRSelector.tsx` - CR picker that shows stat preview on hover
- `MonsterFeaturePicker.tsx` - Checkbox list of the 10 features, with descriptions
- "Edit" mode on any stat block to manually tweak values
- "Sync to Foundry" button per monster
- "Generate Token" button per monster (reuses existing token generation)

### Step 8: Wire Up to Existing Campaign Page

Modify `web/src/pages/CampaignDetail.tsx`:

- Add a "Monsters" tab alongside existing tabs (Sessions, Lore, NPCs, Maps)
- The tab renders `MonsterBuilderPanel` with the campaign ID
- Monsters list fetched from `GET /api/monsters/campaigns/:id`
- Each monster card has: View, Edit, Generate Token, Sync to Foundry actions

### Step 9: Integration with Existing Encounter Tab

The existing Encounters tab on CampaignDetail already generates encounters with enemy lists. Enhance it:

- When an encounter is generated, each enemy in the `enemies[]` array gets a "Save as Monster" button
- Clicking it calls the quick build endpoint with the enemy's CR/name, saves it as a Monster entity
- The monster then appears in the Monsters tab and can be synced to Foundry
- This bridges the gap between the "ephemeral encounter generation" and "persistent monster library"

---

## 5. Data Flow Examples

### 5.1 Quick Build Flow

```
User selects CR 5, types "Shadow Panther", picks "beast", "large"
  → POST /api/monsters/generate
    → monsterBuilder.buildFromCR("5", "Shadow Panther", "beast", "large")
      → Lookup CR 5: AC=15, HP=95, Prof=+7, 3 attacks, 12 dmg/attack
      → Derive abilities from CR (STR 18, DEX 16, CON 16, INT 3, WIS 14, CHA 6)
      → Build attacks: 3x Claw +7 to hit, 12 (3d6+2) slashing
      → Return GeneratedMonster
    → Save to DB
    → Return to frontend
  → MonsterStatBlock renders the result
```

### 5.2 AI Build Flow

```
User types "A corrupted treant infused with necrotic energy, CR 9"
  → POST /api/monsters/generate/ai
    → AI generates:
      - name: "Blightheart Treant"
      - type: "plant", size: "huge", alignment: "neutral evil"
      - description: "A massive tree twisted by dark magic..."
      - damageTypes: ["necrotic", "bludgeoning"]
      - suggestedFeatures: ["Damaging Aura", "Energy Weapons"]
      - tactics: "Uses aura to weaken melee attackers..."
    → Lookup CR 9: AC=16, HP=145, Prof=+8, 3 attacks, 19 dmg/attack
    → Merge: AI flavor + table stats
    → Add "Damaging Aura" feature (scaled to CR 9)
    → Add "Energy Weapons" (attacks deal +necrotic)
    → Return GeneratedMonster
```

### 5.3 Encounter Build Flow

```
User inputs: party level 5, party size 4, difficulty "hard", theme "undead ambush"
  → POST /api/monsters/generate/encounter
    → Calculate XP budget: ~2800 XP for hard encounter
    → Determine composition: 1x CR 3 leader + 4x CR 1/2 minions
    → AI generates themed descriptions:
      - Leader: "Wight Commander" (CR 3)
      - Minions: "Skeletal Soldiers" (CR 1/2)
    → Table lookup for each:
      - Wight Commander: AC 13, HP 65, 2 attacks, 12 dmg/attack
      - Skeletal Soldiers: AC 12, HP 22, 2 attacks, 4 dmg/attack
    → Return GeneratedMonster[]
```

---

## 6. Foundry VTT Sync Details

### 6.1 Monster → Foundry Actor Mapping

The existing `foundrySync.createActor()` already creates D&D 5e NPC actors via socket.io `modifyDocument`. Monsters use the same mechanism with richer data:

```typescript
// What we send to Foundry via modifyDocument
{
  name: monster.name,
  type: "npc",
  system: {
    abilities: {
      str: { value: monster.abilities.str },
      dex: { value: monster.abilities.dex },
      con: { value: monster.abilities.con },
      int: { value: monster.abilities.int },
      wis: { value: monster.abilities.wis },
      cha: { value: monster.abilities.cha }
    },
    attributes: {
      hp: { value: monster.hp, max: monster.hp, formula: monster.hpDice },
      ac: { flat: monster.ac },
      movement: monster.speed
    },
    details: {
      cr: parseCR(monster.cr),  // Convert "1/4" → 0.25
      type: { value: monster.type },
      alignment: monster.alignment,
      biography: { value: `<p>${monster.description}</p><p><strong>Tactics:</strong> ${monster.tactics}</p>` }
    },
    traits: {
      dr: { value: monster.damageResistances },
      di: { value: monster.damageImmunities },
      ci: { value: monster.conditionImmunities }
    }
  },
  items: [
    // Attacks become weapon items
    ...monster.attacks.map(atk => ({
      name: atk.name,
      type: "weapon",
      system: {
        attackBonus: atk.attackBonus,
        damage: { parts: [[atk.damageDice, atk.damageType]] },
        range: atk.range
      }
    })),
    // Features become feat items
    ...monster.features.map(feat => ({
      name: feat.name,
      type: "feat",
      system: {
        description: { value: `<p>${feat.description}</p><p>${feat.effect}</p>` }
      }
    }))
  ],
  prototypeToken: {
    name: monster.name,
    width: sizeToGrid(monster.size),
    height: sizeToGrid(monster.size),
    disposition: -1,  // Hostile
    texture: { src: monster.tokenImageUrl }
  }
}
```

### 6.2 Sync Route

Add to existing `api/src/routes/foundry.ts`:

```
POST /api/foundry/monsters/:monsterId
```

This follows the same pattern as the existing `POST /api/foundry/actors/:npcId` route but pulls from the Monster entity instead of NPC, and includes the richer attack/feature items.

---

## 7. Attribution

Per the CC-BY-4.0 license, the following attribution must be displayed wherever monster builder features are used in the UI:

> This product includes material from the Lazy GM's 5e Monster Builder Resource Document, written by Teos Abadia of Alphastream.org, Scott Fitzgerald Gray of Insaneangel.com, and Michael E. Shea of SlyFlourish.com, available under a Creative Commons Attribution 4.0 International License.

Add this as a footer in the MonsterBuilderPanel component and in the API response metadata.

---

## 8. Implementation Checklist

### Backend
- [ ] Create `api/src/data/monsterStatsByCR.json` with full CR table, templates, and features
- [ ] Create `api/src/types/monster.ts` with TypeScript interfaces
- [ ] Create `api/src/entities/Monster.ts` TypeORM entity
- [ ] Create `api/src/services/monsterBuilder.ts` with three build modes
- [ ] Add `generateMonsterDescription()` to `api/src/services/ai.ts`
- [ ] Create `api/src/routes/monsters.ts` with CRUD + generation endpoints
- [ ] Add `toFoundryActor()` conversion in monster builder service
- [ ] Add `POST /api/foundry/monsters/:id` sync route to `api/src/routes/foundry.ts`
- [ ] Enhance `generateDetailedEncounters()` to use CR table for stat balancing
- [ ] Register monster routes in `api/src/index.ts`

### Frontend
- [ ] Create `web/src/types/monster.ts` with frontend type definitions
- [ ] Create `MonsterBuilderPanel.tsx` with three build mode tabs
- [ ] Create `CRSelector.tsx` with live stat preview
- [ ] Create `MonsterFeaturePicker.tsx` with feature descriptions
- [ ] Create `MonsterStatBlock.tsx` for D&D-style stat block rendering
- [ ] Create `MonsterCard.tsx` for list views
- [ ] Add API service methods for monster endpoints in `web/src/services/api.ts`
- [ ] Add "Monsters" tab to `CampaignDetail.tsx`
- [ ] Add "Save as Monster" buttons to encounter enemies
- [ ] Add CC-BY-4.0 attribution footer

### Integration
- [ ] Verify monster → Foundry actor sync creates proper D&D 5e NPC actors
- [ ] Verify attack items appear correctly in Foundry character sheet
- [ ] Verify feature items appear correctly in Foundry character sheet
- [ ] Verify token images generate and sync for monsters
- [ ] Test encounter build → bulk sync flow end-to-end

---

## 9. What This Does NOT Change

- **NPC entity and generation** - NPCs remain for non-combat characters (merchants, quest givers, etc.). Monsters are a separate entity for combat-focused creatures.
- **Foundry sync service** - `foundrySync.ts` needs no modifications. Monsters use the same `createActor()` path.
- **Map generation** - Unaffected.
- **Token generation** - Reused as-is for monster tokens.
- **Auth, campaigns, sessions** - Unaffected.

---

## 10. Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| AI generates stats that conflict with table values | Table values always win; AI only provides flavor/narrative |
| CR table doesn't cover every edge case | Quick formulas as fallback; GM can manually edit any stat |
| D&D 5e system in Foundry expects specific item formats | Test with actual Foundry instance; use existing actor creation as reference |
| Large encounter generation is slow (multiple AI calls) | Parallelize AI calls; cache stat lookups; show progressive loading |
| Monster entity adds DB migration complexity | TypeORM auto-sync handles schema; separate entity avoids NPC schema changes |
