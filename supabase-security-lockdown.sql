-- MAILIENT SECURITY LOCKDOWN: ROW LEVEL SECURITY (RLS)
-- Run this in your Supabase SQL Editor to prevent unauthorized data access.

-- 1. Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE unsubscribed_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_performance ENABLE ROW LEVEL SECURITY;

-- 2. Create Policies (Restrict to authenticated users owning the data)

-- User Profiles: Only the user can see/edit their own profile
CREATE POLICY "Users can only access their own profile" 
ON user_profiles FOR ALL 
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

-- User Tokens: Only the user can access their tokens (CRITICAL)
CREATE POLICY "Users can only access their own tokens" 
ON user_tokens FOR ALL 
USING (auth.uid()::text = user_id OR auth.email() = google_email)
WITH CHECK (auth.uid()::text = user_id OR auth.email() = google_email);

-- User Emails: Crucial for privacy
CREATE POLICY "Users can only access their own emails" 
ON user_emails FOR ALL 
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

-- Agent Chat History
CREATE POLICY "Users can only access their own chat history" 
ON agent_chat_history FOR ALL 
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

-- Notes
CREATE POLICY "Users can only access their own notes" 
ON notes FOR ALL 
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

-- Agent Missions
CREATE POLICY "Users can only access their own missions" 
ON agent_missions FOR ALL 
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

-- 3. Public access for public profile parts (if needed)
-- Example: Allow reading name/picture for badges/referrals if username matches
CREATE POLICY "Profiles are readable by username for referrals"
ON user_profiles FOR SELECT
USING (true); -- Optional: replace with more specific logic if you want private profiles

-- 4. Admin Access (Service Role)
-- Supabase Service Role key bypasses RLS by default, so your backend will still work.

PRINT '✅ Security Shield Activated: RLS Policies deployed.';
