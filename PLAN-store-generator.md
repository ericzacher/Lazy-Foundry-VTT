# Plan: Store Generator

## Overview

A procedural + AI-powered store generation system. Given a location type, settlement size,
racial influence, and desired item rarity, it produces a named shop with a shopkeeper NPC,
a contextual inventory with D&D 5e prices, and optionally exports to Foundry VTT as a
Journal Entry (readable in-game).

---

## Design Goals

- **Fast for GMs** — one click from a campaign page generates a ready-to-use shop
- **Contextually grounded** — a dwarven mountain forge sells different things than an elven
  city arcane emporium or a coastal pirate fencing operation
- **Rarity-gated** — small villages don't have legendary items; high-magic cities might
- **Foundry-ready** — export as a Journal Entry with formatted inventory table; optionally
  create an NPC actor for the shopkeeper

---

## Parameters (Inputs)

| Parameter | Options | Effect |
|---|---|---|
| **Settlement Size** | Hamlet · Village · Town · City · Metropolis | Scales inventory size and max rarity |
| **Store Type** | General · Blacksmith · Armorer · Alchemist · Magic Shop · Herbalist · Tailor · Jeweler · Fence · Shipwright | Filters item categories |
| **Racial Influence** | None · Human · Elf · Dwarf · Halfling · Gnome · Tiefling · Dragonborn · Mixed | Biases item names, shopkeeper identity, flavor text |
| **Location Biome** | Urban · Forest · Mountain · Coastal · Underground · Desert · Arctic | Further flavors items and atmosphere |
| **Max Rarity** | Common · Uncommon · Rare · Very Rare · Legendary | Hard cap on what can appear |
| **Stock Size** | Small (5–8) · Medium (10–15) · Large (20–30) | Number of line items |
| **Magic Items** | Yes / No | Toggle whether magical items appear at all |
| **Campaign ID** | optional | Ties shop to a campaign for persistence |

---

## Rarity ↔ Settlement Size Rules

```
Hamlet      → Common only
Village     → Common, Uncommon (10% chance)
Town        → Common, Uncommon, Rare (5% chance)
City        → Common–Rare, Very Rare (5% chance)
Metropolis  → Common–Very Rare, Legendary (2% chance)
```

Magic items are further gated by Store Type:
- General / Tailor / Jeweler → no magic items unless overridden
- Alchemist / Herbalist → potions and consumables only
- Magic Shop → full magic item range
- Blacksmith / Armorer → +1/+2 weapons and armor, no wands/scrolls

---

## Item Categories by Store Type

| Store Type | PHB Item Categories |
|---|---|
| General Store | Adventuring gear, tools, food, rope, torches, packs |
| Blacksmith | Simple/martial weapons, shields, basic armor |
| Armorer | All armor, shields, helmets; magic armor at higher rarity |
| Alchemist | Potions, acids, alchemist's fire, antitoxin, healer's kits |
| Magic Shop | Wands, scrolls, rings, rods, staves, wonderous items |
| Herbalist | Herbs, potions of healing, antitoxin, spell components |
| Tailor | Clothing, disguise kits, fine attire, cloaks |
| Jeweler | Gems, jewelry, art objects (valuables for trade) |
| Fence | Stolen goods — mixed random items at 50% PHB price |
| Shipwright | Rope, navigation tools, watercraft supplies |

---

## Output Structure

```typescript
interface GeneratedStore {
  id: string;
  campaignId?: string;
  name: string;                    // "The Rusted Anvil", "Mireth's Arcane Wares"
  shopkeeperName: string;
  shopkeeperRace: string;
  shopkeeperPersonality: string;   // 1-2 sentence flavor
  description: string;             // 2-3 sentence shop atmosphere
  storeType: string;
  settlementSize: string;
  racialInfluence: string;
  biome: string;
  inventory: StoreItem[];
  totalValue: number;              // sum of inventory (gp)
  foundryJournalId?: string;
  createdAt: string;
}

interface StoreItem {
  name: string;
  category: string;               // weapon, armor, potion, gear, magic, etc.
  rarity: string;                 // common, uncommon, rare, very rare, legendary
  quantity: number;               // 1–5 for most; consumables can be higher
  priceGp: number;                // PHB price or AI-generated for magic items
  description?: string;           // flavor text for magic/unique items
  ismagic: boolean;
  compendiumName?: string;        // canonical dnd5e.items name for Foundry lookup
}
```

