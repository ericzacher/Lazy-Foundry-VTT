# Plan: Better Monster Token Generation

## Problem

All tokens (players and monsters) use the same DiceBear avatar API, which generates cartoon humanoid avatars. These look passable for NPCs/players but are completely wrong for monsters — a dragon, ooze, or aberration shouldn't look like a cartoon person. The fallback is even worse: colored circles with initials.

**Additional issue discovered:** When encounter monsters are synced to Foundry, `createActorFromEnemy()` doesn't set `img` on the Actor and `createToken()` doesn't set `texture.src` — so Foundry falls back to its generic mystery-man icon for every monster regardless.

## Current System

**File:** `api/src/services/tokenGenerator.ts`

1. **Primary:** DiceBear API (free, no auth) — random style from `avataaars`, `bottts`, `personas`, `lorelei`, `notionists`
2. **Fallback:** Sharp-generated SVG circle with colored background + name initials
3. All tokens processed to 400x400 PNG with transparent background via Sharp
4. Only used for NPC "Generate Token" button — encounter monsters skip this entirely

**Encounter placement** (`encounterPlacement.ts` line 251): `createActorFromEnemy()` creates actors with stats only — no `img` field, no `prototypeToken`. Tokens placed on scenes (foundry.ts lines 141-151) have no `texture.src`.

## Available Infrastructure

- **Groq API key** (already configured) — text-only LLM, no image generation
- **OpenAI API key** (commented out in .env.example) — supports DALL-E image gen
- **`openai` npm package v4** already installed — supports `openai.images.generate()`
- **Sharp** already installed for image processing
- **`node-fetch`** already installed
- **Foundry VTT** running with D&D 5e system

---

## Options

### Option F: Foundry VTT SRD Compendium Lookup (FREE, zero external APIs)

**How:** Foundry's D&D 5e system ships with an SRD compendium containing ~300 monsters with full stat blocks AND token artwork. Instead of creating blank actors, look up monsters by name in the compendium and import them — getting proper art, stats, abilities, and token images for free.

**How it works:**
1. Before creating a fresh actor, query Foundry's compendium: `getDocuments` on `dnd5e.monsters` filtered by name
2. If found: import the compendium entry (gets full stat block + official token art + proper size)
3. If not found: fall back to creating a custom actor (current behavior)

**Foundry API calls needed:**
- `getDocuments` with type `Actor` and pack `dnd5e.monsters` to search
- `importFromCompendium` or create actor with the compendium data

**Pros:**
- FREE — no API keys, no external calls
- Official D&D 5e token art and stat blocks
- Proper creature sizes, abilities, saves, attacks — everything
- ~300 SRD monsters covered (all the common ones: goblin, dragon, zombie, etc.)
- Fastest option — just a compendium lookup, no image generation
- Tokens already sized correctly for the grid

