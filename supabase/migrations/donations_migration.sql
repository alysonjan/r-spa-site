-- ============================================
-- Donations Table — Database Migration
-- Run this in Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC NOT NULL,
  donor_name TEXT NOT NULL DEFAULT 'Anonymous',
  donor_email TEXT NOT NULL DEFAULT '',
  wants_receipt BOOLEAN NOT NULL DEFAULT false,
  stripe_payment_intent_id TEXT,
  user_id TEXT DEFAULT 'guest',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_donations_donor_email ON donations(donor_email);
CREATE INDEX IF NOT EXISTS idx_donations_user_id ON donations(user_id);
CREATE INDEX IF NOT EXISTS idx_donations_stripe_payment_intent_id ON donations(stripe_payment_intent_id);

-- Enable RLS
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to view their own donations
DROP POLICY IF EXISTS "Users can read own donations" ON donations;
CREATE POLICY "Users can read own donations"
  ON donations FOR SELECT
  USING (auth.uid()::text = user_id);

-- Service role will bypass RLS automatically for inserts from the webhook
