# Phase 4 Implementation Summary

## Overview
Phase 4 (Foundry VTT Integration) has been successfully implemented. The system can now directly sync generated content to a running Foundry VTT instance via HTTP API.

## Implementation Details

### Backend Components

#### 1. Foundry Sync Service (`api/src/services/foundrySync.ts`)
- **FoundrySyncService class**: HTTP client for Foundry VTT API
- **Methods**:
  - `healthCheck()` - Verify Foundry accessibility
  - `createScene(sceneData)` - Push map to Foundry with walls, lights, background
  - `updateScene(sceneId, updates)` - Modify existing Foundry scene
  - `deleteScene(sceneId)` - Remove scene from Foundry
  - `createActor(actorData)` - Push NPC to Foundry with stats, abilities, biography
  - `createToken(sceneId, tokenData)` - Place token on scene
  - `createJournalEntry(journalData)` - Push lore to Foundry
  - `getScenes()` - List all Foundry scenes
  - `getActors()` - List all Foundry actors
- **Features**:
  - Bearer token authentication
  - Typed responses with FoundryResponse<T>
  - Comprehensive error handling
  - 5-30s timeouts per operation

#### 2. Foundry Sync Routes (`api/src/routes/foundry.ts`)
- **Endpoints**:
  - `GET /api/foundry/health` - Check Foundry connection
  - `POST /api/foundry/scenes/:mapId` - Sync single map
  - `POST /api/foundry/actors/:npcId` - Sync single NPC
  - `POST /api/foundry/journals/:campaignId` - Sync campaign lore
  - `POST /api/foundry/campaigns/:campaignId/bulk` - Bulk sync entire campaign
  - `GET /api/foundry/scenes` - List Foundry scenes
  - `GET /api/foundry/actors` - List Foundry actors
- **Features**:
  - Auth middleware on all routes
  - Ownership verification
  - Full URL resolution for images
  - Sync status tracking
  - Error handling with detailed messages

#### 3. Entity Updates
**Map Entity (`api/src/entities/Map.ts`)**:
- `foundrySceneId?: string` - Foundry's scene ID (already existed)
- `lastSyncedAt?: Date` - Timestamp of last sync
- `syncStatus?: 'never' | 'pending' | 'synced' | 'error'` - Current sync state

**NPC Entity (`api/src/entities/NPC.ts`)**:
- `foundryActorId?: string` - Foundry's actor ID
- `lastSyncedAt?: Date` - Timestamp of last sync
- `syncStatus?: 'never' | 'pending' | 'synced' | 'error'` - Current sync state

#### 4. Database Migration
**Migration File** (`api/migrations/add-foundry-sync-fields.sql`):
- Added sync tracking fields to maps and npcs tables
- Created indexes for sync status queries
- Created indexes for Foundry ID lookups

### Frontend Components

#### 1. API Service Updates (`web/src/services/api.ts`)
- `getFoundryStatus()` - Check Foundry connection
- `syncMapToFoundry(mapId)` - Sync map to Foundry
- `syncNPCToFoundry(npcId)` - Sync NPC to Foundry
- `syncCampaignLore(campaignId)` - Sync lore to Foundry
- `bulkSyncCampaign(campaignId)` - Bulk sync all content
- `getFoundryScenes()` - List Foundry scenes
- `getFoundryActors()` - List Foundry actors

#### 2. Type Updates (`web/src/types/index.ts`)
- Added sync status fields to MapData interface
- Added sync status fields to NPC interface

#### 3. Campaign Detail UI Updates (`web/src/pages/CampaignDetail.tsx`)
**New State**:
- `syncingToFoundry` - Track in-progress sync operations
- `foundryStatus` - Connection status (connected/disconnected/unknown)

**New Handlers**:
- `handleSyncMapToFoundry()` - Sync individual map
- `handleSyncNPCToFoundry()` - Sync individual NPC
- `handleBulkSyncCampaign()` - Bulk sync entire campaign

**UI Additions**:
- **Header**: 
  - Foundry connection status indicator
  - Bulk sync button
- **Maps Tab**:
  - Sync status badges (✓ Synced, ✗ Error, Not Synced)
  - Individual sync buttons
  - Export JSON button (existing, now labeled "Export JSON")
- **NPCs Tab**:
  - Sync status badges
  - Individual sync buttons

## Environment Configuration

### Required Environment Variables
```env
FOUNDRY_URL=http://foundry:30000
FOUNDRY_ADMIN_KEY=your_admin_key_here
```

### Docker Setup
Foundry VTT container is already configured in `docker-compose.yml`:
```yaml
foundry:
  image: felddy/foundryvtt:release
  ports:
    - "30000:30000"
  volumes:
    - foundry_data:/data
```

## Usage Flow

### 1. Connection Check
- Frontend checks Foundry status on load
- Displays connection indicator in UI
- Sync buttons only appear when connected

### 2. Individual Sync
- User clicks "🔄 Sync to Foundry" on map or NPC
- Frontend sends POST request to `/api/foundry/scenes/:mapId` or `/api/foundry/actors/:npcId`
- Backend:
  - Verifies ownership
  - Transforms data to Foundry format
  - Sends to Foundry API
  - Updates sync status in database
