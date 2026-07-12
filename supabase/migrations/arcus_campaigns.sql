
-- ──────────────────────────────────────────────────────────────────────────────
-- Arcus Outreach: cold-email campaigns
-- Run this in the Supabase SQL editor.
--
-- Three tables:
--   arcus_campaigns            one row per outreach campaign (the employee's job)
--   arcus_campaign_recipients  one row per human — research, draft, send + reply state
--   arcus_suppression_list     addresses never to contact again (unsubscribe/bounce/manual)
--
-- Delivery itself rides the EXISTING arcus_scheduled_emails queue (source
-- 'campaign'); the dispatcher inside the send-scheduled cron tops it up a few
-- rows at a time, respecting the daily cap, ramp-up curve, and send window.
-- Nothing is ever enqueued before the user explicitly approves the campaign.
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS arcus_campaigns (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          TEXT        NOT NULL,
  name             TEXT        NOT NULL,
  brief            TEXT        NOT NULL,                   -- the pitch/goal + personalization guidance
  status           TEXT        NOT NULL DEFAULT 'drafting'
                     CHECK (status IN ('drafting','review','sending','paused','completed','cancelled')),
  daily_cap        INT         NOT NULL DEFAULT 40,        -- user-adjustable ceiling
  ramp             JSONB       DEFAULT '{"start":15,"step":5}'::jsonb,  -- reputation ramp-up curve
  send_window      JSONB       DEFAULT '{"startHour":9,"endHour":17,"weekdaysOnly":true}'::jsonb,
  research_depth   TEXT        NOT NULL DEFAULT 'standard'
                     CHECK (research_depth IN ('light','standard','deep')),
  subject_hint     TEXT,
  domain_health    JSONB,                                  -- pre-flight SPF/DMARC check result
  recipient_count  INT         NOT NULL DEFAULT 0,
  drafted_count    INT         NOT NULL DEFAULT 0,
  sent_count       INT         NOT NULL DEFAULT 0,
  replied_count    INT         NOT NULL DEFAULT 0,
  meeting_count    INT         NOT NULL DEFAULT 0,
  failed_count     INT         NOT NULL DEFAULT 0,
  last_error       TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  approved_at      TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS arcus_campaigns_user_idx
  ON arcus_campaigns (user_id, status);

CREATE TABLE IF NOT EXISTS arcus_campaign_recipients (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id         UUID        NOT NULL REFERENCES arcus_campaigns(id) ON DELETE CASCADE,
  user_id             TEXT        NOT NULL,
  email               TEXT        NOT NULL,
  name                TEXT,
  company             TEXT,
  context             JSONB,                               -- arbitrary CSV/Notion columns
  hook                TEXT,                                -- the researched personalization angle
  research            JSONB,                               -- evidence chips: [{source, fact}]
  subject             TEXT,
  body                TEXT,
  voice_score         INT,
  deliverability_score INT,
  generic_flag        BOOLEAN     DEFAULT FALSE,
  status              TEXT        NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','researching','drafted','excluded','queued',
                                          'sent','failed','replied','meeting','suppressed')),
  reply_intent        TEXT,                                -- interested|question|objection|not_now|unsubscribe|wrong_person
  reply_snippet       TEXT,
  response_draft_id   TEXT,                                -- Gmail draft id of Arcus's drafted follow-through
  scheduled_email_id  UUID,                                -- arcus_scheduled_emails row once queued
  sent_message_id     TEXT,
  thread_id           TEXT,
  error               TEXT,
  sent_at             TIMESTAMPTZ,
  replied_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- One row per address per campaign.
CREATE UNIQUE INDEX IF NOT EXISTS arcus_campaign_recipients_unique_idx
  ON arcus_campaign_recipients (campaign_id, lower(email));
-- Dispatcher hot path + cross-campaign suppression lookups.
CREATE INDEX IF NOT EXISTS arcus_campaign_recipients_status_idx
  ON arcus_campaign_recipients (campaign_id, status);
CREATE INDEX IF NOT EXISTS arcus_campaign_recipients_user_email_idx
  ON arcus_campaign_recipients (user_id, lower(email));

CREATE TABLE IF NOT EXISTS arcus_suppression_list (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     TEXT        NOT NULL,
  email       TEXT        NOT NULL,
  reason      TEXT        NOT NULL DEFAULT 'manual'
                CHECK (reason IN ('unsubscribe','bounce','manual')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS arcus_suppression_unique_idx
  ON arcus_suppression_list (user_id, lower(email));

ALTER TABLE arcus_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE arcus_campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE arcus_suppression_list ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users manage own campaigns"
    ON arcus_campaigns FOR ALL
    USING (user_id = auth.uid()::text OR user_id = (SELECT email FROM auth.users WHERE id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users manage own campaign recipients"
    ON arcus_campaign_recipients FOR ALL
    USING (user_id = auth.uid()::text OR user_id = (SELECT email FROM auth.users WHERE id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users manage own suppression list"
    ON arcus_suppression_list FOR ALL
    USING (user_id = auth.uid()::text OR user_id = (SELECT email FROM auth.users WHERE id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
