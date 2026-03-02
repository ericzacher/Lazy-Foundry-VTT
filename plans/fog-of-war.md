# Plan: Fog of War Toggle for Map Generation

## Summary
Add a **Fog of War** checkbox to the map generation form. When checked (default: on), the
generated Foundry scene will have `tokenVision: true` and `fog.exploration: true`. When
unchecked the scene is fully visible — useful for player handout maps, town overviews, or
any map where the DM doesn't need exploration tracking.

---

## Current State

| Location | Behaviour |
|---|---|
| `api/src/services/mapGenerator.ts` | `tokenVision` and `fog.exploration` **hardcoded `true`** for every map type |
| `web/src/pages/CampaignDetail.tsx` (MapGenerationForm) | No fog-of-war input |
| `api/src/routes/generate.ts` | `fogOfWar` not in request body, not forwarded to generator |
| `api/src/entities/Map.ts` | No `fogOfWar` column |
| `web/src/types/index.ts` (MapData) | No `fogOfWar` field |
| `api/src/routes/foundry.ts` (sync) | Spreads `map.foundryData` directly → already carries whatever `tokenVision`/`fog` values were saved at generation time |

**Key insight:** Because the Foundry sync routes spread `map.foundryData` verbatim into
`createScene()`, we only need to ensure the correct `tokenVision` and `fog.exploration`
values are written into `foundryData` at generation time. No sync-side changes are required.

---

## Affected Files (in order of change)

| # | File | Change |
|---|---|---|
| 1 | `api/src/entities/Map.ts` | Add `fogOfWar` boolean column |
| 2 | `web/src/types/index.ts` | Add `fogOfWar?: boolean` to `MapData` |
| 3 | `api/src/services/mapGenerator.ts` | Accept `fogOfWar` param; use it instead of hardcoded `true` |
| 4 | `api/src/routes/generate.ts` | Read `fogOfWar` from request body; pass to generator; save on entity |
| 5 | `web/src/pages/CampaignDetail.tsx` | Add fog-of-war checkbox to `MapGenerationForm`; show badge on map cards |

---

## Step-by-Step Changes

### 1. `api/src/entities/Map.ts`

Add one column after `foundryData`:

```ts
@Column({ type: 'boolean', default: true })
fogOfWar!: boolean;
```

No migration needed — default `true` keeps all existing maps behaving as before.

---

### 2. `web/src/types/index.ts`

Add `fogOfWar` to `MapData`:

```ts
export interface MapData {
  ...
  fogOfWar?: boolean;   // undefined treated as true (legacy maps)
  ...
}
```

---

### 3. `api/src/services/mapGenerator.ts`

The `generateMap()` function signature (currently):
```ts
export async function generateMap(
  description: string,
  mapType: string,
  gridWidth: number,
  gridHeight: number,
  gridSize: number
): Promise<FoundrySceneData>
```

**Change:** Add `fogOfWar = true` parameter (default preserves existing behaviour):
```ts
export async function generateMap(
  description: string,
  mapType: string,
  gridWidth: number,
  gridHeight: number,
  gridSize: number,
  fogOfWar = true          // ← new
): Promise<FoundrySceneData>
```

In the returned object (currently hardcoded):
```ts
// BEFORE
tokenVision: true,
fog: { exploration: true },

// AFTER
tokenVision: fogOfWar,
fog: { exploration: fogOfWar },
```

This applies uniformly to every map type because the return value is built in one place at
the end of `generateMap()`. No per-type branching needed.

---

### 4. `api/src/routes/generate.ts`

**4a. Validation** — add optional boolean to the validator array:
```ts
body('fogOfWar').optional().isBoolean(),
```

**4b. Read from body** — after existing destructuring:
```ts
const fogOfWar = req.body.fogOfWar !== false; // default true unless explicitly false
```

**4c. Forward to `generateMap()`**:
```ts
const foundryData = await generateMap(
  enhancedDescription,
  mapType,
  gridWidth,
  gridHeight,
  GRID_SIZE,
  fogOfWar      // ← pass through
);
```