---

## Architecture

### New Files

| File | Purpose |
|---|---|
| `/api/src/routes/stores.ts` | REST endpoints for store generation and retrieval |
| `/api/src/data/storeItems.ts` | Static item tables: PHB prices, categories, rarity weights |
| `/web/src/pages/StoreGenerator.tsx` | UI page for generating and viewing stores |
| `/web/src/pages/StoreGenerator.css` | Minimal extra styles if needed |

### Modified Files

| File | Change |
|---|---|
| `/api/src/index.ts` | Register `app.use('/api/stores', storeRoutes)` (no auth — public or campaign-scoped) |
| `/api/src/db/schema.ts` | Add `stores` table |
| `/web/src/services/api.ts` | Add `generateStore()`, `getStore()`, `getCampaignStores()` |
| `/web/src/App.tsx` | Add route `/store-generator` |
| `/web/src/pages/index.ts` | Export `StoreGenerator` |

---

## Backend: `/api/src/routes/stores.ts`

### Endpoints

```
POST /api/stores/generate          Generate a new store (AI + static tables)
GET  /api/stores/:id               Get a saved store by ID
GET  /api/campaigns/:id/stores     List all stores for a campaign
DELETE /api/stores/:id             Delete a store
POST /api/stores/:id/foundry-export  Push as Foundry Journal Entry
```

### Generation Strategy — Hybrid (Static + AI)

**Static layer** (fast, always runs):
1. Select item pool based on storeType + maxRarity
2. Apply racial influence to bias selection (dwarven shops weight axes/hammers, elven shops weight bows/finesse weapons)
3. Roll quantity of items based on stockSize
4. Apply PHB prices from static table
5. Generate shopkeeper race from racialInfluence

**AI layer** (runs after static, enriches):
- Generate shop name, shopkeeper name + personality, shop description
- Generate names and flavor text for any magic items
- Optionally substitute generic item names for thematic variants ("Elven Longbow" instead of "Longbow")

**Prompt structure:**
```
You are generating a D&D 5e shop. Given:
- Store type: {storeType}
- Settlement: {settlementSize} {biome} settlement with {racialInfluence} influence
- Shopkeeper race: {race}
- Inventory (already selected): [{item names}]

Generate ONLY JSON:
{
  "shopName": "...",
  "shopkeeperName": "...",
  "shopkeeperPersonality": "...",  // 1-2 sentences
  "description": "...",            // 2-3 sentences of atmosphere
  "magicItemDescriptions": {       // only for magic items in inventory
    "Item Name": "short flavor text"
  }
}
```

### Database Schema

```sql
CREATE TABLE stores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  store_type  TEXT NOT NULL,
  parameters  JSONB NOT NULL,   -- all input params
  data        JSONB NOT NULL,   -- full GeneratedStore object
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

No campaign_id required — stores can exist standalone (for one-shot use) or be attached to a campaign.

---

## Frontend: `StoreGenerator.tsx`

### Layout

```
┌─────────────────────────────────────────────────────┐
│  Store Generator                    [My Stores ▾]   │
├─────────────────────────────────────────────────────┤
│  CONFIGURE                                           │
│  Settlement:  [Hamlet][Village][Town][City][Metro]  │
│  Store Type:  [General▾]                            │
│  Race:        [Mixed▾]                              │
│  Biome:       [Urban▾]                              │
│  Max Rarity:  [Uncommon▾]                           │
│  Magic Items: [OFF]                                 │
│  Stock Size:  [Medium]                              │
│                          [✨ Generate Store]         │
├─────────────────────────────────────────────────────┤
│  THE RUSTED ANVIL                                    │
│  Dwarven Blacksmith · Town · Mountain                │
│  ─────────────────────────────────────────────────  │
│  Brom Copperforge stares at you from behind the     │
│  counter, arms crossed...                           │
│                                                     │
│  INVENTORY                        Total: 847 gp     │
│  ┌──────────────────────────────────────────────┐  │
│  │ Item          Rarity    Qty   Price           │  │
│  │ Longsword     Common    2     15 gp           │  │
│  │ Chain Mail    Common    1     75 gp           │  │
│  │ +1 Handaxe    Uncommon  1     ~300 gp         │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  [Regenerate] [Export to Foundry] [Save to Campaign]│
└─────────────────────────────────────────────────────┘
```

### State

```typescript
interface StoreConfig {
  settlementSize: 'hamlet' | 'village' | 'town' | 'city' | 'metropolis';
  storeType: string;
  racialInfluence: string;
  biome: string;
  maxRarity: 'common' | 'uncommon' | 'rare' | 'very rare' | 'legendary';
  stockSize: 'small' | 'medium' | 'large';
  magicItems: boolean;
  campaignId?: string;
}
```

### Accessibility from the App

Two entry points:
1. **Standalone**: `/store-generator` — public, no login needed (same pattern as character creator)
2. **From Campaign**: Button on CampaignDetail page → opens StoreGenerator pre-seeded with campaignId

---

## Foundry Export

When "Export to Foundry" is clicked:
1. `POST /api/stores/:id/foundry-export`
2. Backend calls `foundrySyncService.createJournalEntry()` with formatted HTML:

```html
<h2>The Rusted Anvil</h2>
<p><em>Dwarven Blacksmith — Mountain Town</em></p>
<p>Brom Copperforge stares at you from behind the counter...</p>

