# Map Size Selection Feature ✅ IMPLEMENTED

## Overview
Added configurable map sizes (Small, Medium, Large) for all map types to give users control over map dimensions.

## Feature Details

### Map Size Options

| Size | Dimensions | Grid Units | Best For |
|------|-----------|------------|----------|
| **Small** | 20x20 | 400 cells | Quick encounters, tavern rooms, small dungeons |
| **Medium** | 35x35 | 1,225 cells | Standard dungeons, buildings, combat arenas |
| **Large** | 50x50 | 2,500 cells | Cities, large fortresses, wilderness areas, mega-dungeons |

### Pixel Dimensions (at 100px grid size)
- Small: 2000x2000 pixels
- Medium: 3500x3500 pixels
- Large: 5000x5000 pixels

## Implementation

### Backend Changes

#### File: `api/src/routes/generate.ts`

**Line 339**: Added validation for `mapSize` parameter
```typescript
body('mapSize').optional().isIn(['small', 'medium', 'large']),
```

**Lines 363-370**: Added size presets and logic
```typescript
const { description, mapType = 'other', mapSize = 'medium', sessionId, encounterConfig } = req.body;

// Map size presets (in grid units)
const SIZE_PRESETS: Record<string, { width: number; height: number }> = {
  small: { width: 20, height: 20 },
  medium: { width: 35, height: 35 },
  large: { width: 50, height: 50 },
};
```

**Lines 394-399**: Use size preset instead of AI dimensions
```typescript
// Use size preset if provided, otherwise use AI dimensions
const dims = SIZE_PRESETS[mapSize] || {
  width: Math.min(Math.max(mapDescription.dimensions?.width || 30, 20), 80),
  height: Math.min(Math.max(mapDescription.dimensions?.height || 30, 20), 80),
};

console.log(`[Map Generation] Using ${mapSize} size: ${dims.width}x${dims.height}`);
```

### Frontend Changes

#### File: `web/src/services/api.ts`

**Line 224**: Added `mapSize` parameter to `generateMap` method
```typescript
async generateMap(
  campaignId: string,
  description: string,
  mapType?: string,
  sessionId?: string,
  encounterConfig?: { ... },
  mapSize?: 'small' | 'medium' | 'large'  // NEW
): Promise<{ map: MapData }>
```

**Line 227**: Include `mapSize` in request body
```typescript
body: JSON.stringify({ description, mapType, mapSize, sessionId, encounterConfig }),
```

#### File: `web/src/pages/CampaignDetail.tsx`

**Line 767**: Updated `onGenerate` callback to accept `mapSize`
```typescript
onGenerate={async (description, mapType, encounterConfig, sessionId, mapSize) => {
```

**Line 771**: Pass `mapSize` to API
```typescript
const { map } = await api.generateMap(id!, description, mapType, sessionId, encounterConfig, mapSize);
```

**Line 1201**: Added `mapSize` state to MapGenerationForm
```typescript
const [mapSize, setMapSize] = useState<'small' | 'medium' | 'large'>('medium');
```

**Line 1221**: Pass `mapSize` to onGenerate
```typescript
await onGenerate(description.trim(), mapType, encounterConfig, selectedSessionId || undefined, mapSize);
```

**Lines 1242-1252**: Added size selector UI
```typescript
<select
  value={mapSize}
  onChange={(e) => setMapSize(e.target.value as 'small' | 'medium' | 'large')}
  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500 text-sm"
  title="Map Size"
>
  <option value="small">📏 Small (20x20)</option>
  <option value="medium">📐 Medium (35x35)</option>
  <option value="large">📊 Large (50x50)</option>
</select>
```

## Usage

### From UI
1. Navigate to campaign Maps tab
2. Fill in map description
3. Select map type (dungeon, cave, etc.)
4. **Select map size** (Small, Medium, or Large)
5. Optionally select session and encounters
6. Click "Generate Map"

### From API
```bash
curl -X POST http://localhost:3001/api/generate/campaigns/CAMPAIGN_ID/maps \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Ancient temple ruins",
    "mapType": "dungeon",
    "mapSize": "large",
    "encounterConfig": {
      "count": 3,
      "difficulty": "hard",
      "partyLevel": 5,
      "partySize": 4
    }
  }'
```

## Benefits

### For DMs
- **Quick encounters**: Use small maps for focused combat
- **Standard adventures**: Medium maps for typical dungeon crawls
- **Epic battles**: Large maps for massive setpiece encounters

### For Performance
- Smaller maps = faster generation
- Smaller maps = less memory usage
- Smaller maps = faster sync to Foundry

### For Flexibility
- Size preset overrides AI suggestions for consistent dimensions
- All map types support all sizes
- Default is "medium" for balanced experience

## Testing

### Test Small Map
```bash
# Small dungeon (20x20)
POST /api/generate/campaigns/{id}/maps
{
  "description": "Goblin hideout",
  "mapType": "cave",
  "mapSize": "small"
}
```

### Test Medium Map (Default)
```bash
# Medium castle (35x35)
POST /api/generate/campaigns/{id}/maps
{
  "description": "Fortress throne room",
  "mapType": "castle",
  "mapSize": "medium"
}
```

### Test Large Map
```bash
# Large city (50x50)
POST /api/generate/campaigns/{id}/maps
{
  "description": "Medieval marketplace district",
  "mapType": "city",
  "mapSize": "large"
}
```

## Compatibility

- ✅ Works with all map types (dungeon, cave, city, tavern, etc.)
- ✅ Compatible with encounter generation
- ✅ Compatible with session linking
- ✅ Compatible with Foundry VTT sync
- ✅ Backwards compatible (defaults to "medium" if not specified)

## Deployment

```bash
# Restart services to apply changes
sudo docker compose restart api
sudo docker compose restart web

# Verify
curl http://localhost:3001/health/ready
```

## Future Enhancements

Possible additions:
- Custom size input (advanced users)
- Size recommendations based on map type
- Size presets per map type (e.g., tavern = small by default)
- Dynamic room count based on size
- Encounter scaling based on map size

---

**Status**: ✅ **IMPLEMENTED AND READY FOR TESTING**
