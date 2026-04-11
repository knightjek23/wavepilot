/**
 * Sliding window rate limiter — in-memory for now.
 *
 * Architecture doc spec: max 10 plan generation requests per user per hour.
 * Returns 429 with retry-after header when exceeded.
 *
 * TODO: Move to Redis or Supabase for multi-instance deploys.
 * In-memory is fine for single-instance Vercel serverless since each
 * cold start resets the window (which is conservative, not permissive).
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 10;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number | null;
}

export function checkRateLimit(userId: string): RateLimitResult {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  let entry = store.get(userId);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(userId, entry);
  }

  // Prune timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  if (entry.timestamps.length >= MAX_REQUESTS) {
    // Oldest timestamp in window — retry after it falls out
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = oldestInWindow + WINDOW_MS - now;
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);

    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  entry.timestamps.push(now);
  return {
    allowed: true,
    remaining: MAX_REQUESTS - entry.timestamps.length,
    retryAfterSeconds: null,
  };
}
