-- Enhanced Search Schema for Mailient
-- Advanced database optimizations for high-performance search

-- Create search_synonyms table for better search results
CREATE TABLE IF NOT EXISTS search_synonyms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT,
  synonym_group TEXT NOT NULL,
  terms TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create search_user_dictionary for personalized suggestions
CREATE TABLE IF NOT EXISTS search_user_dictionary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  term TEXT NOT NULL,
  frequency INTEGER DEFAULT 1,
  last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced search index with materialized view for better performance
CREATE MATERIALIZED VIEW IF NOT EXISTS search_materialized_index AS
SELECT 
  ue.id,
  ue.user_id,
  'email' as content_type,
  ue.email_id as content_id,
  COALESCE(ue.subject, '') as title,
  COALESCE(ue.snippet, '') as content,
  COALESCE(ue.from_email, '') || ' ' || COALESCE(ue.to_email, '') as people,
  ue.date,
  ue.labels,
  ue.search_vector,
  to_tsvector('english', 
    COALESCE(ue.subject, '') || ' ' || 
    COALESCE(ue.snippet, '') || ' ' || 
    COALESCE(ue.from_email, '') || ' ' || 
    COALESCE(ue.to_email, '')
  ) as full_text_search
FROM user_emails ue

UNION ALL

SELECT 
  up.id,
  up.user_id,
  'contact' as content_type,
  up.user_id as content_id, -- Use user_id as content_id for contacts
  COALESCE(up.name, '') as title,
  COALESCE(up.email, '') || ' ' || COALESCE(up.bio, '') as content,
  COALESCE(up.email, '') as people,
  up.created_at as date,
  NULL as labels,
  up.search_vector,
  to_tsvector('english', 
    COALESCE(up.name, '') || ' ' || 
    COALESCE(up.email, '') || ' ' || 
    COALESCE(up.bio, '') || ' ' || 
    COALESCE(up.location, '') || ' ' || 
    COALESCE(up.website, '')
  ) as full_text_search
FROM user_profiles up

UNION ALL

SELECT 
  ach.id,
  ach.user_id,
  'post' as content_type,
  ach.conversation_id as content_id,
  'Chat Message' as title,
  COALESCE(ach.user_message, '') || ' ' || COALESCE(ach.agent_response, '') as content,
  COALESCE(ach.user_message, '') as people,
  ach.created_at as date,
  NULL as labels,
  ach.search_vector,
  to_tsvector('english', 
    COALESCE(ach.user_message, '') || ' ' || 
    COALESCE(ach.agent_response, '')
  ) as full_text_search
FROM agent_chat_history ach;

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_search_materialized_unique 
ON search_materialized_index(user_id, content_type, content_id);

-- Create GIN indexes for fast search
CREATE INDEX IF NOT EXISTS idx_search_materialized_fts 
ON search_materialized_index USING gin(full_text_search);

CREATE INDEX IF NOT EXISTS idx_search_materialized_user_type 
ON search_materialized_index(user_id, content_type);

CREATE INDEX IF NOT EXISTS idx_search_materialized_date 
ON search_materialized_index(date DESC);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_search_index()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW search_materialized_index;
END;
$$ LANGUAGE plpgsql;

-- Function to get search suggestions based on user's history
CREATE OR REPLACE FUNCTION get_search_suggestions(
  search_user_id TEXT,
  search_query TEXT,
  suggestion_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  suggestion TEXT,
  type TEXT,
  relevance REAL
) AS $$
BEGIN
  RETURN QUERY
  WITH user_terms AS (
    -- Get frequent terms from user's search history
    SELECT 
      LOWER(unnest(string_to_array(sh.query, ' '))) as term,
      COUNT(*) as frequency
    FROM search_history sh
    WHERE sh.user_id = search_user_id
      AND sh.query ILIKE '%' || search_query || '%'
    GROUP BY term
    ORDER BY frequency DESC
    LIMIT 20
  ),
  email_suggestions AS (
    -- Get suggestions from email subjects
    SELECT 
      DISTINCT subject as suggestion,
      'email_subject' as type,
      ts_rank(to_tsvector('english', subject), plainto_tsquery('english', search_query)) as relevance
    FROM user_emails
    WHERE user_id = search_user_id
      AND subject ILIKE '%' || search_query || '%'
    ORDER BY relevance DESC
    LIMIT suggestion_limit / 3
  ),
  contact_suggestions AS (
    -- Get suggestions from contact names and emails
    SELECT 
      DISTINCT name as suggestion,
      'contact_name' as type,
      ts_rank(to_tsvector('english', name), plainto_tsquery('english', search_query)) as relevance
    FROM user_profiles
    WHERE user_id = search_user_id
      AND name ILIKE '%' || search_query || '%'
    
    UNION ALL
    
    SELECT 
      DISTINCT email as suggestion,
      'contact_email' as type,
      ts_rank(to_tsvector('english', email), plainto_tsquery('english', search_query)) as relevance
    FROM user_profiles
    WHERE user_id = search_user_id
      AND email ILIKE '%' || search_query || '%'
    
    ORDER BY relevance DESC
    LIMIT suggestion_limit / 3
  )
  SELECT * FROM email_suggestions
  UNION ALL
  SELECT * FROM contact_suggestions
  UNION ALL
  SELECT 
    term as suggestion,
    'history' as type,
    (frequency::REAL / 100.0) as relevance
  FROM user_terms
  ORDER BY relevance DESC
  LIMIT suggestion_limit;
