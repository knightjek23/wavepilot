-- ============================================================
-- Wavepilot — Waitlist + Invite Tables (Sprint 4, Tickets #25 + #27)
-- ============================================================

-- Waitlist: collects emails from the landing page
CREATE TABLE IF NOT EXISTS waitlist (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,
  name        TEXT,
  niche       TEXT,
  referral    TEXT,           -- where they heard about us
  status      TEXT NOT NULL DEFAULT 'waiting',  -- waiting | invited | signed_up
  invite_code TEXT UNIQUE,    -- generated when batch invite runs
  invited_at  TIMESTAMPTZ,
  signed_up_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for batch invite queries (grab oldest waiting entries)
CREATE INDEX IF NOT EXISTS idx_waitlist_status_created
  ON waitlist (status, created_at ASC);

-- Index for invite code lookups
CREATE INDEX IF NOT EXISTS idx_waitlist_invite_code
  ON waitlist (invite_code) WHERE invite_code IS NOT NULL;

-- RLS: waitlist is admin-only (service role key). No client access.
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Public insert policy — allows the landing page API to insert without auth
CREATE POLICY waitlist_insert_public ON waitlist
  FOR INSERT
  WITH CHECK (true);

-- Only service role can read/update/delete
-- (no additional policies needed — RLS blocks all by default)

-- Add trial tracking columns to subscriptions table
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invite_code TEXT,
  ADD COLUMN IF NOT EXISTS cohort TEXT;  -- e.g. "launch-50", "beta-100"
