-- Supabase Database Schema for Mailient
-- Run this in your Supabase SQL editor

-- Enable Row Level Security
-- Note: JWT secret is managed by Supabase, no need to set it manually

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  picture TEXT,
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  website TEXT,
  status TEXT DEFAULT 'online',
  preferences JSONB DEFAULT '{"theme": "dark", "language": "en", "notifications": true, "email_frequency": "daily", "timezone": "UTC"}',
  birthdate DATE,
  gender TEXT,
  work_status TEXT,
  interests TEXT[],
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_tokens table
CREATE TABLE IF NOT EXISTS user_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  google_email TEXT UNIQUE NOT NULL,
  encrypted_access_token TEXT NOT NULL,
  encrypted_refresh_token TEXT,
  access_token_expires_at TIMESTAMP WITH TIME ZONE,
  token_type TEXT DEFAULT 'Bearer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add user_id column if it doesn't exist (for existing tables)
ALTER TABLE user_tokens ADD COLUMN IF NOT EXISTS user_id TEXT;
-- Update existing rows to set user_id = google_email
UPDATE user_tokens SET user_id = google_email WHERE user_id IS NULL;
-- Make user_id NOT NULL
ALTER TABLE user_tokens ALTER COLUMN user_id SET NOT NULL;

-- Create user_emails table
CREATE TABLE IF NOT EXISTS user_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  email_id TEXT NOT NULL,
  thread_id TEXT,
  subject TEXT,
  from_email TEXT,
  to_email TEXT,
  date TIMESTAMP WITH TIME ZONE,
  snippet TEXT,
  labels JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, email_id)
);

-- Create agent_chat_history table
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

-- Create search_history table for tracking user searches
CREATE TABLE IF NOT EXISTS search_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  query TEXT NOT NULL,
  filters JSONB DEFAULT '{}',
  results_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create saved_searches table for user's saved search queries
CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  query TEXT NOT NULL,
  filters JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unsubscribed_emails table
CREATE TABLE IF NOT EXISTS unsubscribed_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  email_id TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  sender_name TEXT,
  subject TEXT,
  received_at TIMESTAMP WITH TIME ZONE,
  snippet TEXT,
  category TEXT,
  user_email TEXT NOT NULL,
  unsubscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, email_id)
);

-- Create search_index table for optimized full-text search
CREATE TABLE IF NOT EXISTS search_index (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('email', 'contact', 'thread', 'post', 'action')),
  content_id TEXT NOT NULL,
  title TEXT,
  content TEXT,
  metadata JSONB DEFAULT '{}',
  searchable_text tsvector,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create search_performance table for tracking search metrics
CREATE TABLE IF NOT EXISTS search_performance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  query TEXT NOT NULL,
  results_count INTEGER NOT NULL,
  response_time_ms INTEGER NOT NULL,
  search_type TEXT DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add full-text search columns to existing tables
