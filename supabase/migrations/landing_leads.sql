-- Landing-page leads — emails captured from an OPT-IN field on mailient.xyz.
--
-- Every row is someone who typed their OWN email into the capture field. We
-- deliberately store nothing about the anonymous-visitor side — no IP, no
-- fingerprint, no de-anonymisation. You cannot email a pageview, and we do not
-- try to turn one into a person. This table only exists so the capture form can
-- (a) fire the hook email once and (b) never email the same address twice.
--
-- `email` is the PRIMARY KEY, so a re-submit is a unique-violation the API
-- treats as "already captured" and silently ignores — no duplicate emails.

CREATE TABLE IF NOT EXISTS landing_leads (
  email            text PRIMARY KEY,
  source           text,                         -- which surface captured it (e.g. 'landing')
  hook_emailed_at  timestamptz,                  -- when the hook email actually went out
  converted        boolean NOT NULL DEFAULT false, -- flip true if they later sign up
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_landing_leads_created ON landing_leads (created_at DESC);

-- Service-role only. The capture route uses the admin client; nothing here is
-- client-writable, so the endpoint is the single controlled way in.
ALTER TABLE landing_leads ENABLE ROW LEVEL SECURITY;
