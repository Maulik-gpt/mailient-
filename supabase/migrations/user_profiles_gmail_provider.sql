-- Records HOW each user connected Gmail, directly on the users table, so the
-- split between Composio-managed sign-in and direct Google OAuth is countable
-- without joining arcus_integrations or decrypting a marker token:
--
--   SELECT gmail_provider, count(*)
--   FROM user_profiles
--   GROUP BY gmail_provider;
--
-- Values written by persistUserData on each login (best-effort, non-fatal):
--   'composio' — signed in through the composio-login credentials provider
--   'google'   — signed in through our direct Google OAuth client
-- Existing rows stay NULL until that user next logs in (see the optional
-- backfill note in the PR / chat if you want historical rows filled in).

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS gmail_provider text;

CREATE INDEX IF NOT EXISTS idx_user_profiles_gmail_provider
  ON user_profiles (gmail_provider);
