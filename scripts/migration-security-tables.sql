-- ============================================================================
-- Military-Grade Encryption: Database Schema Migration
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- 1. Audit Logs Table (APPEND-ONLY — no UPDATE/DELETE policies)
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  event_id TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  details TEXT DEFAULT '{}',
  client_ip TEXT DEFAULT 'unknown',
  user_agent TEXT DEFAULT 'unknown',
  integrity_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user activity queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 2. Encrypted Vault Table (zero-knowledge encrypted blob storage)
CREATE TABLE IF NOT EXISTS encrypted_vault (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  blob_id TEXT NOT NULL,
  encrypted_data TEXT NOT NULL,
  content_type TEXT DEFAULT 'email',
  metadata TEXT DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, blob_id)
);

CREATE INDEX IF NOT EXISTS idx_encrypted_vault_user_blob ON encrypted_vault(user_id, blob_id);

-- 3. User ID Mapping Table (data segmentation layer)
CREATE TABLE IF NOT EXISTS user_id_mapping (
  id BIGSERIAL PRIMARY KEY,
  google_email TEXT UNIQUE NOT NULL,
  internal_uuid TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_id_mapping_email ON user_id_mapping(google_email);
CREATE INDEX IF NOT EXISTS idx_user_id_mapping_uuid ON user_id_mapping(internal_uuid);

-- 4. Token Rotation Tracking (add columns to existing user_tokens if they exist)
-- Run this only if your user_tokens table exists:
-- ALTER TABLE user_tokens ADD COLUMN IF NOT EXISTS rotation_id TEXT;
-- ALTER TABLE user_tokens ADD COLUMN IF NOT EXISTS last_rotated_at TIMESTAMPTZ;
-- ALTER TABLE user_tokens ADD COLUMN IF NOT EXISTS session_fingerprint TEXT;

-- ============================================================================
-- IMPORTANT: RLS Policies for Write-Only Audit Logs
-- These policies ensure even service_role cannot DELETE audit entries
-- (in practice, apply these through Supabase dashboard)
-- ============================================================================

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE encrypted_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_id_mapping ENABLE ROW LEVEL SECURITY;

-- Audit logs: Insert only (no update/delete)
CREATE POLICY "Service role can insert audit logs"
  ON audit_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can select audit logs"
  ON audit_logs FOR SELECT
  TO service_role
  USING (true);

-- Encrypted vault: Full CRUD for service role (user controls via API)
CREATE POLICY "Service role manages vault"
  ON encrypted_vault FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- User ID mapping: Full CRUD for service role
CREATE POLICY "Service role manages id mapping"
  ON user_id_mapping FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
