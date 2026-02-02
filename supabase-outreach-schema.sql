-- AI Outreach Engine Schema
-- Tables for managing prospects, lists, and campaigns

-- Prospect Lists Table
CREATE TABLE IF NOT EXISTS prospect_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    prospect_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prospects Table (individual leads)
CREATE TABLE IF NOT EXISTS prospects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id UUID REFERENCES prospect_lists(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    job_title VARCHAR(255),
    company VARCHAR(255),
    company_domain VARCHAR(255),
    location VARCHAR(255),
    industry VARCHAR(255),
    linkedin_url TEXT,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Business Profiles Table (user's business info for AI)
CREATE TABLE IF NOT EXISTS business_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255),
    url TEXT,
    description TEXT,
    value_proposition TEXT,
    target_audience TEXT,
    industry VARCHAR(100),
    tone VARCHAR(50) DEFAULT 'professional',
    ai_analysis JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Campaigns Table
CREATE TABLE IF NOT EXISTS outreach_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'draft', -- draft, active, paused, completed
    follow_up_days INTEGER DEFAULT 3,
    total_prospects INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    replied_count INTEGER DEFAULT 0,
    bounced_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Campaign Emails Table (individual email tracking)
CREATE TABLE IF NOT EXISTS campaign_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES outreach_campaigns(id) ON DELETE CASCADE,
    prospect_id UUID REFERENCES prospects(id) ON DELETE SET NULL,
    to_email VARCHAR(255) NOT NULL,
    to_name VARCHAR(255),
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, sent, opened, replied, bounced
    gmail_message_id VARCHAR(255),
    sent_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    replied_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email Templates Table (saved templates)
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    category VARCHAR(100),
    is_ai_generated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_prospects_user ON prospects(user_id);
CREATE INDEX IF NOT EXISTS idx_prospects_list ON prospects(list_id);
CREATE INDEX IF NOT EXISTS idx_prospects_email ON prospects(email);
CREATE INDEX IF NOT EXISTS idx_campaigns_user ON outreach_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON outreach_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaign_emails_campaign ON campaign_emails(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_emails_status ON campaign_emails(status);

-- Row Level Security
ALTER TABLE prospect_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only access their own data)
CREATE POLICY prospect_lists_policy ON prospect_lists
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY prospects_policy ON prospects
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY business_profiles_policy ON business_profiles
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY outreach_campaigns_policy ON outreach_campaigns
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY email_templates_policy ON email_templates
    FOR ALL USING (user_id = auth.uid());
