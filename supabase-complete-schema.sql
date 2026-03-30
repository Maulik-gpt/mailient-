-- ============================================================================
-- COMPLETE MAILENT DATABASE SCHEMA
-- 
-- Includes all tables for:
-- - User management
-- - Execution tracking (runs, steps, todos)
-- - Plan management
-- - Connector integrations
-- - Audit logging
-- - Webhooks
-- 
-- Run this entire file in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. USER MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    avatar_url TEXT,
    timezone TEXT DEFAULT 'UTC',
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. OPERATOR RUNS (Execution Tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.arcus_operator_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    conversation_id TEXT,
    mission_id TEXT,
    
    -- Run state
    status TEXT NOT NULL DEFAULT 'initializing',
    phase TEXT DEFAULT 'thinking',
    
    -- Intent analysis
    intent TEXT,
    complexity TEXT,
    
    -- Plan snapshot
    plan_snapshot JSONB DEFAULT '[]',
    plan_id UUID,
    
    -- Memory/context
    memory JSONB DEFAULT '{}',
    
    -- Metadata
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    
    -- Error tracking
    error_category TEXT,
    error_message TEXT,
    
    -- Performance
    total_duration_ms INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_arcus_operator_runs_user ON public.arcus_operator_runs(user_id);
CREATE INDEX idx_arcus_operator_runs_run_id ON public.arcus_operator_runs(run_id);
CREATE INDEX idx_arcus_operator_runs_status ON public.arcus_operator_runs(status);
CREATE INDEX idx_arcus_operator_runs_conversation ON public.arcus_operator_runs(conversation_id);

-- RLS
ALTER TABLE public.arcus_operator_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own runs" ON public.arcus_operator_runs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own runs" ON public.arcus_operator_runs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own runs" ON public.arcus_operator_runs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own runs" ON public.arcus_operator_runs
    FOR DELETE USING (auth.uid() = user_id);

-- Trigger
CREATE TRIGGER update_arcus_operator_runs_updated_at
    BEFORE UPDATE ON public.arcus_operator_runs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3. OPERATOR RUN STEPS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.arcus_operator_run_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES public.arcus_operator_runs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    step_id TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    kind TEXT NOT NULL,
    
    -- Step state
    status TEXT NOT NULL DEFAULT 'pending',
    
    -- Content
    label TEXT NOT NULL,
    detail TEXT,
    
    -- Execution tracking
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    
    -- Retry tracking
    attempt_count INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    
    -- Error tracking
    error_category TEXT,
    error_message TEXT,
    
    -- Evidence/result
    evidence JSONB,
    
    -- Dependencies
    depends_on JSONB DEFAULT '[]',
    
    -- Performance
    duration_ms INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(run_id, step_id)
);

-- Indexes
CREATE INDEX idx_arcus_operator_run_steps_run ON public.arcus_operator_run_steps(run_id);
CREATE INDEX idx_arcus_operator_run_steps_user ON public.arcus_operator_run_steps(user_id);
CREATE INDEX idx_arcus_operator_run_steps_status ON public.arcus_operator_run_steps(status);

-- RLS
ALTER TABLE public.arcus_operator_run_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own steps" ON public.arcus_operator_run_steps
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own steps" ON public.arcus_operator_run_steps
    FOR ALL USING (auth.uid() = user_id);

-- Trigger
CREATE TRIGGER update_arcus_operator_run_steps_updated_at
    BEFORE UPDATE ON public.arcus_operator_run_steps
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. PLAN ARTIFACTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.arcus_plan_artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    run_id UUID REFERENCES public.arcus_operator_runs(id) ON DELETE SET NULL,
    conversation_id TEXT,
    
    -- Plan content
    title TEXT NOT NULL,
    objective TEXT NOT NULL,
    assumptions JSONB DEFAULT '[]',
    questions_answered JSONB DEFAULT '[]',
    acceptance_criteria JSONB DEFAULT '[]',
    
    -- Status
    status TEXT NOT NULL DEFAULT 'draft',
    
    -- Execution tracking
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by TEXT,
    executed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    
    -- Results
    execution_result JSONB,
    error_message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_arcus_plan_artifacts_user ON public.arcus_plan_artifacts(user_id);