**4d. Save on entity** — when building the Map entity:
```ts
newMap.fogOfWar = fogOfWar;
```

---

### 5. `web/src/pages/CampaignDetail.tsx`

**5a. Default state** — add to `MapGenerationForm` state initialiser:
```ts
const [fogOfWar, setFogOfWar] = useState(true);
```

**5b. Checkbox UI** — insert after the "Include Encounters" checkbox row, before the
encounter options. Applies for all map types (dungeon, wilderness, city, etc.):

```tsx
{/* Fog of War */}
<div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg border border-gray-700">
  <input
    type="checkbox"
    id="fogOfWar"
    checked={fogOfWar}
    onChange={e => setFogOfWar(e.target.checked)}
    className="w-4 h-4 rounded accent-indigo-500"
  />
  <label htmlFor="fogOfWar" className="flex-1 cursor-pointer">
    <div className="text-sm text-white font-medium">Fog of War</div>
    <div className="text-xs text-gray-400">
      Players explore the map gradually — areas outside token vision stay hidden.
      Uncheck for fully-visible handout maps (towns, overviews).
    </div>
  </label>
  <span className={`text-xs px-2 py-0.5 rounded ${
    fogOfWar ? 'bg-indigo-900/60 text-indigo-300' : 'bg-gray-700 text-gray-400'
  }`}>
    {fogOfWar ? 'On' : 'Off'}
  </span>
</div>
```

**5c. Include in submit payload**:
```ts
const payload = {
  ...existingFields,
  fogOfWar,
};
```

**5d. Map card badge** — in the existing map list cards, add a small indicator so the DM
can see the fog setting at a glance without opening the map:
```tsx
{map.fogOfWar !== false && (
  <span className="text-xs bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded">
    🌫 Fog
  </span>
)}
```

---

## Data Flow (end to end)

```
User checks "Fog of War" checkbox
  → MapGenerationForm state: fogOfWar = true/false
  → POST /api/generate/campaigns/:id/maps  { fogOfWar: true/false }
  → generate.ts reads fogOfWar, passes to generateMap()
  → mapGenerator.ts sets tokenVision & fog.exploration = fogOfWar
  → foundryData saved on Map entity (tokenVision/fog baked in)
  → map.fogOfWar = true/false saved on Map entity
  → UI shows "🌫 Fog" badge on map card if enabled

Later: DM clicks "Sync to Foundry"
  → foundry.ts spreads map.foundryData into createScene()
  → tokenVision & fog.exploration already correct — NO CHANGE NEEDED HERE
```

---

## Migration Note

The new `fogOfWar` column has `default: true`, so:
- All existing maps in the database automatically get `fogOfWar = true`
- Their `foundryData.tokenVision` and `foundryData.fog.exploration` are already `true`
  (set at generation time)
- Re-syncing existing maps will continue to work correctly

---

## What Does NOT Need to Change

- `api/src/routes/foundry.ts` (single map sync) — already passes `foundryData` verbatim
- `api/src/routes/foundry.ts` (bulk sync) — same
- `api/src/services/foundrySync.ts` `createScene()` — already accepts any scene properties
- Per-map-type generator paths — fog is set once in the shared return object in `generateMap()`

---

## Verification Checklist

- [ ] Dungeon map with fog ON → Foundry scene has `tokenVision: true`, `fog.exploration: true`
- [ ] Town map with fog OFF → Foundry scene has `tokenVision: false`, `fog.exploration: false`
- [ ] Wilderness map with fog ON → same as dungeon
- [ ] Cave map with fog ON → same as dungeon
- [ ] Building map with fog OFF → fully visible scene
- [ ] Existing maps (no `fogOfWar` field) re-sync correctly
- [ ] Map card shows 🌫 Fog badge when `fogOfWar` is true
- [ ] Map card shows no badge when `fogOfWar` is false
