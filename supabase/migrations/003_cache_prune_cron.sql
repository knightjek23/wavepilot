-- =============================================================
-- Wavepilot — pg_cron job to prune expired trend_cache rows
-- Runs nightly at 3:00 AM UTC
--
-- Requires pg_cron extension (enabled by default on Supabase)
-- =============================================================

-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule nightly prune of expired cache entries
SELECT cron.schedule(
  'prune-expired-trend-cache',     -- job name
  '0 3 * * *',                     -- every day at 3:00 AM UTC
  $$DELETE FROM trend_cache WHERE expires_at < now()$$
);