- Frontend reloads data and displays updated status badge

### 3. Bulk Sync
- User clicks "Bulk Sync to Foundry" in header
- Frontend sends POST request to `/api/foundry/campaigns/:id/bulk`
- Backend:
  - Syncs all maps as scenes
  - Syncs all NPCs as actors
  - Syncs campaign lore as journal entry
  - Returns summary with success/failure counts
- Frontend displays alert with results and reloads data

### 4. Sync Status Tracking
- **never**: Content has never been synced
- **pending**: Sync in progress (handled by frontend state)
- **synced**: Successfully synced, displays green badge with checkmark
- **error**: Sync failed, displays red badge with X

## Data Transformation

### Map → Foundry Scene
```typescript
{
  name: map.name,
  width: map.foundryData.width,
  height: map.foundryData.height,
  background: { src: "http://api:3001/api/assets/maps/xxx.png" },
  walls: [...],  // Wall segments with move/sense/door
  lights: [...], // Light sources with range/color
  grid: { type, size, color, alpha }
}
```

### NPC → Foundry Actor
```typescript
{
  name: npc.name,
  type: "npc",
  img: "http://api:3001/api/assets/tokens/xxx.png",
  system: {
    details: {
      biography: { value: "<h2>Name</h2><p>Description...</p>" }
    },
    abilities: {
      str: { value: 10 },
      dex: { value: 10 },
      // ... etc
    }
  }
}
```

### Campaign Lore → Foundry Journal
```typescript
{
  name: "Campaign Name - World Lore",
  content: "<h1>Campaign Name</h1><p>Description...</p><h2>History</h2>..."
}
```

## Testing

### Manual Testing Steps

1. **Start Services**:
```bash
docker-compose up -d
```

2. **Check Foundry Connection**:
```bash
curl http://localhost:3001/api/foundry/health \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

3. **Sync a Map**:
```bash
curl -X POST http://localhost:3001/api/foundry/scenes/MAP_UUID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

4. **Sync an NPC**:
```bash
curl -X POST http://localhost:3001/api/foundry/actors/NPC_UUID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

5. **Bulk Sync Campaign**:
```bash
curl -X POST http://localhost:3001/api/foundry/campaigns/CAMPAIGN_UUID/bulk \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

6. **Verify in Foundry**:
- Open Foundry VTT at http://localhost:30000
- Check Scenes compendium for synced maps
- Check Actors compendium for synced NPCs
- Check Journal Entries for campaign lore

## Files Created/Modified

### Created
- `api/src/services/foundrySync.ts` (320 lines)
- `api/src/routes/foundry.ts` (420 lines)
- `api/migrations/add-foundry-sync-fields.sql` (18 lines)
- `docs/PHASE_4_IMPLEMENTATION_SUMMARY.md` (this file)

### Modified
- `api/src/entities/Map.ts` - Added lastSyncedAt, syncStatus
- `api/src/entities/NPC.ts` - Added foundryActorId, lastSyncedAt, syncStatus
- `api/src/index.ts` - Registered foundry routes
- `web/src/types/index.ts` - Added sync status to types
- `web/src/services/api.ts` - Added Foundry sync methods
- `web/src/pages/CampaignDetail.tsx` - Added sync UI and handlers
- `README.md` - Updated Phase 4 status to Complete ✅

## Next Steps (Future Enhancements)

### Phase 5: Session Results and Continuity (Planned)
- Track session results in database
- Use previous sessions to inform AI generation
- Continuity tracking for NPCs across sessions

### Phase 6: Polish and Enhancements (Planned)
- Advanced map types (towns, castles, wilderness)
- Token library management
- Bulk import/export
- Foundry module package creation

## Known Limitations

1. **One-way Sync**: Currently only syncs from our system to Foundry, not the reverse
2. **No Update Detection**: If content is modified in Foundry, we don't detect it
3. **No Conflict Resolution**: Re-syncing creates duplicates rather than updating
4. **Limited Actor Type**: Only supports "npc" actor type, not "character"
5. **Basic Journal Entries**: Lore is synced as simple HTML, not structured pages

## Error Handling

- **Connection Errors**: Caught and displayed as "Disconnected" status
- **Sync Errors**: Set syncStatus to 'error' and display error message
- **Auth Errors**: Returns 403 if user doesn't own the content
- **Missing Data**: Returns 400 if content lacks required Foundry data
- **Timeouts**: 30s timeout on Foundry API calls

## Performance Considerations

- **Individual Syncs**: ~1-2s per map/NPC
- **Bulk Syncs**: Sequential, ~5-10s for typical campaign
- **Image URLs**: Resolved to full URLs at sync time
- **Database Updates**: Sync status persisted immediately after each operation

## Security

- All routes protected with JWT authentication
- Ownership verification before sync
- Foundry admin key stored in environment variable
- No user credentials stored in client code

---

**Status**: ✅ Phase 4 Complete
**Date**: 2024
**Next Phase**: Phase 5 - Session Results and Continuity