**Cons:**
- Only covers SRD monsters (~300) — homebrew/custom creatures not included
- Requires D&D 5e system module installed in Foundry (but it's already there)
- Name matching may not be exact (AI might generate "Skeletal Warrior" vs compendium "Skeleton")
- Compendium stats would override our AI-generated stats

**This is the best first option to try.**

### Option A: AI Image Generation (DALL-E 3 via OpenAI)

**How:** Use the already-installed `openai` package to call `openai.images.generate()` with a monster-specific prompt built from the creature's name, type, size, and description.

**Pros:**
- Unique, high-quality fantasy art for every monster
- Can tailor prompts per creature type
- The `openai` npm package is already installed
- Best visual results for custom/homebrew monsters

**Cons:**
- Requires an OpenAI API key (OPENAI_API_KEY) — not free
- DALL-E 3: ~$0.04 per image (1024x1024), DALL-E 2: ~$0.02 per image (512x512)
- Adds 5-15 seconds per token generation
- Rate limits (5 img/min on free tier, 7 img/min on tier 1)

**Cost estimate:** 3 encounters x 3 monster types = ~9 images = ~$0.36

### Option B: Open Source Image Gen via Together AI / Replicate

**How:** Call Together AI or Replicate API with SDXL or FLUX model for fantasy token art.

**Pros:**
- Cheaper than DALL-E ($0.003-$0.01 per image with SDXL)
- Good quality with the right model
- Fast (~2-5 seconds per image)

**Cons:**
- Requires a new API key + new dependency or raw fetch calls
- Another external service dependency

### Option C: DiceBear Monster-Appropriate Styles (Free, No New Keys)

**How:** Use different DiceBear styles based on NPC role. Monsters get `bottts`, `shapes`, or `identicon` styles with creature-type-specific color schemes.

**Pros:** Zero cost, instant, never fails
**Cons:** Still abstract/geometric — not actual monster art

### Option D: SVG Monster Silhouettes + Color Coding (Free, No New Keys)

**How:** Embed ~15 SVG silhouette templates (dragon, skull, beast paw, tentacles, etc.), colored by CR difficulty. Rendered via Sharp.

**Pros:** Zero cost, works offline, recognizable by type
**Cons:** All undead look the same, requires creating SVG templates

### Option E: game-icons.net Icons (Free, CC BY 3.0)

**How:** 4000+ fantasy icons as SVGs, mapped to monster types, rendered on colored circular backgrounds.

**Pros:** Free, huge variety, recognizable D&D-style iconography
**Cons:** Silhouette-style not full art, external dependency

---

## Recommendation

**Tiered approach: F -> A -> D (compendium first, DALL-E for custom, silhouettes as last resort)**

### Tier 1: Foundry SRD Compendium Lookup (Free)
For encounter monsters, try to match by name against Foundry's `dnd5e.monsters` compendium. This gives us official token art, proper stat blocks, and correct sizes for ~300 common D&D monsters — for free.

### Tier 2: DALL-E Image Gen (Optional, paid)
For monsters that don't match any compendium entry (homebrew, custom names), use DALL-E via the already-installed `openai` package if `OPENAI_API_KEY` is configured.

### Tier 3: SVG Silhouette Fallback (Free)
If no compendium match AND no OpenAI key, generate a creature-type-appropriate silhouette token (dragon shape for dragons, skull for undead, etc.) with CR-based coloring.

### Architecture

```
placeEncounterTokensFromMap() / createActorFromEnemy()
  │
  ├─ Step 1: Try compendium lookup
  │    foundrySyncService.findCompendiumActor("dnd5e.monsters", enemy.name)
  │    ├─ Found: Import from compendium (gets art + full stats + proper size)
  │    └─ Not found: continue to Step 2
  │
  ├─ Step 2: Try DALL-E (if OPENAI_API_KEY set)
  │    generateMonsterTokenWithDALLE(name, description, size, monsterType)
  │    Create actor with generated img + our AI stats
  │
  └─ Step 3: SVG silhouette fallback
       generateMonsterSilhouette(name, monsterType, size)
       Create actor with silhouette img + our AI stats
```

### Changes Required

1. **`api/src/services/foundrySync.ts`** — Add `findCompendiumActor(pack, name)` and `importFromCompendium(pack, id)` methods
2. **`api/src/services/encounterPlacement.ts`** — Update `createActorFromEnemy()` to try compendium lookup first; add `img` and `prototypeToken` fields to actor data
3. **`api/src/services/tokenGenerator.ts`** — Add `generateMonsterTokenWithDALLE()`, add `generateMonsterSilhouette()` with embedded SVG templates, update routing logic
4. **`api/src/routes/foundry.ts`** — Pass `texture.src` when creating tokens on scenes
5. **`.env.example`** — Document OPENAI_API_KEY for optional image generation

### Implementation Steps

1. Add compendium search/import methods to `foundrySync.ts`
2. Update `encounterPlacement.ts` to try compendium import before creating blank actors
3. Add fuzzy name matching for compendium lookups (e.g. "Skeletal Warrior" -> "Skeleton")
4. Add `generateMonsterTokenWithDALLE()` to tokenGenerator.ts as Tier 2
5. Add `generateMonsterSilhouette()` with ~15 embedded SVG templates as Tier 3
6. Wire `texture.src` through token creation in foundry.ts
7. Update `.env.example` with OPENAI_API_KEY docs
