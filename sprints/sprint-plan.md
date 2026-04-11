# Wavepilot — Sprint Plan
**Version:** 1.0 | **Date:** April 7, 2026  
**Total:** 4 sprints · 35 tickets · 138 story points · ~8 weeks

---

## Sprint overview

| Sprint | Goal | Points | Outcome |
|---|---|---|---|
| S1 | Foundation — auth, CI/CD, DB, first APIs | 34 pts | User can sign up and log in |
| S2 | Core engine — all APIs + Claude generating real plans | 38 pts | First end-to-end plan generated |
| S3 | Product — polished UI, export, plan history, billing | 36 pts | First paid user can subscribe |
| S4 | Launch — observability, landing page live, waitlist → users | 30 pts | Public launch ready |

---

## Epic map

| Epic | Colour | Sprints |
|---|---|---|
| Auth & onboarding | Green | S1 |
| Trend data layer | Blue | S1–S2 |
| AI plan engine | Amber | S2 |
| Plan UI & export | Purple | S3 |
| Billing & gating | Coral | S3–S4 |
| Observability & launch | Gray | S4 |

---

## Sprint 1 — Foundation (Weeks 1–2, 34 pts)

**Goal:** User can sign up, complete onboarding, and the first two data APIs are connected and caching.

| # | Type | Ticket | Tags | Pts |
|---|---|---|---|---|
| 1 | CHORE | Next.js project scaffold + Vercel deployment | blocks-all | 5 |
| 2 | CHORE | Supabase project setup + DB migrations (all 5 tables) | blocks-all | 5 |
| 3 | FEAT | Clerk auth — sign up, login, session + user sync to Supabase | needs-DB | 5 |
| 4 | FEAT | Onboarding flow UI (3-step: niche → platforms → goal + output type) | needs-auth | 5 |
| 5 | FEAT | YouTube API service layer (YouTubeService.ts + normalisation) | needs-DB | 5 |
| 6 | FEAT | Reddit API service layer (RedditService.ts + subreddit niche mapping) | needs-DB | 5 |
| 7 | CHORE | CacheService + trend_cache table + pg_cron prune job | needs-DB | 4 |

### Sprint 1 notes
- Tickets 1 and 2 must be completed before anything else starts — they block the entire board
- Onboarding UI can be basic at this stage — functional over polished
- YouTubeService and RedditService should return `TrendItem[]` — same normalised interface for TrendService to consume in S2
- CacheService integration test should cover both cache hit and cache miss paths

---

## Sprint 2 — Core engine (Weeks 3–4, 38 pts)

**Goal:** Full end-to-end plan generation working. User can generate all 3 plan types from the app.

| # | Type | Ticket | Tags | Pts |
|---|---|---|---|---|
| 8 | FEAT | RapidAPI TikTok service layer (TikTokService.ts + fallback flag) | needs-cache | 5 |
| 9 | FEAT | RapidAPI Twitter/X service layer (TwitterService.ts) | needs-cache | 4 |
| 10 | FEAT | TrendService orchestrator — merges all platform services, handles failures | needs-all-APIs | 5 |
| 11 | FEAT | ClaudeService — prompt builder + Anthropic API call + response parser | needs-TrendService | 8 |
| 12 | FEAT | POST /api/generate — full route with validation, quota check, rate limit | needs-Claude+Usage | 8 |
| 13 | FEAT | UsageService — quota check + usage logging | needs-DB+Stripe | 4 |
| 14 | CHORE | End-to-end smoke test — onboarding → all 3 plan types → DB rows verified | needs-full-engine | 4 |

### Sprint 2 notes
- ClaudeService is the most complex ticket this sprint (8 pts) — don't start it until TrendService is solid
- TwitterService is lower priority than TikTok — if time-boxed, defer to S3 backlog
- Ticket 14 is not optional — the smoke test before S3 is critical. It should cover all 3 output types and verify the plans table is being written correctly
- Test the fallback chain: mock a RapidAPI failure and verify Claude's web_search picks up the slack

---

## Sprint 3 — Product & billing (Weeks 5–6, 36 pts)

**Goal:** Polished plan UI, PDF export, plan history, and full Stripe billing flow live on staging.

| # | Type | Ticket | Tags | Pts |
|---|---|---|---|---|
| 15 | FEAT | Plan output UI — rendered markdown, summary chips, regenerate/adjust | needs-/api/generate | 6 |
| 16 | FEAT | Plan history — saved plans list, re-run with fresh data, labels | needs-plan-UI | 5 |
| 17 | FEAT | PDF export via @react-pdf/renderer (Creator + Pro only) | needs-plan-UI | 5 |
| 18 | FEAT | Stripe checkout — 3-tier pricing page + Stripe-hosted checkout | blocks-gating | 6 |
| 19 | FEAT | Stripe webhook → Supabase sync (checkout, invoice, cancellation) | needs-Stripe | 6 |
| 20 | FEAT | Soft paywall + feature gating UI (quota modal, upgrade flow) | needs-webhook | 5 |
| 21 | FEAT | Stripe Customer Portal (self-serve plan management) | nice-to-have | 3 |

### Sprint 3 notes
- Ticket 18 (Stripe checkout) blocks gating — prioritise it early in the sprint
- PDF export: server-side only, never client-side. Test that the PDF is blocked for free users
- Quota modal should show current usage (e.g. "2/2 plans used this month") not just a hard wall
- Ticket 21 is nice-to-have — move to S4 backlog if S3 runs long

---

## Sprint 4 — Launch (Weeks 7–8, 30 pts)

**Goal:** Production-ready. Sentry live, health endpoint, staging verified, landing page deployed, waitlist converted.

| # | Type | Ticket | Tags | Pts |
|---|---|---|---|---|
| 22 | CHORE | Sentry error tracking — client + server, alert rules on /api/generate | launch-blocker | 3 |
| 23 | CHORE | /health endpoint + uptime monitoring (BetterUptime or similar) | launch-blocker | 2 |
| 24 | CHORE | Staging environment — full prod mirror, all env vars, CORS locked | launch-blocker | 4 |
| 25 | FEAT | Landing page deployed to wavepilot.co + waitlist form → email provider | needs-domain | 4 |
| 26 | CHORE | Security audit pass (no secrets in bundle, RLS, rate limits, CORS, Stripe sig) | launch-blocker | 5 |
| 27 | FEAT | Waitlist → invite flow (batch emails, unique links, 30-day Creator trial) | needs-landing-page | 5 |
| 28 | CHORE | Full regression test on staging (all critical paths, error states, billing) | launch-blocker | 7 |

### Sprint 4 notes
- Tickets marked launch-blocker must all be done before any user gets access — no exceptions
- Regression test (ticket 28) should cover: auth, onboard, all 3 plan types, Stripe checkout, webhook, PDF export, plan history, quota enforcement, error states, mobile layout
- First 50 waitlist users get Creator free for 30 days — track cohort in Supabase for retention data
- Security audit must include: git grep for secrets, manual RLS policy test, rate limit test under simulated load

---

## Backlog (post-MVP Phase 2)

| Feature | Priority |
|---|---|
| Connect social accounts via OAuth for personalised analytics-aware plans | High |
| Competitor tracking — monitor what competitors in your niche post | High |
| Trend alerts — notify user when a niche trend spikes | Medium |
| Team / agency workspace — multi-client plan management | Medium |
| Caption + hook generator (standalone tool) | Medium |
| Zapier / Make integration — auto-send calendar to scheduling tools | Low |
| Chrome extension — highlight trending content while browsing | Low |
| Annual billing tier | Low |
