-- Add combat stats column to NPCs table for monster combat data
ALTER TABLE npcs
ADD COLUMN IF NOT EXISTS "combatStats" jsonb;

-- Add comment
COMMENT ON COLUMN npcs."combatStats" IS 'Combat-specific stats for monsters (HP, AC, attacks, etc.)';
