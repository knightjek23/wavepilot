# Wavepilot — Cowork Project Brief
**Last updated:** April 7, 2026  
**Status:** Sprint 1 ready to begin  
**Built by:** Josh (UX/UI + Product Designer, vibe coder)

---

## Who I am

Josh — UX/UI and Product Designer with 4+ years B2B/B2C experience. Currently building Wavepilot as a side project alongside full-time work at Stark Future. Comfortable with frontend, learning backend. I use an AI-assisted "vibe coding" approach — I think in product and design, and use Claude to move fast on implementation.

**My dev stack:** Next.js · Supabase · Clerk · Stripe · Vercel  
**My approach:** Single-file builds first to validate, then migrate to proper architecture. Fix things properly — no "fix later" tickets without deadlines.

---

## What Wavepilot is

An AI-powered social media growth tool that fetches live trending data from TikTok, Instagram, YouTube, Reddit, and Twitter/X — then generates a personalized content game plan for the user's niche in under 3 minutes.

**Target users:** Solo creators and small business owners who post their own social media and don't have a strategy.

**Core value:** Stop guessing what to post. Know what's trending in your niche before everyone else does.

**Three output types the user chooses from:**
1. Weekly Content Calendar (7-day posting schedule)
2. Trend Report + Post Ideas (top trends + 2–3 angles each)
3. Full Growth Strategy (30-day roadmap + calendar + hashtag bank)

---

## What's already been decided

### Brand
- **Name:** Wavepilot
- **Domain target:** wavepilot.co
- **Tagline:** "Stop guessing. Start growing."
- **Visual direction:** Teal primary (#1D9E75), off-white base, Plus Jakarta Sans + DM Mono typefaces
- **Brand voice:** Friendly and approachable — like a knowledgeable friend, not a corporate consultant. Direct, warm, no jargon.

### Pricing
| Tier | Price | Limits |
|---|---|---|
| Free | $0 | 2 plans/mo, 1 platform, calendar only |
| Creator | $19/mo | 20 plans/mo, all platforms, all outputs, PDF export |
| Pro | $49/mo | Unlimited plans, priority, trend alerts (Phase 2) |

### Tech stack (locked)
- **Frontend:** Next.js (App Router, TypeScript)
- **Database:** Supabase (Postgres + Edge Functions)
- **Auth:** Clerk
- **Payments:** Stripe
- **Hosting:** Vercel
- **AI:** Anthropic Claude API (`claude-sonnet-4-20250514`, web_search tool enabled)
- **Trend data:** YouTube Data API v3, Reddit API, RapidAPI (TikTok + X scrapers)
- **Errors:** Sentry
- **PDF:** @react-pdf/renderer

---

## What's been built (artifacts in this folder)

| File | What it is |
|---|---|
| `docs/prd.md` | Full Product Requirements Document — personas, features, flows, metrics |
| `docs/architecture.md` | Data flow, DB schema, service layer, API integrations, env vars |
| `docs/brand-positioning.md` | Name rationale, taglines, voice guidelines, visual direction |
| `docs/agile-framework.md` | Definition of done, ceremonies, pointing system |
| `sprints/sprint-plan.md` | Full 4-sprint backlog, 35 tickets, 138 points |
| `app/wavepilot-prototype.html` | Working AI engine prototype (calls Claude API live) |
| `app/wavepilot-landing.html` | Full landing page (hero, features, pricing, waitlist) |

---

## Where we are right now

**Sprint 1 is next.** The design, product, and architecture decisions are complete. Everything in the docs folder is the source of truth. The prototype and landing page are working artifacts.

**Sprint 1 goal:** Foundation — Next.js scaffold, Supabase setup, Clerk auth, onboarding flow, YouTube + Reddit service layers, CacheService.

**First ticket to build:** Next.js project scaffold + Vercel CI/CD setup.

---

## How to work with me on this

- I think in product outcomes, not implementation details — push back if I'm cutting corners on architecture
- I like to see things working before I polish them — build the function, then the UI
- Call out when something needs to be split into smaller tickets before I start it
- Remind me to test unhappy paths — I have a habit of only testing the happy path
- When I say "let's just do it quickly" — that's a red flag, push back on it
- I prefer direct answers. No preamble, no "great question!"

---

## Open questions (from PRD)

1. Should niche selection be free-text or a predefined taxonomy?
2. Should Full Growth Strategy output be gated to Pro only?
3. Trend alerts — architect for Phase 2 from day 1, or bolt on?
4. White-label / agency tier — separate SKU or just Pro+?
5. Do we offer annual billing at launch or add post-MVP?

---

## Dev principles (non-negotiable)

- Secrets in env vars always — separate dev/prod tokens
- Observability from day one: Sentry, `/health` endpoint, persistent logs
- All external APIs wrapped in service layer — never called directly from routes
- Rate limit auth and write endpoints
- Server-side input validation always
- DB changes via migration files — no manual edits
- Staging mirrors prod — CORS locked to specific origins
- All timestamps in UTC — convert to local only at display layer
- CI/CD from day one — no local deploys to production
- No "fix later" without a ticketed deadline
- Test unhappy paths and error states, not just the happy path