CREATE INDEX idx_arcus_plan_artifacts_run ON public.arcus_plan_artifacts(run_id);
CREATE INDEX idx_arcus_plan_artifacts_status ON public.arcus_plan_artifacts(status);
CREATE INDEX idx_arcus_plan_artifacts_conversation ON public.arcus_plan_artifacts(conversation_id);

-- RLS
ALTER TABLE public.arcus_plan_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own plans" ON public.arcus_plan_artifacts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own plans" ON public.arcus_plan_artifacts
    FOR ALL USING (auth.uid() = user_id);

-- Trigger
CREATE TRIGGER update_arcus_plan_artifacts_updated_at
    BEFORE UPDATE ON public.arcus_plan_artifacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. TODO ITEMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.arcus_todo_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    todo_id TEXT NOT NULL UNIQUE,
    plan_id UUID NOT NULL REFERENCES public.arcus_plan_artifacts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    run_id UUID REFERENCES public.arcus_operator_runs(id) ON DELETE SET NULL,
    
    -- Todo content
    title TEXT NOT NULL,
    description TEXT,
    
    -- Status (canonical from execution contract)
    status TEXT NOT NULL DEFAULT 'pending',
    
    -- Execution
    action_type TEXT,
    action_payload JSONB,
    
    -- Dependencies
    depends_on JSONB DEFAULT '[]',
    
    -- Retry tracking
    attempt_count INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    retry_policy JSONB,
    
    -- Approval
    approval_mode TEXT DEFAULT 'conditional',
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by TEXT,
    
    -- Execution tracking
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    
    -- Results
    result_payload JSONB,
    error_message TEXT,
    error_category TEXT,
    
    -- Performance
    duration_ms INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_arcus_todo_items_plan ON public.arcus_todo_items(plan_id);
CREATE INDEX idx_arcus_todo_items_user ON public.arcus_todo_items(user_id);
CREATE INDEX idx_arcus_todo_items_status ON public.arcus_todo_items(status);
CREATE INDEX idx_arcus_todo_items_run ON public.arcus_todo_items(run_id);

-- RLS
ALTER TABLE public.arcus_todo_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own todos" ON public.arcus_todo_items
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own todos" ON public.arcus_todo_items
    FOR ALL USING (auth.uid() = user_id);

-- Trigger
CREATE TRIGGER update_arcus_todo_items_updated_at
    BEFORE UPDATE ON public.arcus_todo_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. CONNECTED ACCOUNTS (Integrations)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.connected_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    connector_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    
    -- OAuth tokens (encrypted)
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
    
    -- Status
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

-- Indexes
CREATE INDEX idx_connected_accounts_user ON public.connected_accounts(user_id);
CREATE INDEX idx_connected_accounts_connector ON public.connected_accounts(connector_id);
CREATE INDEX idx_connected_accounts_status ON public.connected_accounts(status);
CREATE INDEX idx_connected_accounts_provider ON public.connected_accounts(provider);

-- RLS
ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own accounts" ON public.connected_accounts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own accounts" ON public.connected_accounts
    FOR ALL USING (auth.uid() = user_id);

-- Trigger
CREATE TRIGGER update_connected_accounts_updated_at
    BEFORE UPDATE ON public.connected_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. CONNECTOR USAGE LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.connector_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.connected_accounts(id) ON DELETE CASCADE,
    connector_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Action performed
    action TEXT NOT NULL,
    action_type TEXT NOT NULL,
    
    -- Request/response
    request_payload JSONB,
    response_payload JSONB,
    
    -- Performance
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    
    -- Status
    success BOOLEAN NOT NULL DEFAULT FALSE,
    error_message TEXT,
    error_code TEXT,
    
    -- Metadata
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_connector_usage_account ON public.connector_usage_log(account_id);
CREATE INDEX idx_connector_usage_user ON public.connector_usage_log(user_id);
CREATE INDEX idx_connector_usage_connector ON public.connector_usage_log(connector_id);
CREATE INDEX idx_connector_usage_date ON public.connector_usage_log(created_at);
CREATE INDEX idx_connector_usage_success ON public.connector_usage_log(success);

