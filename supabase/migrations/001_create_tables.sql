-- =============================================================
-- Wavepilot — Initial schema migration
-- Creates all 5 tables per architecture doc
-- Run: supabase db push (or paste in Supabase SQL Editor)
-- =============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------
-- 1. users
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY,                     -- Clerk user_id synced on first login
  email         text NOT NULL,
  niche         text,
  platforms     text[] DEFAULT '{}',                  -- e.g. {'tiktok','instagram'}
  posting_goal  text,                                 -- e.g. '3-4x/week'
  plan_type_pref text,                                -- last selected output type
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------
-- 2. plans
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS plans (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  output_type   text NOT NULL CHECK (output_type IN ('calendar', 'trends', 'strategy')),
  niche         text NOT NULL,
  platforms     text[] NOT NULL DEFAULT '{}',
  content       text NOT NULL,                        -- raw markdown from Claude
  prompt_tokens int4 DEFAULT 0,                       -- cost monitoring
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_plans_user_id ON plans(user_id);
CREATE INDEX idx_plans_created_at ON plans(created_at DESC);

-- -----------------------------------------------------------
-- 3. trend_cache
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS trend_cache (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key   text NOT NULL,                          -- SHA-256 of niche + sorted platforms
  data        jsonb NOT NULL,                         -- normalised trend payload
  fetched_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE UNIQUE INDEX idx_trend_cache_key ON trend_cache(cache_key);
CREATE INDEX idx_trend_cache_expires ON trend_cache(expires_at);

-- -----------------------------------------------------------
-- 4. usage_events
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS usage_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id         uuid REFERENCES plans(id) ON DELETE SET NULL,  -- nullable if generation failed
  billing_period  text NOT NULL,                      -- e.g. '2026-04'
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_usage_user_period ON usage_events(user_id, billing_period);

-- -----------------------------------------------------------
-- 5. subscriptions
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id                 uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id      text UNIQUE NOT NULL,
  stripe_subscription_id  text,
  plan                    text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'creator', 'pro')),
  status                  text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled')),
  current_period_end      timestamptz
);