END;
$$ LANGUAGE plpgsql;

-- Enhanced unified search function with better performance
CREATE OR REPLACE FUNCTION unified_search_enhanced(
  search_user_id TEXT,
  search_query TEXT,
  search_filters JSONB DEFAULT '{}',
  content_types TEXT[] DEFAULT ARRAY['email', 'contact', 'thread', 'post'],
  sort_by TEXT DEFAULT 'relevance',
  sort_order TEXT DEFAULT 'desc',
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
  created_at TIMESTAMP WITH TIME ZONE,
  snippet TEXT,
  people TEXT,
  labels JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH filtered_results AS (
    SELECT 
      smi.id,
      smi.content_type,
      smi.title,
      smi.content,
      CASE 
        WHEN smi.content_type = 'email' THEN 
          jsonb_build_object(
            'sender', (SELECT from_email FROM user_emails WHERE email_id = smi.content_id AND user_id = smi.user_id),
            'recipients', (SELECT to_email FROM user_emails WHERE email_id = smi.content_id AND user_id = smi.user_id),
            'labels', smi.labels,
            'thread_id', (SELECT thread_id FROM user_emails WHERE email_id = smi.content_id AND user_id = smi.user_id),
            'hasAttachments', (SELECT CASE WHEN attachments IS NOT NULL THEN true ELSE false END FROM user_emails WHERE email_id = smi.content_id AND user_id = smi.user_id)
          )
        WHEN smi.content_type = 'contact' THEN 
          jsonb_build_object(
            'email', (SELECT email FROM user_profiles WHERE user_id = smi.user_id),
            'bio', (SELECT bio FROM user_profiles WHERE user_id = smi.user_id),
            'location', (SELECT location FROM user_profiles WHERE user_id = smi.user_id),
            'status', (SELECT status FROM user_profiles WHERE user_id = smi.user_id)
          )
        WHEN smi.content_type = 'post' THEN 
          jsonb_build_object(
            'conversation_id', (SELECT conversation_id FROM agent_chat_history WHERE id = smi.id),
            'is_initial', (SELECT is_initial_message FROM agent_chat_history WHERE id = smi.id)
          )
        ELSE '{}'::jsonb
      END as metadata,
      -- Calculate relevance with multiple factors
      COALESCE(
        ts_rank(smi.full_text_search, plainto_tsquery('english', search_query)) +
        CASE 
          WHEN search_query != '' AND LOWER(smi.title) LIKE '%' || LOWER(search_query) || '%' THEN 0.3
          ELSE 0
        END +
        CASE 
          WHEN search_query != '' AND LOWER(smi.content) LIKE '%' || LOWER(search_query) || '%' THEN 0.2
          ELSE 0
        END,
        0
      ) as relevance,
      smi.date as created_at,
      CASE 
        WHEN smi.content_type = 'email' THEN 
          SUBSTRING((SELECT snippet FROM user_emails WHERE email_id = smi.content_id AND user_id = smi.user_id) FROM 1 FOR 200)
        ELSE SUBSTRING(smi.content FROM 1 FOR 200)
      END as snippet,
      smi.people,
      smi.labels
    FROM search_materialized_index smi
    WHERE smi.user_id = search_user_id
      AND (content_types IS NULL OR smi.content_type = ANY(content_types))
      AND (
        search_query = '' OR 
        smi.full_text_search @@ plainto_tsquery('english', search_query) OR
        LOWER(smi.title) LIKE '%' || LOWER(search_query) || '%' OR
        LOWER(smi.content) LIKE '%' || LOWER(search_query) || '%' OR
        LOWER(smi.people) LIKE '%' || LOWER(search_query) || '%'
      )
      -- Apply filters
      AND (
        search_filters ? 'dateRange' IS FALSE OR
        (NOT (search_filters->'dateRange'->>'start')::timestamp IS NULL 
         AND smi.date >= (search_filters->'dateRange'->>'start')::timestamp)
      )
      AND (
        search_filters ? 'dateRange' IS FALSE OR
        (NOT (search_filters->'dateRange'->>'end')::timestamp IS NULL 
         AND smi.date <= (search_filters->'dateRange'->>'end')::timestamp)
      )
      AND (
        search_filters ? 'sender' IS FALSE OR
        LOWER(smi.people) LIKE '%' || LOWER(search_filters->>'sender') || '%'
      )
      AND (
        search_filters ? 'labels' IS FALSE OR
        smi.labels && (search_filters->'labels')
      )
  )
  SELECT 
    fr.id,
    fr.content_type,
    fr.title,
    fr.content,
    fr.metadata,
    fr.relevance,
    fr.created_at,
    fr.snippet,
    fr.people,
    fr.labels
  FROM filtered_results fr
  ORDER BY 
    CASE 
      WHEN sort_by = 'relevance' AND sort_order = 'desc' THEN fr.relevance 
    END DESC,
    CASE 
      WHEN sort_by = 'date' AND sort_order = 'desc' THEN fr.created_at 
    END DESC,
    CASE 
      WHEN sort_by = 'date' AND sort_order = 'asc' THEN fr.created_at 
    END ASC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get search analytics
CREATE OR REPLACE FUNCTION get_search_analytics(
  search_user_id TEXT,
  time_range TEXT DEFAULT '7d'
)
RETURNS JSONB AS $$
DECLARE
  start_date TIMESTAMP WITH TIME ZONE;
  analytics JSONB;
BEGIN
  -- Calculate start date based on time range
  CASE time_range
    WHEN '1d' THEN start_date := NOW() - INTERVAL '1 day';
    WHEN '7d' THEN start_date := NOW() - INTERVAL '7 days';
    WHEN '30d' THEN start_date := NOW() - INTERVAL '30 days';
    WHEN '90d' THEN start_date := NOW() - INTERVAL '90 days';
    ELSE start_date := NOW() - INTERVAL '7 days';
  END CASE;

  SELECT jsonb_build_object(
    'totalSearches', (
      SELECT COUNT(*) FROM search_performance 
      WHERE user_id = search_user_id AND created_at >= start_date
    ),
    'averageResponseTime', (
      SELECT AVG(response_time_ms) FROM search_performance 
      WHERE user_id = search_user_id AND created_at >= start_date
    ),
    'totalQueries', (
      SELECT COUNT(*) FROM search_history 
      WHERE user_id = search_user_id AND created_at >= start_date
    ),
    'uniqueQueries', (
      SELECT COUNT(DISTINCT query) FROM search_history 
      WHERE user_id = search_user_id AND created_at >= start_date
    ),
    'topSearchTerms', (
      SELECT jsonb_agg(jsonb_build_object('term', term, 'frequency', frequency))
      FROM (
        SELECT LOWER(unnest(string_to_array(query, ' '))) as term, COUNT(*) as frequency
        FROM search_history
        WHERE user_id = search_user_id AND created_at >= start_date
        GROUP BY term
        ORDER BY frequency DESC
        LIMIT 10
      ) top_terms
    ),
    'performanceTrend', (
      SELECT jsonb_agg(jsonb_build_object(
        'date', date_trunc('day', created_at),
        'avgResponseTime', avg_response_time,
        'searchCount', search_count
      ))
      FROM (
        SELECT 
          date_trunc('day', created_at) as date,
          AVG(response_time_ms) as avg_response_time,
          COUNT(*) as search_count
        FROM search_performance
        WHERE user_id = search_user_id AND created_at >= start_date
        GROUP BY date_trunc('day', created_at)
        ORDER BY date
      ) performance_trend
    )
  ) INTO analytics;

  RETURN analytics;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_search_synonyms_user_id ON search_synonyms(user_id);
CREATE INDEX IF NOT EXISTS idx_search_user_dictionary_user_id ON search_user_dictionary(user_id);
CREATE INDEX IF NOT EXISTS idx_search_user_dictionary_term ON search_user_dictionary(user_id, term);
CREATE INDEX IF NOT EXISTS idx_search_user_dictionary_frequency ON search_user_dictionary(user_id, frequency DESC);

-- RLS policies for new tables
ALTER TABLE search_synonyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_user_dictionary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own search synonyms" ON search_synonyms
  FOR ALL USING (user_id = auth.uid()::text);

CREATE POLICY "Users can manage own search dictionary" ON search_user_dictionary
  FOR ALL USING (user_id = auth.uid()::text);

-- Create triggers to refresh materialized view
CREATE OR REPLACE FUNCTION trigger_refresh_search_index()
RETURNS TRIGGER AS $$
BEGIN
  -- Refresh the materialized view in background
  PERFORM pg_notify('refresh_search_index', '');
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create notification listener for materialized view refresh
CREATE OR REPLACE FUNCTION listen_for_refresh()
RETURNS trigger AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY search_materialized_index;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;