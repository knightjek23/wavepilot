-- =============================================================
-- Wavepilot — Caption/Hook Generator feature
-- Adds caption_sets table + event_type column on usage_events
-- Run: supabase db push (or paste in Supabase SQL Editor)
-- =============================================================

-- -----------------------------------------------------------
-- 1. caption_sets
-- One row per generation batch. items is a JSONB array of
-- { hook, caption, hashtags[] } objects so we can render cards.
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS caption_sets (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic          text NOT NULL,
  platform       text NOT NULL CHECK (platform IN (
                   'tiktok','instagram','youtube','reddit','twitter','linkedin','facebook'
                 )),
  vibe           text NOT NULL DEFAULT 'educational' CHECK (vibe IN (
                   'educational','funny','bold','story','hype'
                 )),
  count          int4 NOT NULL CHECK (count > 0 AND count <= 20),
  items          jsonb NOT NULL,                    -- [{hook, caption, hashtags[]}, ...]
  prompt_tokens  int4 DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_caption_sets_user_id ON caption_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_caption_sets_created_at ON caption_sets(created_at DESC);

-- RLS
ALTER TABLE caption_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own caption sets"
  ON caption_sets FOR SELECT
  USING (user_id = auth.uid());

-- Insert/delete handled server-side via service role

-- -----------------------------------------------------------
-- 2. usage_events.event_type
-- Distinguishes plan generations from caption generations so
-- each has its own quota.
-- -----------------------------------------------------------
ALTER TABLE usage_events
  ADD COLUMN IF NOT EXISTS event_type text NOT NULL DEFAULT 'plan'
    CHECK (event_type IN ('plan', 'caption'));

-- Nullable caption_set_id (parallel to plan_id)
ALTER TABLE usage_events
  ADD COLUMN IF NOT EXISTS caption_set_id uuid REFERENCES caption_sets(id) ON DELETE SET NULL;

-- Composite index for the new quota query path
CREATE INDEX IF NOT EXISTS idx_usage_user_period_type
  ON usage_events(user_id, billing_period, event_type);

-- -----------------------------------------------------------
-- 3. usage_events.success
-- Fixes a latent bug: checkQuota was counting ALL usage rows
-- including failed attempts, so 5 API failures could burn a
-- free user's entire monthly quota. Default true keeps
-- historical rows counting as successes (they were — they
-- predate this column).
-- -----------------------------------------------------------
ALTER TABLE usage_events
  ADD COLUMN IF NOT EXISTS success boolean NOT NULL DEFAULT true;

-- -----------------------------------------------------------
-- 4. Backfill (defensive) — any existing rows are 'plan'
-- -----------------------------------------------------------
UPDATE usage_events SET event_type = 'plan' WHERE event_type IS NULL;
