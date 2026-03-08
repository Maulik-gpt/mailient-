-- Supabase Database Schema for Mailient Subscriptions
-- Run this in your Supabase SQL editor

-- Create user_subscriptions table for storing subscription data
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  
  -- Whop subscription details
  whop_membership_id TEXT,
  whop_product_id TEXT,
  
  -- Plan info
  plan_type TEXT NOT NULL CHECK (plan_type IN ('starter', 'pro', 'none')),
  plan_price DECIMAL(10, 2),
  
  -- Subscription dates
  subscription_started_at TIMESTAMP WITH TIME ZONE,
  subscription_ends_at TIMESTAMP WITH TIME ZONE,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'expired', 'cancelled', 'inactive')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_feature_usage table for tracking feature usage
CREATE TABLE IF NOT EXISTS user_feature_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  
  -- Feature types
  feature_type TEXT NOT NULL CHECK (feature_type IN (
    'draft_reply',
    'schedule_call',
    'ai_notes',
    'sift_analysis',
    'arcus_ai',
    'email_summary'
  )),
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  
  -- Period tracking (for monthly features)
  period_start DATE,
  period_end DATE,
  
  -- For daily features
  last_reset_date DATE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint per user per feature per period
  UNIQUE(user_id, feature_type, period_start)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_ends_at ON user_subscriptions(subscription_ends_at);
CREATE INDEX IF NOT EXISTS idx_user_feature_usage_user_id ON user_feature_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feature_usage_feature ON user_feature_usage(user_id, feature_type);
CREATE INDEX IF NOT EXISTS idx_user_feature_usage_period ON user_feature_usage(user_id, period_start, period_end);

-- Disable Row Level Security for service role access
ALTER TABLE user_subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_feature_usage DISABLE ROW LEVEL SECURITY;

-- Create RLS policies (for when RLS is enabled)
DROP POLICY IF EXISTS "Users can view own subscription" ON user_subscriptions;
CREATE POLICY "Users can view own subscription" ON user_subscriptions
  FOR SELECT USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can view own feature usage" ON user_feature_usage;
CREATE POLICY "Users can view own feature usage" ON user_feature_usage
  FOR SELECT USING (user_id = auth.uid()::text);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON user_subscriptions;
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_feature_usage_updated_at ON user_feature_usage;
CREATE TRIGGER update_user_feature_usage_updated_at
  BEFORE UPDATE ON user_feature_usage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to check if subscription is active
CREATE OR REPLACE FUNCTION is_subscription_active(p_user_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_status TEXT;
  v_ends_at TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT status, subscription_ends_at
  INTO v_status, v_ends_at
  FROM user_subscriptions
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  RETURN v_status = 'active' AND v_ends_at > NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to get remaining feature credits
CREATE OR REPLACE FUNCTION get_feature_credits(
  p_user_id TEXT,
  p_feature_type TEXT,
  p_is_daily BOOLEAN DEFAULT FALSE
)
RETURNS INTEGER AS $$
DECLARE
  v_usage_count INTEGER;
  v_period_start DATE;
  v_last_reset DATE;
BEGIN
  IF p_is_daily THEN
    -- For daily features, get today's usage
    SELECT usage_count, last_reset_date
    INTO v_usage_count, v_last_reset
    FROM user_feature_usage
    WHERE user_id = p_user_id
      AND feature_type = p_feature_type
      AND last_reset_date = CURRENT_DATE;
    
    IF NOT FOUND THEN
      RETURN 0;  -- No usage today
    END IF;
    
    RETURN v_usage_count;
  ELSE
    -- For monthly features, get current period usage
    SELECT usage_count
    INTO v_usage_count
    FROM user_feature_usage
    WHERE user_id = p_user_id
      AND feature_type = p_feature_type
      AND CURRENT_DATE BETWEEN period_start AND period_end;
    
    IF NOT FOUND THEN
      RETURN 0;  -- No usage this period
    END IF;
    
    RETURN v_usage_count;
  END IF;
END;
$$ LANGUAGE plpgsql;
