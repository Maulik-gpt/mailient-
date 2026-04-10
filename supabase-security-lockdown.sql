-- MAILIENT SECURITY LOCKDOWN: ROW LEVEL SECURITY (RLS)
-- Run this in your Supabase SQL Editor to prevent unauthorized data access.
-- Updated: Only includes tables that exist in the database.

-- 1. Enable RLS on all tables (will skip gracefully if table doesn't exist)

ALTER TABLE IF EXISTS user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS agent_chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS unsubscribed_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_feature_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_voice_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS integration_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS integration_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS email_actions_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS arcus_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS arcus_run_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS arcus_run_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS arcus_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS pending_connections ENABLE ROW LEVEL SECURITY;

-- 2. Create Policies
-- NOTE: Using DO blocks to safely skip if the table doesn't exist.

-- User Profiles
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    DROP POLICY IF EXISTS "Users can access own profile" ON user_profiles;
    CREATE POLICY "Users can access own profile" ON user_profiles FOR ALL
      USING (auth.uid()::text = user_id)
      WITH CHECK (auth.uid()::text = user_id);
  END IF;
END $$;

-- User Tokens (CRITICAL)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_tokens') THEN
    DROP POLICY IF EXISTS "Users can access own tokens" ON user_tokens;
    CREATE POLICY "Users can access own tokens" ON user_tokens FOR ALL
      USING (auth.uid()::text = user_id OR auth.email() = google_email)
      WITH CHECK (auth.uid()::text = user_id OR auth.email() = google_email);
  END IF;
END $$;

-- User Emails
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_emails') THEN
    DROP POLICY IF EXISTS "Users can access own emails" ON user_emails;
    CREATE POLICY "Users can access own emails" ON user_emails FOR ALL
      USING (auth.uid()::text = user_id)
      WITH CHECK (auth.uid()::text = user_id);
  END IF;
END $$;

-- Agent Chat History
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agent_chat_history') THEN
    DROP POLICY IF EXISTS "Users can access own chats" ON agent_chat_history;
    CREATE POLICY "Users can access own chats" ON agent_chat_history FOR ALL
      USING (auth.uid()::text = user_id)
      WITH CHECK (auth.uid()::text = user_id);
  END IF;
END $$;

-- Notes
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notes') THEN
    DROP POLICY IF EXISTS "Users can access own notes" ON notes;
    CREATE POLICY "Users can access own notes" ON notes FOR ALL
      USING (auth.uid()::text = user_id)
      WITH CHECK (auth.uid()::text = user_id);
  END IF;
END $$;

-- Unsubscribed Emails
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'unsubscribed_emails') THEN
    DROP POLICY IF EXISTS "Users can access own unsubs" ON unsubscribed_emails;
    CREATE POLICY "Users can access own unsubs" ON unsubscribed_emails FOR ALL
      USING (auth.uid()::text = user_id)
      WITH CHECK (auth.uid()::text = user_id);
  END IF;
END $$;

-- User Feature Usage
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_feature_usage') THEN
    DROP POLICY IF EXISTS "Users can access own usage" ON user_feature_usage;
    CREATE POLICY "Users can access own usage" ON user_feature_usage FOR ALL
      USING (auth.uid()::text = user_id)
      WITH CHECK (auth.uid()::text = user_id);
  END IF;
END $$;

-- User Subscriptions
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_subscriptions') THEN
    DROP POLICY IF EXISTS "Users can access own subs" ON user_subscriptions;
    CREATE POLICY "Users can access own subs" ON user_subscriptions FOR ALL
      USING (auth.uid()::text = user_id)
      WITH CHECK (auth.uid()::text = user_id);
  END IF;
END $$;

-- User Voice Profiles
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_voice_profiles') THEN
    DROP POLICY IF EXISTS "Users can access own voice" ON user_voice_profiles;
    CREATE POLICY "Users can access own voice" ON user_voice_profiles FOR ALL
      USING (auth.uid()::text = user_id)
      WITH CHECK (auth.uid()::text = user_id);
  END IF;
END $$;

-- Integration Credentials
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'integration_credentials') THEN
    DROP POLICY IF EXISTS "Users can access own integrations" ON integration_credentials;
    CREATE POLICY "Users can access own integrations" ON integration_credentials FOR ALL
      USING (auth.uid()::text = user_id)
      WITH CHECK (auth.uid()::text = user_id);
  END IF;
END $$;

-- Integration Events
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'integration_events') THEN
    DROP POLICY IF EXISTS "Users can access own events" ON integration_events;
    CREATE POLICY "Users can access own events" ON integration_events FOR ALL
      USING (auth.uid()::text = user_id)
      WITH CHECK (auth.uid()::text = user_id);
  END IF;
END $$;

-- Email Actions Log
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_actions_log') THEN
    DROP POLICY IF EXISTS "Users can access own actions" ON email_actions_log;
    CREATE POLICY "Users can access own actions" ON email_actions_log FOR ALL
      USING (auth.uid()::text = user_id)
      WITH CHECK (auth.uid()::text = user_id);
  END IF;
END $$;

-- User Connections
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_connections') THEN
    DROP POLICY IF EXISTS "Users can access own connections" ON user_connections;
    CREATE POLICY "Users can access own connections" ON user_connections FOR ALL
      USING (auth.uid()::text = user_id)
      WITH CHECK (auth.uid()::text = user_id);
  END IF;
END $$;

-- Pending Connections
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pending_connections') THEN
    DROP POLICY IF EXISTS "Users can access own pending" ON pending_connections;
    CREATE POLICY "Users can access own pending" ON pending_connections FOR ALL
      USING (auth.uid()::text = inviter_user_id OR auth.uid()::text = invitee_user_id)
      WITH CHECK (auth.uid()::text = inviter_user_id);
  END IF;
END $$;

-- Arcus Runs
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'arcus_runs') THEN
    DROP POLICY IF EXISTS "Users can access own runs" ON arcus_runs;
    CREATE POLICY "Users can access own runs" ON arcus_runs FOR ALL
      USING (auth.uid()::text = user_id)
      WITH CHECK (auth.uid()::text = user_id);
  END IF;
END $$;

-- Arcus Jobs
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'arcus_jobs') THEN
    DROP POLICY IF EXISTS "Users can access own jobs" ON arcus_jobs;
    CREATE POLICY "Users can access own jobs" ON arcus_jobs FOR ALL
      USING (auth.uid()::text = user_id)
      WITH CHECK (auth.uid()::text = user_id);
  END IF;
END $$;
