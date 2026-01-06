-- Voice Profile Table Migration
-- Stores user's analyzed voice/writing style for AI draft generation

-- Create the user_voice_profiles table
CREATE TABLE IF NOT EXISTS user_voice_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    voice_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_voice_profiles_user_id ON user_voice_profiles(user_id);

-- Add RLS policies
ALTER TABLE user_voice_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own voice profile
CREATE POLICY "Users can view own voice profile" ON user_voice_profiles
    FOR SELECT USING (true);

-- Policy: Users can insert their own voice profile  
CREATE POLICY "Users can insert own voice profile" ON user_voice_profiles
    FOR INSERT WITH CHECK (true);

-- Policy: Users can update their own voice profile
CREATE POLICY "Users can update own voice profile" ON user_voice_profiles
    FOR UPDATE USING (true);

-- Policy: Service role has full access
CREATE POLICY "Service role full access to voice profiles" ON user_voice_profiles
    FOR ALL USING (true);

-- Add comment to table
COMMENT ON TABLE user_voice_profiles IS 'Stores analyzed voice/writing style profiles for each user to enable AI voice cloning in draft replies';
COMMENT ON COLUMN user_voice_profiles.voice_profile IS 'JSON containing tone, greeting patterns, closing patterns, language patterns, structural patterns, and personality traits';
