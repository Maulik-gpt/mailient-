-- ============================================
-- Access Requests Table
-- Stores gated access requests from the landing page
-- Users request access → admin approves → user gets approval email → signs up
-- ============================================

CREATE TABLE IF NOT EXISTS access_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  has_international_card BOOLEAN NOT NULL DEFAULT false,
  x_handle TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Unique constraint on email (one request per email)
CREATE UNIQUE INDEX IF NOT EXISTS idx_access_requests_email_unique ON access_requests(LOWER(email));

-- Fast lookup by status for admin dashboard
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests(status);

-- RLS: disable for now (accessed via service role key from API routes)
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;
