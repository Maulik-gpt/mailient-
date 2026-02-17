-- =====================================================
-- Mission Control Tables for Mailient
-- Run this in your Supabase SQL editor
-- =====================================================

-- Missions table: each mission is a goal tied to email threads
CREATE TABLE IF NOT EXISTS missions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'waiting', 'at_risk', 'completed', 'failed')),
  success_condition TEXT,
  next_step TEXT,
  deadline TIMESTAMP WITH TIME ZONE,
  escalation_rules JSONB DEFAULT '{}',
  linked_thread_ids TEXT[] DEFAULT '{}',
  linked_email_ids TEXT[] DEFAULT '{}',
  outcome_log TEXT,
  auto_detected BOOLEAN DEFAULT FALSE,
  agent_actions_log JSONB[] DEFAULT '{}',
  follow_up_count INTEGER DEFAULT 0,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_missions_user_id ON missions(user_id);
CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status);
CREATE INDEX IF NOT EXISTS idx_missions_deadline ON missions(deadline);
CREATE INDEX IF NOT EXISTS idx_missions_user_status ON missions(user_id, status);

-- Autopilot rules table: user-defined boundaries for agent actions
CREATE TABLE IF NOT EXISTS autopilot_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  rule_type TEXT NOT NULL
    CHECK (rule_type IN ('follow_up_limit', 'new_contact_approval', 'pricing_approval', 'time_window', 'auto_send')),
  rule_config JSONB NOT NULL DEFAULT '{}',
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_autopilot_rules_user_id ON autopilot_rules(user_id);

-- Enable Row Level Security
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE autopilot_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for missions
CREATE POLICY "Users can view own missions"
  ON missions FOR SELECT
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'email');

CREATE POLICY "Users can insert own missions"
  ON missions FOR INSERT
  WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'email');

CREATE POLICY "Users can update own missions"
  ON missions FOR UPDATE
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'email');

CREATE POLICY "Users can delete own missions"
  ON missions FOR DELETE
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'email');

-- Service role bypass for missions (API routes use service role key)
CREATE POLICY "Service role can manage all missions"
  ON missions FOR ALL
  USING (current_setting('role', true) = 'service_role');

-- RLS Policies for autopilot_rules
CREATE POLICY "Users can view own autopilot rules"
  ON autopilot_rules FOR SELECT
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'email');

CREATE POLICY "Users can insert own autopilot rules"
  ON autopilot_rules FOR INSERT
  WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'email');

CREATE POLICY "Users can update own autopilot rules"
  ON autopilot_rules FOR UPDATE
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'email');

CREATE POLICY "Users can delete own autopilot rules"
  ON autopilot_rules FOR DELETE
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'email');

-- Service role bypass for autopilot_rules
CREATE POLICY "Service role can manage all autopilot rules"
  ON autopilot_rules FOR ALL
  USING (current_setting('role', true) = 'service_role');

-- Updated timestamp trigger for missions
CREATE OR REPLACE FUNCTION update_mission_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_mission_timestamp
  BEFORE UPDATE ON missions
  FOR EACH ROW
  EXECUTE FUNCTION update_mission_timestamp();

CREATE TRIGGER trigger_update_autopilot_timestamp
  BEFORE UPDATE ON autopilot_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_mission_timestamp();
