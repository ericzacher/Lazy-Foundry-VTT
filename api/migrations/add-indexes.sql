-- Add performance indexes for common queries
-- Run with: psql -U user -d lazy_foundry < add-indexes.sql

-- Users table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email);

-- Campaigns table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaigns_owner ON campaigns(owner_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaigns_updated ON campaigns(updated_at DESC);

-- Sessions table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_campaign_number ON sessions(campaign_id, session_number);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_status ON sessions(status, completed_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_scheduled ON sessions(scheduled_date);

-- NPCs table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_npcs_campaign ON npcs(campaign_id, name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_npcs_status ON npcs(status);

-- Maps table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_maps_campaign ON maps(campaign_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_maps_session ON maps(session_id);

-- Timeline events table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_timeline_campaign ON timeline_events(campaign_id, session_number);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_timeline_session ON timeline_events(session_id);

-- Session results table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_session_results_session ON session_results(session_id);

-- NPC history table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_npc_history_npc ON npc_history(npc_id, occurred_at DESC);

-- Tokens table  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tokens_foundry ON tokens(foundry_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tokens_map ON tokens(map_id);