<h3>Shopkeeper</h3>
<p><strong>Brom Copperforge</strong> (Hill Dwarf) — Gruff but fair...</p>

<h3>Inventory</h3>
<table>
  <tr><th>Item</th><th>Rarity</th><th>Qty</th><th>Price</th></tr>
  <tr><td>Longsword</td><td>Common</td><td>2</td><td>15 gp</td></tr>
  ...
</table>
```

3. Returns `foundryJournalId` → shown as success with Foundry link

---

## Static Item Tables (`/api/src/data/storeItems.ts`)

PHB prices and categories for ~150 items covering all store types. Structure:

```typescript
interface ItemTemplate {
  name: string;           // matches dnd5e compendium name
  category: 'weapon' | 'armor' | 'potion' | 'gear' | 'tool' | 'magic' | 'trade';
  storeTypes: string[];   // which stores can carry this
  rarity: string;
  basePrice: number;      // PHB gp price
  racialBias?: string[];  // races that preferentially stock this
  biomes?: string[];      // biomes where this is more common
}
```

Racial biases:
- **Dwarf**: battleaxes, warhammers, chain mail, heavy armor, mining tools
- **Elf**: longbows, shortswords, rapiers, light armor, fine clothing, spell components
- **Halfling**: slings, daggers, thieves' tools, cooking supplies, fine pipeweed
- **Gnome**: tinker's tools, clockwork gadgets, alchemist supplies, light crossbows
- **Human**: balanced — full general selection
- **Tiefling**: dark clothing, spell components, rare alchemical items
- **Coastal/Pirate**: rope, navigation tools, tridents, nets, anchors

---

## Pricing Rules

- **Common** magic items: 50–100 gp (potions of healing: 50 gp)
- **Uncommon**: 101–500 gp
- **Rare**: 501–5,000 gp
- **Very Rare**: 5,001–50,000 gp
- **Legendary**: 50,001+ gp
- **Fence**: 50% of base price for all items

---

## Implementation Order

1. `storeItems.ts` — static item table (~150 items, all store types)
2. `stores.ts` backend route — generate endpoint with hybrid static+AI logic
3. Database migration — `stores` table
4. `api.ts` — `generateStore()`, `getCampaignStores()`, `exportStoreToFoundry()`
5. `StoreGenerator.tsx` — UI wizard + inventory display
6. `App.tsx` + `index.ts` — routing
7. CampaignDetail integration — "Generate Store" button

---

## Open Questions / Future Scope

- **Restock mechanic**: regenerate inventory with same parameters after session
- **Haggling modifier**: apply CHA check result as % discount on purchase prices
- **Player-facing view**: shareable link showing just the inventory (no GM notes)
- **Bulk pack bundles**: "Adventurer's Pack" as a single line item at bundle price
- **Relationship tracking**: store has saved relationship value with party (friendly/neutral/hostile)
