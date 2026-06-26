-- ============================================
-- Spa Open Tab System — Database Migration
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Add 'role' column to profiles table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'customer';
  END IF;
END $$;

-- 2. Create spa_tabs table
CREATE TABLE IF NOT EXISTS spa_tabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  customer_id TEXT NOT NULL,
  customer_name TEXT NOT NULL DEFAULT '',
  customer_email TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'checked_in', 'closed')),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  total_cents INTEGER NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create tab_items table
CREATE TABLE IF NOT EXISTS tab_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tab_id UUID NOT NULL REFERENCES spa_tabs(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'service' CHECK (type IN ('service', 'food', 'addon')),
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  added_by TEXT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_spa_tabs_date ON spa_tabs(date);
CREATE INDEX IF NOT EXISTS idx_spa_tabs_customer_id ON spa_tabs(customer_id);
CREATE INDEX IF NOT EXISTS idx_spa_tabs_status ON spa_tabs(status);
CREATE INDEX IF NOT EXISTS idx_tab_items_tab_id ON tab_items(tab_id);

-- 5. Enable RLS (but allow service role full access)
ALTER TABLE spa_tabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tab_items ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read their own tabs
DROP POLICY IF EXISTS "Users can read own tabs" ON spa_tabs;
CREATE POLICY "Users can read own tabs"
  ON spa_tabs FOR SELECT
  USING (auth.uid()::text = customer_id);

-- Policy: Allow service role full access (for API routes using supabaseAdmin)
-- Note: supabaseAdmin bypasses RLS by default, so no explicit policy needed for it.

-- Policy: Allow authenticated users to read items on their own tabs
DROP POLICY IF EXISTS "Users can read own tab items" ON tab_items;
CREATE POLICY "Users can read own tab items"
  ON tab_items FOR SELECT
  USING (
    tab_id IN (SELECT id FROM spa_tabs WHERE customer_id = auth.uid()::text)
  );
