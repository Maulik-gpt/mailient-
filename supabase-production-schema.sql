-- ============================================================================
-- MAILENT PRODUCTION DATABASE SCHEMA
-- Run this entire file in Supabase SQL Editor
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- MIGRATION: Convert existing INTEGER user_id columns to UUID
-- Run this first if tables already exist with INTEGER columns
-- ============================================================================

-- Drop existing indexes that may conflict
DROP INDEX IF EXISTS idx_connected_accounts_user;
DROP INDEX IF EXISTS idx_connected_accounts_connector;
DROP INDEX IF EXISTS idx_connected_accounts_status;
DROP INDEX IF EXISTS idx_connector_usage_account;
DROP INDEX IF EXISTS idx_connector_usage_user;
DROP INDEX IF EXISTS idx_connector_usage_date;
DROP INDEX IF EXISTS idx_connector_sessions_state;
DROP INDEX IF EXISTS idx_connector_sessions_user;
DROP INDEX IF EXISTS idx_audit_log_user;
DROP INDEX IF EXISTS idx_audit_log_type;
DROP INDEX IF EXISTS idx_audit_log_created;

-- Drop foreign key constraints that reference the old types
ALTER TABLE IF EXISTS public.connected_accounts 
  DROP CONSTRAINT IF EXISTS connected_accounts_user_id_fkey;
ALTER TABLE IF EXISTS public.connector_usage_log 
  DROP CONSTRAINT IF EXISTS connector_usage_log_account_id_fkey;

-- Drop RLS policies that depend on user_id columns
DROP POLICY IF EXISTS "Users can view own accounts" ON public.connected_accounts;
DROP POLICY IF EXISTS "Users can manage own accounts" ON public.connected_accounts;
DROP POLICY IF EXISTS "Users can view own usage" ON public.connector_usage_log;
DROP POLICY IF EXISTS "Users can view own sessions" ON public.connector_sessions;
DROP POLICY IF EXISTS "Users can view own audit" ON public.audit_log;

-- Convert connected_accounts user_id to UUID
ALTER TABLE IF EXISTS public.connected_accounts 
  ALTER COLUMN user_id TYPE UUID USING user_id::text::uuid;

-- Convert connector_usage_log user_id to UUID  
ALTER TABLE IF EXISTS public.connector_usage_log 
  ALTER COLUMN user_id TYPE UUID USING user_id::text::uuid;

-- Convert connector_sessions user_id to UUID
ALTER TABLE IF EXISTS public.connector_sessions 
  ALTER COLUMN user_id TYPE UUID USING user_id::text::uuid;

-- Convert audit_log user_id to UUID
ALTER TABLE IF EXISTS public.audit_log 
  ALTER COLUMN user_id TYPE UUID USING user_id::text::uuid;

-- ============================================================================
-- 1. USERS TABLE (compatible with Supabase Auth)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    avatar_url TEXT,
    timezone TEXT DEFAULT 'UTC',
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists to make idempotent
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. CONNECTED ACCOUNTS (Integrations)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.connected_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    connector_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    
    -- OAuth tokens (encrypted by application layer)
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- User info from provider
    email TEXT,
    name TEXT,
    profile_picture TEXT,
    external_user_id TEXT,
    
    -- Scopes granted
    scopes JSONB DEFAULT '[]',
    
    -- Status: disconnected, connecting, connected, error, expired
    status TEXT NOT NULL DEFAULT 'connecting',
    
    -- Metadata
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE,
    disconnected_at TIMESTAMP WITH TIME ZONE,
    
    -- Error tracking
    last_error TEXT,
    error_count INTEGER DEFAULT 0,
    
    -- Settings
    settings JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, connector_id, email)
);

-- Indexes (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND indexname = 'idx_connected_accounts_user'
  ) THEN
    CREATE INDEX idx_connected_accounts_user ON public.connected_accounts(user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND indexname = 'idx_connected_accounts_connector'
  ) THEN
    CREATE INDEX idx_connected_accounts_connector ON public.connected_accounts(connector_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND indexname = 'idx_connected_accounts_status'
  ) THEN
    CREATE INDEX idx_connected_accounts_status ON public.connected_accounts(status);
  END IF;
