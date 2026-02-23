# Plan: Journal Deletion Support

## Context
Journals are created in Foundry VTT when stores are exported (`POST /api/stores/:id/foundry-export`) and when campaign lore is synced (`POST /api/foundry/journals/:campaignId`). Store journals have their `foundryJournalId` saved back to `store.data`, but deletion of a store does **not** clean up the journal in Foundry. No `deleteJournalEntry()` exists in the sync service, and no delete route exists. This feature adds the full deletion chain.

## Scope
- Add `deleteJournalEntry()` to `foundrySync` service
- Add `DELETE /api/foundry/journals/:journalId` route (direct Foundry journal delete)
- Update `DELETE /api/stores/:id` to cascade-delete the associated Foundry journal if one exists
- Add `deleteFoundryJournal()` to the frontend `ApiService`

## Files to Modify

### 1. `api/src/services/foundrySync.ts`
Add `deleteJournalEntry(journalId: string): Promise<FoundryResponse>` after `createJournalEntry()` (~line 868).

Exact pattern mirrors `deleteScene()` / `deleteActor()`:
```typescript
async deleteJournalEntry(journalId: string): Promise<FoundryResponse> {
  try {
    await this.ensureConnected();
    // Check existence first — Foundry crashes on deleting non-existent doc
    const existing = await this.emitAndWait('modifyDocument', {
      action: 'get',
      type: 'JournalEntry',
      operation: { query: {}, broadcast: false },
    });
    const journals = (existing.result as Array<{ _id: string }>) || [];
    if (!journals.some((j) => j._id === journalId)) {
      console.log(`[FoundrySync] Journal ${journalId} not found in Foundry, skipping delete`);
      return { success: true };
    }
    const result = await this.emitAndWait('modifyDocument', {
      action: 'delete',
      type: 'JournalEntry',
      operation: { ids: [journalId], broadcast: true },
    });
    if (result.error) return { success: false, error: result.error.message };
    console.log(`[FoundrySync] Journal deleted: ${journalId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
```

### 2. `api/src/routes/foundry.ts`
Add after the `DELETE /actors/:actorId` route (~line 627):
```typescript
router.delete('/journals/:journalId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await foundrySyncService.deleteJournalEntry(req.params.journalId);
    if (!result.success) {
      res.status(500).json({ error: result.error || 'Failed to delete journal from Foundry' });
      return;
    }
    res.status(204).send();
  } catch (error) {
    console.error('Delete Foundry journal error:', error);
    res.status(500).json({ error: 'Failed to delete journal from Foundry' });
  }
});
```

### 3. `api/src/routes/stores.ts`
Update `DELETE /:id` handler to attempt Foundry journal cleanup before removing the store record.
Add `foundrySyncService` import if not already present, then before `storeRepo.remove(store)`:
```typescript
const data = store.data as any;
if (data?.foundryJournalId) {
  try {
    await foundrySyncService.deleteJournalEntry(data.foundryJournalId);
  } catch {
    // best-effort cleanup — don't block store deletion
  }
}
```

### 4. `web/src/services/api.ts`
Add after `deleteFoundryActor()` (~line 387):
```typescript
async deleteFoundryJournal(journalId: string): Promise<void> {
  return this.request<void>(`/api/foundry/journals/${journalId}`, { method: 'DELETE' });
}
```

## What This Does NOT Change
- `StoreGenerator.tsx` — `handleDelete()` already calls `api.deleteStore()` which now cascades server-side; no frontend change needed
- Campaign lore journals — `foundryJournalId` is not saved back to the campaign record, so no cascade is possible there. The new direct route `DELETE /api/foundry/journals/:journalId` can be called manually if needed in future

## Verification
1. Export a store to Foundry — confirm journal appears in Foundry
2. Delete the store — confirm journal is removed from Foundry automatically
3. Call `DELETE /api/foundry/journals/:id` directly with a known journal ID — confirm 204 + journal removed
4. Call with a non-existent ID — confirm 204 (graceful skip, no Foundry crash)
