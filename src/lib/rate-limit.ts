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

// Per-scope limits. Each scope has its own pool so captions don't
// eat into the plan-generation budget.
const SCOPE_LIMITS: Record<string, number> = {
  plan: 10,      // 10 plan generations / hour
  caption: 20,   // 20 caption batches / hour (each batch is N captions)
};
const DEFAULT_LIMIT = 10;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number | null;
}

/**
 * Check the sliding-window rate limit for a user in a given scope.
 *
 * @param userId  Clerk user id
 * @param scope   "plan" | "caption" — defaults to "plan" for back-compat
 */
export function checkRateLimit(userId: string, scope: string = "plan"): RateLimitResult {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const limit = SCOPE_LIMITS[scope] ?? DEFAULT_LIMIT;
  const key = `${scope}:${userId}`;

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Prune timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  if (entry.timestamps.length >= limit) {
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
    remaining: limit - entry.timestamps.length,
    retryAfterSeconds: null,
  };
}
