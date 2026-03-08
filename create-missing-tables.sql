-- Database Migration Script for Missing Tables
-- Run this SQL in your Supabase SQL Editor

-- Create user_tokens table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  google_email TEXT UNIQUE NOT NULL,
  encrypted_access_token TEXT NOT NULL,
  encrypted_refresh_token TEXT,
  access_token_expires_at TIMESTAMP WITH TIME ZONE,
  token_type TEXT DEFAULT 'Bearer',
  scopes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON user_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tokens_google_email ON user_tokens(google_email);

-- Create agent_chat_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS agent_chat_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  user_message TEXT NOT NULL,
  agent_response TEXT NOT NULL,
  message_order INTEGER NOT NULL DEFAULT 1,
  is_initial_message BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for agent_chat_history
CREATE INDEX IF NOT EXISTS idx_agent_chat_history_user_id ON agent_chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_chat_history_conversation_id ON agent_chat_history(conversation_id);
CREATE INDEX IF NOT EXISTS idx_agent_chat_history_user_conversation ON agent_chat_history(user_id, conversation_id);

-- Disable Row Level Security for these tables (since we're using service role)
ALTER TABLE user_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE agent_chat_history DISABLE ROW LEVEL SECURITY;

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_user_tokens_updated_at ON user_tokens;
CREATE TRIGGER update_user_tokens_updated_at
  BEFORE UPDATE ON user_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();