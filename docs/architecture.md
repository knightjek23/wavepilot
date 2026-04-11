# Wavepilot — Architecture Reference
**Version:** 1.0 | **Date:** April 7, 2026

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router, TypeScript) |
| Database | Supabase (Postgres + Edge Functions) |
| Auth | Clerk |
| Payments | Stripe |
| Hosting | Vercel |
| AI | Anthropic Claude API (`claude-sonnet-4-20250514`, web_search enabled) |
| Trend data | YouTube Data API v3, Reddit API, RapidAPI (TikTok + X scrapers) |
| Error tracking | Sentry |
| PDF export | @react-pdf/renderer |
| Cron jobs | Supabase pg_cron |

---

## Request lifecycle — "Generate Plan"

```
Browser (Next.js client)
  → POST /api/generate (user niche + platforms + output type)
      → Input validation (server-side)
      → UsageService.checkQuota(userId) → 429 if exceeded
      → TrendService.getTrends(niche, platforms)
          → CacheService.get(cacheKey) → return cached if fresh
          → If stale: YouTubeService + RedditService + TikTokService + TwitterService
          → CacheService.set(cacheKey, data, 24h)
      → ClaudeService.buildPrompt(profile, trendData, outputType)
      → ClaudeService.generatePlan(prompt) → Anthropic API call
      → Save plan to Supabase (plans table)
      → UsageService.logUsage(userId, planId)
      → Return plan markdown to client
  → Render plan in UI
  → Sentry captures any error in pipeline
```

### Fallback chain for trend data
1. Supabase cache hit (24h TTL) — fastest, free
2. Live API fetch from YouTube / Reddit / RapidAPI
3. Claude web_search fallback — if scraper fails, Claude independently searches

---

## Database schema (Supabase / Postgres)

### users
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK · Clerk user_id synced on first login |
| email | text | From Clerk |
| niche | text | Saved onboarding preference |
| platforms | text[] | e.g. ['TikTok', 'Instagram'] |
| posting_goal | text | e.g. '3–4 times per week' |
| plan_type_pref | text | Last selected output type |
| created_at | timestamptz | UTC always |

### plans
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → users.id |
| output_type | text | 'calendar' \| 'trends' \| 'strategy' |
| niche | text | Snapshot at generation time |
| platforms | text[] | Snapshot at generation time |
| content | text | Raw markdown from Claude response |
| prompt_tokens | int4 | For cost monitoring |
| created_at | timestamptz | UTC |

### trend_cache
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| cache_key | text | Unique index · SHA-256 of niche + sorted platform array |
| data | jsonb | Raw normalised trend payload |
| fetched_at | timestamptz | UTC |
| expires_at | timestamptz | fetched_at + 24h · pg_cron prunes nightly |

### usage_events
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → users.id |
| plan_id | uuid | FK → plans.id · nullable if generation failed |
| billing_period | text | e.g. '2026-04' · used for monthly quota counting |
| created_at | timestamptz | UTC |

### subscriptions
| Column | Type | Notes |
|---|---|---|
| user_id | uuid | PK + FK → users.id |
| stripe_customer_id | text | Unique |
| stripe_subscription_id | text | Active sub ID |
| plan | text | 'free' \| 'creator' \| 'pro' |
| status | text | 'active' \| 'past_due' \| 'canceled' |
| current_period_end | timestamptz | UTC · synced from Stripe webhook |

---

## Service layer — lib/services/

All external API calls go through service wrappers. Routes never call APIs directly.

### TrendService.ts
- `getTrends(niche, platforms)` — single entry point for all trend data
- Checks cache first, fetches if stale, normalises all sources to `TrendItem[]`
- Handles individual platform failures gracefully

### CacheService.ts
- `get(key)` / `set(key, data, ttlHours)` / `invalidate(key)`
- Cache key = SHA-256 hash of sorted niche + platform array
- Returns null if expired or missing

### ClaudeService.ts
- `buildPrompt(profile, trends, outputType)` — assembles final prompt
- `generatePlan(prompt)` — calls Anthropic API with web_search tool
- `parseResponse(content[])` — extracts text blocks, returns clean markdown

### UsageService.ts
- `checkQuota(userId)` — reads subscriptions + usage_events, returns bool
- `logUsage(userId, planId)` — writes usage_event row
- Plan limits: free=2, creator=20, pro=unlimited per billing_period

### StripeService.ts
- `createCheckoutSession(userId, plan)` — Stripe-hosted checkout
- `handleWebhook(event)` — syncs subscription state to Supabase
- `createPortalSession(customerId)` — self-serve plan management

### Rate limiting on /api/generate
- Max 10 plan generation requests per user per hour
- Sliding window, keyed by user_id
- Returns 429 with retry-after header

---

## External APIs

| API | Purpose | Cost | Limit |
|---|---|---|---|
| YouTube Data API v3 | Trending videos, keyword search | Free | 10K units/day |
| Reddit API | Top posts by niche subreddits | Free | 100 req/min |
| RapidAPI — TikTok scraper | Trending hashtags + videos | ~$10–30/mo | Varies by provider |
| RapidAPI — Twitter/X | Trending topics + hashtags | ~$10–20/mo | Varies |
| Anthropic Claude API | Plan generation | ~$0.10–0.40/plan | Per token |

---

## Environment variables

### Supabase
- `NEXT_PUBLIC_SUPABASE_URL` — safe to expose
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — safe to expose, RLS enforces access
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, bypasses RLS, NEVER in client

### Anthropic
- `ANTHROPIC_API_KEY` — server-only, used in ClaudeService.ts only

### Clerk
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — client-safe
- `CLERK_SECRET_KEY` — server-only

### Stripe
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — client-safe
- `STRIPE_SECRET_KEY` — server-only
- `STRIPE_WEBHOOK_SECRET` — verifies webhook signature

### External data APIs
- `YOUTUBE_API_KEY` — server-only
- `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` — server-only
- `RAPIDAPI_KEY` — single key covers TikTok + X scrapers

### Observability
- `SENTRY_DSN` — init in both client and server configs
- `SENTRY_AUTH_TOKEN` — source map uploads in CI build

### App config
- `NEXT_PUBLIC_APP_URL` — https://wavepilot.co (prod) or http://localhost:3000
- `ALLOWED_ORIGINS` — wavepilot.co,staging.wavepilot.co only

---

## Security requirements

- All API keys in env vars — never committed to git
- `SUPABASE_SERVICE_ROLE_KEY` server-only, never in client bundle
- Row-level security on all Supabase tables
- CORS locked to specific origins — no wildcard
- Stripe webhook signature verified on every event
- Rate limiting on all write endpoints
- Server-side input validation on all API routes
- DB changes via migration files only — no manual edits
- All timestamps stored in UTC — local conversion at display layer only
