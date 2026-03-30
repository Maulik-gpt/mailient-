-- ============================================================================
-- MINIMAL TEST - Run this FIRST to verify schema setup
-- ============================================================================

-- Test 1: Verify extensions
SELECT 'gen_random_uuid available' WHERE EXISTS (
    SELECT 1 FROM pg_available_extensions WHERE name = 'pgcrypto'
);

-- Test 2: Create users table (foundation)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Test 3: Create connected_accounts table
CREATE TABLE IF NOT EXISTS connected_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    connector_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    scopes JSONB DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'connecting',
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Test 4: Create simple view
CREATE OR REPLACE VIEW v_connector_summary AS
SELECT 
    ca.id,
    ca.connector_id,
    ca.status,
    ca.connected_at
FROM connected_accounts ca;

-- If all these work, your schema is compatible
SELECT 'Test completed successfully' as status;