ALTER TABLE user_emails ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE agent_chat_history ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON user_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tokens_google_email ON user_tokens(google_email);
CREATE INDEX IF NOT EXISTS idx_user_emails_user_id ON user_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_user_emails_date ON user_emails(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_user_emails_email_id ON user_emails(email_id);
CREATE INDEX IF NOT EXISTS idx_unsubscribed_emails_user_id ON unsubscribed_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_unsubscribed_emails_email_id ON unsubscribed_emails(email_id);
CREATE INDEX IF NOT EXISTS idx_unsubscribed_emails_sender ON unsubscribed_emails(sender_email);
CREATE INDEX IF NOT EXISTS idx_agent_chat_history_user_id ON agent_chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_chat_history_conversation_id ON agent_chat_history(conversation_id);
CREATE INDEX IF NOT EXISTS idx_agent_chat_history_user_conversation ON agent_chat_history(user_id, conversation_id);

-- Create advanced search indexes
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_created_at ON search_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_search_index_user_content ON search_index(user_id, content_type);
CREATE INDEX IF NOT EXISTS idx_search_index_searchable ON search_index USING gin(searchable_text);
CREATE INDEX IF NOT EXISTS idx_search_performance_user_id ON search_performance(user_id);
CREATE INDEX IF NOT EXISTS idx_user_emails_search_vector ON user_emails USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_user_profiles_search_vector ON user_profiles USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_agent_chat_history_search_vector ON agent_chat_history USING gin(search_vector);

-- Disable Row Level Security (RLS) for NextAuth integration
-- Using service role key which bypasses RLS
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_emails DISABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only access their own data
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can view own tokens" ON user_tokens;
CREATE POLICY "Users can view own tokens" ON user_tokens
  FOR SELECT USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own tokens" ON user_tokens;
CREATE POLICY "Users can update own tokens" ON user_tokens
  FOR UPDATE USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can insert own tokens" ON user_tokens;
CREATE POLICY "Users can insert own tokens" ON user_tokens
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can view own emails" ON user_emails;
CREATE POLICY "Users can view own emails" ON user_emails
  FOR SELECT USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own emails" ON user_emails;
CREATE POLICY "Users can update own emails" ON user_emails
  FOR UPDATE USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can insert own emails" ON user_emails;
CREATE POLICY "Users can insert own emails" ON user_emails
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own emails" ON user_emails;
CREATE POLICY "Users can delete own emails" ON user_emails
  FOR DELETE USING (user_id = auth.uid()::text);

-- RLS policies for unsubscribed_emails table
DROP POLICY IF EXISTS "Users can view own unsubscribed emails" ON unsubscribed_emails;
CREATE POLICY "Users can view own unsubscribed emails" ON unsubscribed_emails
  FOR SELECT USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can insert own unsubscribed emails" ON unsubscribed_emails;
CREATE POLICY "Users can insert own unsubscribed emails" ON unsubscribed_emails
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own unsubscribed emails" ON unsubscribed_emails;
CREATE POLICY "Users can delete own unsubscribed emails" ON unsubscribed_emails
  FOR DELETE USING (user_id = auth.uid()::text);

-- RLS policies for agent_chat_history table
DROP POLICY IF EXISTS "Users can view own chat history" ON agent_chat_history;
CREATE POLICY "Users can view own chat history" ON agent_chat_history
  FOR SELECT USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can insert own chat history" ON agent_chat_history;
CREATE POLICY "Users can insert own chat history" ON agent_chat_history
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own chat history" ON agent_chat_history;
CREATE POLICY "Users can delete own chat history" ON agent_chat_history
  FOR DELETE USING (user_id = auth.uid()::text);

-- RLS policies for search_history table
DROP POLICY IF EXISTS "Users can view own search history" ON search_history;
CREATE POLICY "Users can view own search history" ON search_history
  FOR SELECT USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can insert own search history" ON search_history;
CREATE POLICY "Users can insert own search history" ON search_history
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own search history" ON search_history;
CREATE POLICY "Users can delete own search history" ON search_history
  FOR DELETE USING (user_id = auth.uid()::text);

-- RLS policies for saved_searches table
DROP POLICY IF EXISTS "Users can view own saved searches" ON saved_searches;
CREATE POLICY "Users can view own saved searches" ON saved_searches
  FOR SELECT USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can insert own saved searches" ON saved_searches;
CREATE POLICY "Users can insert own saved searches" ON saved_searches
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own saved searches" ON saved_searches;
CREATE POLICY "Users can update own saved searches" ON saved_searches
  FOR UPDATE USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own saved searches" ON saved_searches;
CREATE POLICY "Users can delete own saved searches" ON saved_searches
  FOR DELETE USING (user_id = auth.uid()::text);

-- RLS policies for search_index table
DROP POLICY IF EXISTS "Users can view own search index" ON search_index;
CREATE POLICY "Users can view own search index" ON search_index
  FOR SELECT USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can insert own search index" ON search_index;
CREATE POLICY "Users can insert own search index" ON search_index
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own search index" ON search_index;
CREATE POLICY "Users can update own search index" ON search_index
  FOR UPDATE USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own search index" ON search_index;
CREATE POLICY "Users can delete own search index" ON search_index
  FOR DELETE USING (user_id = auth.uid()::text);

-- RLS policies for search_performance table
DROP POLICY IF EXISTS "Users can view own search performance" ON search_performance;
CREATE POLICY "Users can view own search performance" ON search_performance
  FOR SELECT USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can insert own search performance" ON search_performance;
CREATE POLICY "Users can insert own search performance" ON search_performance
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

-- Create functions for automatic updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_tokens_updated_at ON user_tokens;
CREATE TRIGGER update_user_tokens_updated_at
  BEFORE UPDATE ON user_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_emails_updated_at ON user_emails;
CREATE TRIGGER update_user_emails_updated_at
  BEFORE UPDATE ON user_emails
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_unsubscribed_emails_updated_at ON unsubscribed_emails;
CREATE TRIGGER update_unsubscribed_emails_updated_at
  BEFORE UPDATE ON unsubscribed_emails
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update search vectors for full-text search
CREATE OR REPLACE FUNCTION update_search_vectors()
RETURNS TRIGGER AS $
BEGIN
  -- Update search vector for user_emails
  IF TG_TABLE_NAME = 'user_emails' THEN
    NEW.search_vector = to_tsvector('english', 
      COALESCE(NEW.subject, '') || ' ' || 
      COALESCE(NEW.snippet, '') || ' ' || 
      COALESCE(NEW.from_email, '') || ' ' || 
      COALESCE(NEW.to_email, '')
    );
  END IF;
  
  -- Update search vector for user_profiles
  IF TG_TABLE_NAME = 'user_profiles' THEN
    NEW.search_vector = to_tsvector('english', 
      COALESCE(NEW.name, '') || ' ' || 
      COALESCE(NEW.email, '') || ' ' || 
      COALESCE(NEW.bio, '') || ' ' || 
      COALESCE(NEW.location, '') || ' ' || 
      COALESCE(NEW.website, '')
    );
  END IF;
  
  -- Update search vector for agent_chat_history
  IF TG_TABLE_NAME = 'agent_chat_history' THEN
    NEW.search_vector = to_tsvector('english', 
      COALESCE(NEW.user_message, '') || ' ' || 
      COALESCE(NEW.agent_response, '')
    );
  END IF;
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Create triggers for search vector updates
DROP TRIGGER IF EXISTS update_user_emails_search_vector ON user_emails;
CREATE TRIGGER update_user_emails_search_vector
  BEFORE INSERT OR UPDATE ON user_emails
  FOR EACH ROW EXECUTE FUNCTION update_search_vectors();

DROP TRIGGER IF EXISTS update_user_profiles_search_vector ON user_profiles;
CREATE TRIGGER update_user_profiles_search_vector
  BEFORE INSERT OR UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_search_vectors();

DROP TRIGGER IF EXISTS update_agent_chat_history_search_vector ON agent_chat_history;
CREATE TRIGGER update_agent_chat_history_search_vector
  BEFORE INSERT OR UPDATE ON agent_chat_history
  FOR EACH ROW EXECUTE FUNCTION update_search_vectors();

-- Create triggers for saved_searches updated_at
DROP TRIGGER IF EXISTS update_saved_searches_updated_at ON saved_searches;
CREATE TRIGGER update_saved_searches_updated_at
  BEFORE UPDATE ON saved_searches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to search across multiple tables efficiently
CREATE OR REPLACE FUNCTION unified_search(
  search_user_id TEXT,
  search_query TEXT,
  search_filters JSONB DEFAULT '{}',
  content_types TEXT[] DEFAULT ARRAY['email', 'contact', 'thread', 'post'],
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  content_type TEXT,
  title TEXT,
  content TEXT,
  metadata JSONB,
  relevance REAL,
  created_at TIMESTAMP WITH TIME ZONE
) AS $
BEGIN
  RETURN QUERY
  WITH search_results AS (
    -- Search in emails
    SELECT 
      e.id,
      'email' as content_type,
      COALESCE(e.subject, '') as title,
      COALESCE(e.snippet, '') as content,
      jsonb_build_object(
        'sender', e.from_email,
        'recipients', e.to_email,
        'labels', e.labels,
        'thread_id', e.thread_id
      ) as metadata,
      ts_rank(e.search_vector, plainto_tsquery('english', search_query)) as relevance,
      e.date as created_at
    FROM user_emails e
    WHERE e.user_id = search_user_id
      AND ('email' = ANY(content_types) OR content_types IS NULL)
      AND (search_query = '' OR e.search_vector @@ plainto_tsquery('english', search_query))
      AND (
        search_filters ? 'dateRange' IS FALSE OR
        (NOT (search_filters->'dateRange'->>'start')::timestamp IS NULL 
         AND e.date >= (search_filters->'dateRange'->>'start')::timestamp)
      )
      AND (
        search_filters ? 'dateRange' IS FALSE OR
        (NOT (search_filters->'dateRange'->>'end')::timestamp IS NULL 
         AND e.date <= (search_filters->'dateRange'->>'end')::timestamp)
      )
    
    UNION ALL
    
    -- Search in user profiles (contacts)
    SELECT 
      p.id,
      'contact' as content_type,
      COALESCE(p.name, '') as title,
      COALESCE(p.email, '') as content,
      jsonb_build_object(
        'bio', p.bio,
        'location', p.location,
        'website', p.website,
        'status', p.status
      ) as metadata,
      ts_rank(p.search_vector, plainto_tsquery('english', search_query)) as relevance,
      p.created_at
    FROM user_profiles p
    WHERE p.user_id = search_user_id
      AND ('contact' = ANY(content_types) OR content_types IS NULL)
      AND (search_query = '' OR p.search_vector @@ plainto_tsquery('english', search_query))
    
    UNION ALL
    
    -- Search in chat history
    SELECT 
      c.id,
      'post' as content_type,
      'Chat Message' as title,
      COALESCE(c.user_message, '') || ' ' || COALESCE(c.agent_response, '') as content,
      jsonb_build_object(
        'conversation_id', c.conversation_id,
        'is_initial', c.is_initial_message
      ) as metadata,
      ts_rank(c.search_vector, plainto_tsquery('english', search_query)) as relevance,
      c.created_at
    FROM agent_chat_history c
    WHERE c.user_id = search_user_id
      AND ('post' = ANY(content_types) OR content_types IS NULL)
      AND (search_query = '' OR c.search_vector @@ plainto_tsquery('english', search_query))
  )
  SELECT * FROM search_results
  ORDER BY relevance DESC, created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$ LANGUAGE plpgsql;


