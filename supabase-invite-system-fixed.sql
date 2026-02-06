-- Invite System Database Schema for Mailient (Supabase Compatible)
-- Run this in your Supabase SQL editor

-- Create pending_connections table for tracking invites
CREATE TABLE IF NOT EXISTS pending_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inviter_id TEXT NOT NULL,
  invited_id TEXT,
  invited_email TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  invited_by TEXT, -- username of the inviter
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add invited_by column to user_profiles table
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS invited_by TEXT;
-- Add invite_count column for tracking number of successful invites
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS invite_count INTEGER DEFAULT 0;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pending_connections_inviter_id ON pending_connections(inviter_id);
CREATE INDEX IF NOT EXISTS idx_pending_connections_invited_id ON pending_connections(invited_id);
CREATE INDEX IF NOT EXISTS idx_pending_connections_invited_email ON pending_connections(invited_email);
CREATE INDEX IF NOT EXISTS idx_pending_connections_status ON pending_connections(status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_invited_by ON user_profiles(invited_by);

-- RLS policies for pending_connections table
DROP POLICY IF EXISTS "Users can view their own pending connections" ON pending_connections;
CREATE POLICY "Users can view their own pending connections" ON pending_connections
  FOR SELECT USING (inviter_id = auth.uid()::text OR invited_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can insert their own pending connections" ON pending_connections;
CREATE POLICY "Users can insert their own pending connections" ON pending_connections
  FOR INSERT WITH CHECK (inviter_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update their own pending connections" ON pending_connections;
CREATE POLICY "Users can update their own pending connections" ON pending_connections
  FOR UPDATE USING (inviter_id = auth.uid()::text OR invited_id = auth.uid()::text);

-- RLS policies for user_profiles invited_by column
DROP POLICY IF EXISTS "Users can view invited_by info" ON user_profiles;
CREATE POLICY "Users can view invited_by info" ON user_profiles
  FOR SELECT USING (true); -- Allow viewing invited_by for mutual connection display

DROP POLICY IF EXISTS "Users can update their own invited_by" ON user_profiles;
CREATE POLICY "Users can update their own invited_by" ON user_profiles
  FOR UPDATE USING (user_id = auth.uid()::text);

-- Function to update pending_connections updated_at
CREATE OR REPLACE FUNCTION update_pending_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_pending_connections_updated_at ON pending_connections;
CREATE TRIGGER update_pending_connections_updated_at
  BEFORE UPDATE ON pending_connections
  FOR EACH ROW EXECUTE FUNCTION update_pending_connections_updated_at();

-- Function to get connections (users who invited or were invited by the current user)
CREATE OR REPLACE FUNCTION get_connections(p_user_id TEXT)
RETURNS TABLE (
  user_id TEXT,
  username TEXT,
  name TEXT,
  avatar_url TEXT,
  bio TEXT,
  is_verified BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH user_connections AS (
    -- Find users who invited the current user (these should appear in Might Connect With)
    SELECT DISTINCT 
      pc.inviter_id as connected_user_id,
      'inviter' as connection_type
    FROM pending_connections pc
    WHERE pc.invited_id = p_user_id AND pc.status = 'pending'
    
    UNION
    
    -- Find users that the current user invited (these should also appear in Might Connect With)
    SELECT DISTINCT 
      pc.invited_id as connected_user_id,
      'invited' as connection_type
    FROM pending_connections pc
    WHERE pc.inviter_id = p_user_id AND pc.status = 'pending' AND pc.invited_id IS NOT NULL
  )
  SELECT 
    up.user_id,
    up.username,
    up.name,
    up.avatar_url,
    up.bio,
    COALESCE(up.is_verified, FALSE) as is_verified
  FROM user_profiles up
  INNER JOIN user_connections uc ON up.user_id = uc.connected_user_id
  WHERE up.user_id != p_user_id
  ORDER BY up.name;
END;
$$ LANGUAGE plpgsql;

-- Function to create pending connection
CREATE OR REPLACE FUNCTION create_pending_connection(
  p_inviter_id TEXT,
  p_invited_username TEXT,
  p_invited_email TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_connection_id UUID;
  v_invited_id TEXT;
BEGIN
  -- Find invited user by username or email
  SELECT user_id INTO v_invited_id
  FROM user_profiles
  WHERE username = p_invited_username OR email = p_invited_email
  LIMIT 1;
  
  -- Insert pending connection
  INSERT INTO pending_connections (inviter_id, invited_id, invited_email, invited_by)
  VALUES (p_inviter_id, v_invited_id, p_invited_email, p_invited_username)
  RETURNING id INTO v_connection_id;
  
  RETURN v_connection_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get mutual connections (for "Might Connect With" feature)
CREATE OR REPLACE FUNCTION get_mutual_connections(p_user_id TEXT)
RETURNS TABLE (
  user_id TEXT,
  username TEXT,
  name TEXT,
  avatar_url TEXT,
  bio TEXT,
  is_verified BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH user_connections AS (
    -- Find users who invited the current user (these should appear in Might Connect With)
    SELECT DISTINCT 
      pc.inviter_id as connected_user_id,
      'inviter' as connection_type
    FROM pending_connections pc
    WHERE pc.invited_id = p_user_id AND pc.status = 'pending'
    
    UNION
    
    -- Find users that the current user invited (these should also appear in Might Connect With)
    SELECT DISTINCT 
      pc.invited_id as connected_user_id,
      'invited' as connection_type
    FROM pending_connections pc
    WHERE pc.inviter_id = p_user_id AND pc.status = 'pending' AND pc.invited_id IS NOT NULL
  )
  SELECT 
    up.user_id,
    up.username,
    up.name,
    up.avatar_url,
    up.bio,
    COALESCE(up.is_verified, FALSE) as is_verified
  FROM user_profiles up
  INNER JOIN user_connections uc ON up.user_id = uc.connected_user_id
  WHERE up.user_id != p_user_id
  ORDER BY up.name;
END;
$$ LANGUAGE plpgsql;