-- RLS
ALTER TABLE public.connector_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage" ON public.connector_usage_log
    FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- 8. AUDIT LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    
    -- Event details
    event_type TEXT NOT NULL,
    event_category TEXT,
    
    -- Context
    run_id TEXT,
    step_id TEXT,
    plan_id UUID,
    todo_id UUID,
    action_type TEXT,
    
    -- Payload
    payload JSONB,
    
    -- Metadata
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_audit_log_user ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_type ON public.audit_log(event_type);
CREATE INDEX idx_audit_log_created ON public.audit_log(created_at);
CREATE INDEX idx_audit_log_run ON public.audit_log(run_id);

-- RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit" ON public.audit_log
    FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- 9. WEBHOOKS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.connector_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.connected_accounts(id) ON DELETE CASCADE,
    connector_id TEXT NOT NULL,
    
    -- Webhook config
    webhook_url TEXT NOT NULL,
    webhook_secret_encrypted TEXT,
    
    -- Event types
    event_types JSONB DEFAULT '[]',
    
    -- Status
    status TEXT NOT NULL DEFAULT 'active',
    
    -- Stats
    deliveries_count INTEGER DEFAULT 0,
    failed_deliveries INTEGER DEFAULT 0,
    last_delivery_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_connector_webhooks_account ON public.connector_webhooks(account_id);
CREATE INDEX idx_connector_webhooks_status ON public.connector_webhooks(status);

-- RLS
ALTER TABLE public.connector_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own webhooks" ON public.connector_webhooks
    FOR SELECT USING (
        account_id IN (
            SELECT id FROM public.connected_accounts WHERE user_id = auth.uid()
        )
    );

-- Trigger
CREATE TRIGGER update_connector_webhooks_updated_at
    BEFORE UPDATE ON public.connector_webhooks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 10. IDEMPOTENCY KEYS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.idempotent_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Execution context
    action_type TEXT NOT NULL,
    run_id TEXT,
    
    -- Result
    result JSONB NOT NULL,
    
    -- Expiration
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_idempotent_results_key ON public.idempotent_results(idempotency_key);
CREATE INDEX idx_idempotent_results_user ON public.idempotent_results(user_id);
CREATE INDEX idx_idempotent_results_expires ON public.idempotent_results(expires_at);

-- RLS
ALTER TABLE public.idempotent_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own idempotency" ON public.idempotent_results
    FOR SELECT USING (auth.uid() = user_id);

