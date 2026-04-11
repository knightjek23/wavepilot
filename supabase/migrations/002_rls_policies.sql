-- =============================================================
-- Wavepilot — Row Level Security policies
-- All tables get RLS enabled. Policies use auth.uid() which
-- maps to the Clerk user_id stored in users.id.
--
-- Service role key bypasses RLS for server-side admin operations.
-- =============================================================

-- -----------------------------------------------------------
-- Enable RLS on all tables
-- -----------------------------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------
-- users — users can read/update their own row
-- -----------------------------------------------------------
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Insert is handled server-side via service role during Clerk sync

-- -----------------------------------------------------------
-- plans — users can read their own plans
-- -----------------------------------------------------------
CREATE POLICY "Users can read own plans"
  ON plans FOR SELECT
  USING (user_id = auth.uid());

-- Insert/delete handled server-side via service role

-- -----------------------------------------------------------
-- trend_cache — read-only for all authenticated users (shared cache)
-- -----------------------------------------------------------
CREATE POLICY "Authenticated users can read cache"
  ON trend_cache FOR SELECT
  TO authenticated
  USING (true);

-- Write handled server-side via service role

-- -----------------------------------------------------------
-- usage_events — users can read their own usage
-- -----------------------------------------------------------
CREATE POLICY "Users can read own usage"
  ON usage_events FOR SELECT
  USING (user_id = auth.uid());

-- Insert handled server-side via service role

-- -----------------------------------------------------------
-- subscriptions — users can read their own subscription
-- -----------------------------------------------------------
CREATE POLICY "Users can read own subscription"
  ON subscriptions FOR SELECT
  USING (user_id = auth.uid());

-- All writes handled server-side via Stripe webhook + service role
