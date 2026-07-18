-- Mailient referrals — the real backbone.
--
-- WHY THIS EXISTS
-- The original system had no table at all. A referral was a cookie, an
-- `invited_by` string on user_profiles, and an inviter lookup that guessed:
--     .or(`username.ilike.${code},user_id.ilike.${code}@%`)
-- That is unindexed, matches the WRONG account when two users share a name
-- prefix, interpolates user input straight into a filter, and pairs with
-- .maybeSingle() — which returns an ERROR (not a row) the moment two profiles
-- match, silently dropping the reward. Codes now live in their own table with a
-- unique constraint, and every referral is a row with a lifecycle you can audit.

-- ── Codes ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_codes (
  code           text PRIMARY KEY,
  user_id        text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- One code per user. Re-running code generation must be idempotent, never a
-- second code that splits the same person's credit across two links.
CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_codes_user ON referral_codes(lower(user_id));

-- ── Referrals ────────────────────────────────────────────────────────────────
-- One row per referred PERSON, created the moment they sign up (not on click —
-- a click is anonymous and would let anyone inflate someone's stats).
CREATE TABLE IF NOT EXISTS referrals (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code              text NOT NULL,
  referrer_user_id  text NOT NULL,
  referred_user_id  text NOT NULL,
  -- signed_up -> trialing -> converted   (rejected = failed a fraud check)
  status            text NOT NULL DEFAULT 'signed_up',
  -- Set once, when the reward is actually granted. Doubles as the idempotency
  -- guard: a non-null value means the referrer has already been paid for this
  -- person and must never be paid again.
  rewarded_at       timestamptz,
  reward_days       integer,
  converted_at      timestamptz,
  rejected_reason   text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- A person can only ever be referred ONCE. This is the single most important
-- constraint here: without it, a friend who signs up, deletes, and returns via a
-- different link pays out twice.
CREATE UNIQUE INDEX IF NOT EXISTS idx_referrals_referred_once ON referrals(lower(referred_user_id));
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(lower(referrer_user_id));
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

-- ── Reward ledger ────────────────────────────────────────────────────────────
-- Append-only. preferences.free_pro_until on user_profiles stays the value the
-- access gate reads (it already does), but that field is a moving target with no
-- history — you cannot answer "why does this account have Pro until October?"
-- from it. Every grant is recorded here so the balance is always explainable.
CREATE TABLE IF NOT EXISTS referral_rewards (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       text NOT NULL,
  days          integer NOT NULL,
  reason        text NOT NULL,           -- 'referrer_conversion' | 'referred_welcome'
  referral_id   uuid REFERENCES referrals(id) ON DELETE SET NULL,
  granted_until timestamptz,             -- the free_pro_until this grant produced
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_rewards_user ON referral_rewards(lower(user_id));

-- Service-role only. Nothing here is client-writable: a user who could INSERT
-- into referrals could mint themselves free months.
ALTER TABLE referral_codes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;