-- Cleanup expired idempotency keys (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_idempotency_keys()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.idempotent_results WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 11. DATABASE FUNCTIONS
-- ============================================================================

-- Function to get user's connected accounts summary
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
        COALESCE(
            CASE ca.connector_id
                WHEN 'google_calendar' THEN 'Google Calendar & Meet'
                WHEN 'calcom' THEN 'Cal.com'
                WHEN 'notion' THEN 'Notion'
                WHEN 'google_tasks' THEN 'Google Tasks'
            END,
            ca.connector_id
        ) as connector_name,
        ca.status,
        COUNT(*)::INTEGER as connected_count,
        MAX(ca.connected_at) as last_connected_at
    FROM public.connected_accounts ca
    WHERE ca.user_id = p_user_id
    GROUP BY ca.connector_id, ca.status
    ORDER BY MAX(ca.connected_at) DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to revoke connector access
CREATE OR REPLACE FUNCTION revoke_connector_access(p_account_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_account public.connected_accounts;
BEGIN
    -- Get the account
    SELECT * INTO v_account
    FROM public.connected_accounts
    WHERE id = p_account_id AND user_id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Update status
    UPDATE public.connected_accounts
    SET 
        status = 'disconnected',
        disconnected_at = NOW(),
        access_token_encrypted = NULL,
        refresh_token_encrypted = NULL,
        updated_at = NOW()
    WHERE id = p_account_id;
    
    -- Delete webhooks
    DELETE FROM public.connector_webhooks WHERE account_id = p_account_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to log audit event
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
        user_id,
        event_type,
        event_category,
        payload,
        run_id,
        action_type
    ) VALUES (
        p_user_id,
        p_event_type,
        p_event_category,
        p_payload,
        p_run_id,
        p_action_type
    )
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get run status with steps
CREATE OR REPLACE FUNCTION get_run_with_steps(p_run_id TEXT, p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'run', jsonb_build_object(
            'id', r.id,
            'run_id', r.run_id,
            'status', r.status,
            'phase', r.phase,
            'intent', r.intent,
            'complexity', r.complexity,
            'started_at', r.started_at,
            'completed_at', r.completed_at,
            'error_message', r.error_message
        ),
        'steps', COALESCE(
            (SELECT jsonb_agg(
                jsonb_build_object(
                    'id', s.id,
                    'step_id', s.step_id,
                    'order', s.order,
                    'kind', s.kind,
                    'status', s.status,
                    'label', s.label,
                    'started_at', s.started_at,
                    'completed_at', s.completed_at,
                    'duration_ms', s.duration_ms
                ) ORDER BY s.order
            )
            FROM public.arcus_operator_run_steps s
            WHERE s.run_id = r.id),
            '[]'::jsonb
        )
    )
    INTO v_result
    FROM public.arcus_operator_runs r
    WHERE r.run_id = p_run_id AND r.user_id = p_user_id;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 12. STATUS ENUM CHECKS
-- ============================================================================

-- Add check constraints for status fields
ALTER TABLE public.arcus_operator_runs 
    ADD CONSTRAINT valid_run_status 
    CHECK (status IN ('initializing', 'thinking', 'searching', 'synthesizing', 'approval', 'executing', 'completed', 'failed', 'cancelled'));

ALTER TABLE public.arcus_operator_run_steps 
    ADD CONSTRAINT valid_step_status 
    CHECK (status IN ('pending', 'ready', 'running', 'completed', 'failed', 'blocked', 'skipped', 'retrying'));

ALTER TABLE public.arcus_plan_artifacts 
    ADD CONSTRAINT valid_plan_status 
    CHECK (status IN ('draft', 'pending_approval', 'approved', 'executing', 'completed', 'failed'));

ALTER TABLE public.arcus_todo_items 
    ADD CONSTRAINT valid_todo_status 
    CHECK (status IN ('pending', 'ready', 'running', 'completed', 'failed', 'blocked', 'skipped', 'retrying'));

ALTER TABLE public.connected_accounts 
    ADD CONSTRAINT valid_account_status 
    CHECK (status IN ('disconnected', 'connecting', 'connected', 'error', 'expired'));

-- ============================================================================
-- 13. VIEWS FOR CONVENIENCE
-- ============================================================================

-- View: Active runs with progress
CREATE OR REPLACE VIEW public.v_active_runs AS
SELECT 
    r.*,
    (SELECT COUNT(*) FROM public.arcus_operator_run_steps s WHERE s.run_id = r.id AND s.status = 'completed') as completed_steps,
    (SELECT COUNT(*) FROM public.arcus_operator_run_steps s WHERE s.run_id = r.id) as total_steps,
    CASE 
        WHEN (SELECT COUNT(*) FROM public.arcus_operator_run_steps s WHERE s.run_id = r.id) > 0 
        THEN ROUND((SELECT COUNT(*) FROM public.arcus_operator_run_steps s WHERE s.run_id = r.id AND s.status = 'completed')::numeric / 
             (SELECT COUNT(*) FROM public.arcus_operator_run_steps s WHERE s.run_id = r.id) * 100, 2)
        ELSE 0
    END as progress_percentage
FROM public.arcus_operator_runs r
WHERE r.status NOT IN ('completed', 'failed', 'cancelled');

-- View: Connector health status
CREATE OR REPLACE VIEW public.v_connector_health AS
SELECT 
    ca.user_id,
    ca.connector_id,
    ca.status,
    ca.connected_at,
    ca.last_used_at,
    ca.error_count,
    CASE 
        WHEN ca.status = 'connected' AND ca.token_expires_at > NOW() + INTERVAL '5 minutes' THEN 'healthy'
        WHEN ca.status = 'connected' AND ca.token_expires_at <= NOW() + INTERVAL '5 minutes' THEN 'expiring_soon'
        WHEN ca.status = 'error' AND ca.error_count >= 3 THEN 'degraded'
        ELSE ca.status
    END as health_status,
    (SELECT COUNT(*) FROM public.connector_usage_log cul WHERE cul.account_id = ca.id AND cul.success = TRUE) as successful_calls,
    (SELECT COUNT(*) FROM public.connector_usage_log cul WHERE cul.account_id = ca.id AND cul.success = FALSE) as failed_calls
FROM public.connected_accounts ca;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

SELECT 'Database schema created successfully!' as status;