END $$;

-- Trigger
CREATE TRIGGER update_connected_accounts_updated_at
    BEFORE UPDATE ON public.connected_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own accounts" ON public.connected_accounts
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own accounts" ON public.connected_accounts
    FOR ALL USING (user_id = auth.uid());

-- ============================================================================
-- 3. CONNECTOR USAGE LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.connector_usage_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES public.connected_accounts(id) ON DELETE CASCADE,
    connector_id TEXT NOT NULL,
    user_id UUID NOT NULL,
    
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

-- Indexes (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND indexname = 'idx_connector_usage_account'
  ) THEN
    CREATE INDEX idx_connector_usage_account ON public.connector_usage_log(account_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND indexname = 'idx_connector_usage_user'
  ) THEN
    CREATE INDEX idx_connector_usage_user ON public.connector_usage_log(user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND indexname = 'idx_connector_usage_date'
  ) THEN
    CREATE INDEX idx_connector_usage_date ON public.connector_usage_log(created_at);
  END IF;
END $$;

-- RLS
ALTER TABLE public.connector_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage" ON public.connector_usage_log
    FOR SELECT USING (user_id = auth.uid());

-- ============================================================================
-- 4. CONNECTOR SESSIONS (OAuth flows)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.connector_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
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

-- Indexes (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND indexname = 'idx_connector_sessions_state'
  ) THEN
    CREATE INDEX idx_connector_sessions_state ON public.connector_sessions(state);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND indexname = 'idx_connector_sessions_user'
  ) THEN
    CREATE INDEX idx_connector_sessions_user ON public.connector_sessions(user_id);
  END IF;
END $$;

-- RLS
ALTER TABLE public.connector_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions" ON public.connector_sessions
    FOR SELECT USING (user_id = auth.uid());

-- ============================================================================
-- 5. AUDIT LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    
    event_type TEXT NOT NULL,
    event_category TEXT,
    
    run_id TEXT,
    step_id TEXT,
    action_type TEXT,
    
    payload JSONB,
    
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND indexname = 'idx_audit_log_user'
  ) THEN
    CREATE INDEX idx_audit_log_user ON public.audit_log(user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND indexname = 'idx_audit_log_type'
  ) THEN
    CREATE INDEX idx_audit_log_type ON public.audit_log(event_type);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND indexname = 'idx_audit_log_created'
  ) THEN
    CREATE INDEX idx_audit_log_created ON public.audit_log(created_at);
  END IF;
END $$;

-- RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit" ON public.audit_log
    FOR SELECT USING (user_id = auth.uid());

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- Function: Get user connected accounts summary
CREATE OR REPLACE FUNCTION get_user_connected_accounts_summary(p_user_id UUID)
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
    FROM public.connected_accounts ca
    WHERE ca.user_id = p_user_id
    GROUP BY ca.connector_id, ca.status
    ORDER BY MAX(ca.connected_at) DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: Revoke connector access
CREATE OR REPLACE FUNCTION revoke_connector_access(p_account_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_account public.connected_accounts;
BEGIN
    SELECT * INTO v_account
    FROM public.connected_accounts
    WHERE id = p_account_id AND user_id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    UPDATE public.connected_accounts
    SET status = 'disconnected',
        disconnected_at = NOW(),
        access_token_encrypted = NULL,
        refresh_token_encrypted = NULL,
        updated_at = NOW()
    WHERE id = p_account_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function: Log audit event
CREATE OR REPLACE FUNCTION log_audit_event(
    p_user_id UUID,
    p_event_type TEXT,
    p_event_category TEXT,
    p_payload JSONB,
    p_run_id TEXT DEFAULT NULL,
    p_action_type TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO public.audit_log (
        user_id, event_type, event_category, payload, run_id, action_type
    ) VALUES (
        p_user_id, p_event_type, p_event_category, p_payload, p_run_id, p_action_type
    )
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMPLETION
-- ============================================================================

SELECT 'Production schema created successfully!' as status;
