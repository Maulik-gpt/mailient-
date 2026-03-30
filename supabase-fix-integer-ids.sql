-- ============================================================================
-- SCHEMA COMPATIBILITY FIX
-- Run this to detect and fix the ID type mismatch
-- ============================================================================

-- Step 1: Check what type the users table uses
DO $$
DECLARE
    v_user_id_type TEXT;
BEGIN
    SELECT data_type INTO v_user_id_type
    FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'id';
    
    IF v_user_id_type IS NULL THEN
        RAISE NOTICE 'No users table exists yet - will create with UUID';
    ELSE
        RAISE NOTICE 'Existing users.id type: %', v_user_id_type;
    END IF;
END $$;

-- ============================================================================
-- OPTION A: If you have INTEGER users.id, run this:
-- ============================================================================

-- Drop conflicting tables if they exist
DROP TABLE IF EXISTS connected_accounts CASCADE;
DROP TABLE IF EXISTS connector_usage_log CASCADE;
DROP TABLE IF EXISTS connector_sessions CASCADE;
DROP TABLE IF EXISTS connector_webhooks CASCADE;
DROP VIEW IF EXISTS v_connector_summary;

-- Create connected_accounts with INTEGER user_id to match existing users table
CREATE TABLE IF NOT EXISTS connected_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    connector_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    scopes JSONB DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'connecting',
    email TEXT,
    name TEXT,
    external_user_id TEXT,
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE,
    disconnected_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    error_count INTEGER DEFAULT 0,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, connector_id, email)
);

-- Create connector_usage_log with INTEGER user_id
CREATE TABLE IF NOT EXISTS connector_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES connected_accounts(id) ON DELETE CASCADE,
    connector_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    action_type TEXT NOT NULL,
    request_payload JSONB,
    response_payload JSONB,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    success BOOLEAN NOT NULL DEFAULT FALSE,
    error_message TEXT,
    error_code TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create connector_sessions for OAuth flows
CREATE TABLE IF NOT EXISTS connector_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL,
    connector_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    state TEXT NOT NULL UNIQUE,
    code_verifier TEXT,
    pkce_method TEXT DEFAULT 'S256',
    redirect_uri TEXT,
    requested_scopes JSONB,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    account_id UUID,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_connected_accounts_user ON connected_accounts(user_id);
CREATE INDEX idx_connected_accounts_connector ON connected_accounts(connector_id);
CREATE INDEX idx_connected_accounts_status ON connected_accounts(status);
CREATE INDEX idx_connector_usage_account ON connector_usage_log(account_id);
CREATE INDEX idx_connector_usage_user ON connector_usage_log(user_id);
CREATE INDEX idx_connector_sessions_state ON connector_sessions(state);

-- Function: Revoke connector access
CREATE OR REPLACE FUNCTION revoke_connector_access(p_account_id UUID, p_user_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    v_account connected_accounts;
BEGIN
    SELECT * INTO v_account
    FROM connected_accounts
    WHERE id = p_account_id AND user_id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    UPDATE connected_accounts
    SET status = 'disconnected',
        disconnected_at = NOW(),
        access_token_encrypted = NULL,
        refresh_token_encrypted = NULL,
        updated_at = NOW()
    WHERE id = p_account_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function: Get user connected accounts summary
CREATE OR REPLACE FUNCTION get_user_connected_accounts_summary(p_user_id INTEGER)
RETURNS TABLE (
    connector_id TEXT,
    connector_name TEXT,
    status TEXT,
    connected_count INTEGER,
    last_connected_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ca.connector_id,
        CASE ca.connector_id
            WHEN 'google_calendar' THEN 'Google Calendar & Meet'::TEXT
            WHEN 'calcom' THEN 'Cal.com'::TEXT
            WHEN 'notion' THEN 'Notion'::TEXT
            WHEN 'google_tasks' THEN 'Google Tasks'::TEXT
            ELSE ca.connector_id
        END as connector_name,
        ca.status,
        COUNT(*)::INTEGER as connected_count,
        MAX(ca.connected_at) as last_connected_at
    FROM connected_accounts ca
    WHERE ca.user_id = p_user_id
    GROUP BY ca.connector_id, ca.status
    ORDER BY MAX(ca.connected_at) DESC;
END;
$$ LANGUAGE plpgsql;

SELECT 'Schema created with INTEGER user_id (compatible with existing users table)' as status;
