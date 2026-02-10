-- Add Foundry VTT sync fields to maps table
ALTER TABLE maps 
ADD COLUMN IF NOT EXISTS "lastSyncedAt" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "syncStatus" VARCHAR CHECK ("syncStatus" IN ('never', 'pending', 'synced', 'error'));

-- Add Foundry VTT sync fields to npcs table
ALTER TABLE npcs 
ADD COLUMN IF NOT EXISTS "foundryActorId" VARCHAR,
ADD COLUMN IF NOT EXISTS "lastSyncedAt" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "syncStatus" VARCHAR CHECK ("syncStatus" IN ('never', 'pending', 'synced', 'error'));

-- Create indexes for faster sync status queries
CREATE INDEX IF NOT EXISTS idx_maps_sync_status ON maps("syncStatus");
CREATE INDEX IF NOT EXISTS idx_npcs_sync_status ON npcs("syncStatus");
CREATE INDEX IF NOT EXISTS idx_maps_foundry_scene_id ON maps("foundrySceneId");
CREATE INDEX IF NOT EXISTS idx_npcs_foundry_actor_id ON npcs("foundryActorId");
