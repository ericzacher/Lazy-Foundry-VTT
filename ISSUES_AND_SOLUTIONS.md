# Lazy Foundry VTT - Issues & Solutions Log

## Issue 1: GM Login Only Accepts Empty Password ✅ FIXED

### Problem
- GM login only works with empty password
- Sometimes GM user dropdown doesn't work
- Race condition where password not cleared before user tries to log in

### Root Cause
Password clearing only happened when API first connected to Foundry (on-demand), not at startup. If user tried to log into Foundry before using any API features, the random password was still set.

### Solution
- Added `initializeAtStartup()` method to `foundrySync.ts`
- API now proactively connects to Foundry at startup
- GM password cleared automatically when API starts
- Added graceful shutdown cleanup

### Files Changed
- `api/src/services/foundrySync.ts` (lines 397-425)
- `api/src/index.ts` (lines 17, 110-117, 125-142)

### Status
✅ **FIXED** - GM login now works consistently with empty password

---

## Issue 2: Scene Not Syncing to Foundry ✅ FIXED

### Problem
- User ran bulk sync
- Got success message
- Scene "Cursed Spire of the Damned" not appearing in Foundry

### Root Cause
Bulk sync was silently skipping maps without both `foundryData` and `imageUrl`, but still returning "success". No visibility into what was skipped.

### Solution
- Added detailed logging for skipped maps
- Added `skippedMaps` array to response
- Added warning message when maps are skipped
- Console logs show exactly which maps were skipped and why

### Files Changed
- `api/src/routes/foundry.ts` (lines 345-370, 526-536)

### Test Results
```
[Bulk Sync] Found 1 maps for campaign 8e5b196e-b967-4ea0-a24b-2a8b24d2b0a6
[FoundrySync] Scene created: 7aMSc2Y3IiMQwMDO (Cursed Spire of the Damned)
```

### Status
✅ **FIXED** - Scene syncs successfully

---

## Issue 3: Token Placement Not Working 🔄 IN PROGRESS

### Problem
- Scene syncs to Foundry successfully
- Map has encounters in database
- No tokens placed on the scene for encounters

### Diagnosis

#### What's Working ✅
- Map generation creates encounters
- Map has `details.encounters` with 2 encounters:
  - Goblin Ambush (4 goblins)
  - Kobold Trapmasters (3 kobolds + 1 trapmaster)
- Bulk sync completes successfully
- Scene appears in Foundry

#### What's NOT Working ❌
- Sessions have empty `mapIds: {}`
- Sessions have no `scenario.encounters`
- Tokens not placed on map

### Root Causes

**Primary Issue**: Map was generated without linking to a session
- User's map was generated with `sessionId: undefined`
- Auto-linking code at `api/src/routes/generate.ts:435-454` never ran
- Session never got the map ID added to `mapIds`
- Encounters never copied to `session.scenario`

**Secondary Issue**: User may be using wrong sync button
- Campaign-level "Bulk Sync to Foundry" → No sessionId passed → No token placement
- Session-level "🎲 Sync" → Passes sessionId → Token placement enabled

### Token Placement Requirements (ALL must be true)

```
✅ Map has details.encounters (2 encounters)
❓ Map has foundryData.rooms (need to verify)
❌ Session has mapIds containing map ID
❌ Session has scenario.encounters
❓ User clicked session-level sync button
✅ sessionId passed to bulk sync endpoint
✅ Foundry connection active
```

### Solutions Implemented

#### Solution 1: Auto-Link Maps to Sessions (Backend)
**File**: `api/src/routes/generate.ts` (lines 435-454)

**What it does**:
- When map generated with `encounterConfig` AND `sessionId`
- Automatically adds map ID to `session.mapIds`
- Copies encounters to `session.scenario`

**Status**: ✅ Code already exists, but wasn't triggered because sessionId was undefined

#### Solution 2: Add Session Selector to UI (Frontend)
**Files Changed**:
- `web/src/pages/CampaignDetail.tsx` (multiple locations)

**Changes**:
1. **Line 767**: Updated `onGenerate` callback signature to accept `sessionId`
2. **Line 771**: Pass `sessionId` to API (was `undefined`)
3. **Line 776**: Reload sessions after map generation if linked
4. **Line 1193**: Add `sessions` prop to component
5. **Line 1205**: Add `selectedSessionId` state
6. **Lines 1251-1264**: Add session selector dropdown UI

**UI Changes**:
- New dropdown: "🎲 Link to Session (Optional but Recommended)"
- Options: "None" or select from existing sessions
- Helper text: "Link to a session to enable automatic token placement"
- Auto-clears selection after generation

**Status**: ✅ Code implemented, needs testing

### Testing Plan

1. **Restart web frontend**:
   ```bash
   sudo docker compose restart web
   ```

2. **Create a new session** (or use existing):
   ```bash
   # Check existing sessions
   sudo docker compose exec postgres psql -U postgres -d lazy_foundry -c \
     "SELECT id, title FROM sessions ORDER BY \"createdAt\" DESC LIMIT 3;"
   ```

3. **Generate NEW map with session link**:
   - Navigate to Maps tab
   - Select session from dropdown
   - Enable "Include Combat Encounters"
   - Set count, difficulty
   - Generate map

4. **Verify session linkage**:
   ```bash
   sudo docker compose exec postgres psql -U postgres -d lazy_foundry -c \
     "SELECT title, \"mapIds\", jsonb_array_length(scenario->'encounters') FROM sessions WHERE title = 'dragin';"
   ```
   Should show: mapIds has UUID, encounters count > 0

5. **Use session-level sync**:
   - Go to Sessions tab
   - Find session with linked map
   - Click **"🎲 Sync"** button (NOT "Bulk Sync to Foundry" at top)

6. **Verify in Foundry**:
   - Open scene in Foundry VTT
   - Look for enemy tokens placed on map

### Current Status
🔄 **IN PROGRESS** - Waiting for user to test new UI

---

## Issue 4: Settings File Corruption ✅ FIXED

### Problem
```
Invalid Settings
/home/zache/Lazy-Foundry-VTT/.claude/settings.local.json
  └ permissions
    └ allow
      └ "Bash(/home/zache/Lazy-Foundry-VTT/CHANGELOG_LAZY_MONSTER_BUILDER.md << 'EOF'...
```

### Root Cause
Bash heredoc command accidentally saved into settings file instead of being executed.

### Solution
Removed invalid permission entry from line 18 of settings file.

### Status
✅ **FIXED**

---

## Summary

| Issue | Status | Blocker |
|-------|--------|---------|
| GM Login | ✅ Fixed | No |
| Scene Sync | ✅ Fixed | No |
| Token Placement | 🔄 In Progress | Yes |
| Settings File | ✅ Fixed | No |

**Next Action**: User needs to restart web container and test new session selector UI
