# TrendPilot — Product Requirements Document
**Version:** 1.0  
**Date:** April 7, 2026  
**Status:** Draft  

---

## 1. Product Overview

### 1.1 Product Name
**TrendPilot** *(working title)*

### 1.2 One-Line Description
AI-powered social media growth tool that turns live trending data into a personalized content game plan — built for solo creators and small business owners.

### 1.3 Problem Statement
Solo creators and small business owners know they need to post consistently on social media, but they don't know *what* to post. They waste hours manually scrolling TikTok, YouTube, and Reddit trying to figure out what's trending — and even when they find something, they don't know how to adapt it to their niche or audience. The result: inconsistent posting, low engagement, and slow growth.

### 1.4 Solution
TrendPilot automatically fetches trending content signals from multiple platforms, runs them through an AI layer, and delivers a ready-to-use, niche-specific content plan — in minutes. Users choose their output: a weekly content calendar, a trend report with post ideas, or a full growth strategy.

### 1.5 Target Users
- **Primary A:** Solo creators (YouTubers, TikTokers, Instagram creators, podcasters) who manage their own channels
- **Primary B:** Small business owners who run their own social media or have a 1-person marketing setup

---

## 2. Goals & Success Metrics

### 2.1 Business Goals
- Reach 500 paying users within 6 months of launch
- Achieve $5K MRR by Month 4
- Maintain <5% monthly churn

### 2.2 User Goals
- Save 3–5 hours/week on content research
- Increase posting frequency and consistency
- Improve engagement rates by acting on trend-aligned content

### 2.3 Key Metrics (KPIs)
| Metric | Target |
|---|---|
| Time to first game plan (TTFGP) | < 3 minutes |
| Weekly active usage rate | > 60% of paid users |
| Plan generation completion rate | > 85% |
| NPS score | > 50 |
| Free → Paid conversion | > 8% |

---

## 3. User Personas

### Persona A — "The Creator"
- **Name:** Maya, 26
- **Situation:** Full-time content creator on TikTok and YouTube. 18K followers. Wants to break 100K.
- **Pain:** Spends 4+ hours/week looking for trend ideas. Misses trends because she finds them too late.
- **Goal:** Know what to post *before* it peaks. Grow faster with less research time.
- **Tech comfort:** High. Uses Notion, CapCut, Later.

### Persona B — "The Business Owner"
- **Name:** Derek, 38
- **Situation:** Owns a landscaping company. Tries to post on Instagram and Facebook 3x/week. Zero strategy.
- **Pain:** Doesn't know what content works for his industry. Posts randomly and sees little return.
- **Goal:** A clear, simple plan that tells him what to post each week without needing to be a "content person."
- **Tech comfort:** Medium. Uses his phone for everything.

---

## 4. Features & Scope

### 4.1 MVP Feature Set (V1)

#### 4.1.1 Onboarding & Profile Setup
- User selects their **niche/industry** (dropdown + free text)
- User selects their **active platforms** (TikTok, Instagram, YouTube, X, LinkedIn, Facebook)
- User sets their **posting goal** (e.g., 3x/week, daily)
- User selects **output preference:** Calendar, Trend Report, or Full Strategy
- Optional: connect social accounts for personalization (Phase 2)

#### 4.1.2 Trend Data Ingestion
- Fetch trending data from:
  - **YouTube** — YouTube Data API v3 (trending videos, search trends by category)
  - **Reddit** — Reddit API (top posts by subreddit relevant to niche)
  - **Twitter/X** — RapidAPI scraper (trending topics, hashtags)
  - **TikTok** — RapidAPI scraper or Apify (trending sounds, hashtags, videos)
- Data refresh: on-demand + cached (24-hour rolling window)
- AI cross-references signals across platforms to identify momentum vs. already-peaked trends

#### 4.1.3 AI Strategy Engine
Powered by Claude API with web search enabled. The engine:
- Receives: user niche, platform selection, posting goal, and live trend data
- Outputs one of three deliverables (user's choice):

**Output A — Weekly Content Calendar**
- 7-day posting schedule
- One post idea per scheduled day
- Platform-specific format guidance (e.g., Reel vs. Short vs. TikTok)
- Suggested caption hooks
- Hashtag set per post

**Output B — Trend Report + Post Ideas**
- Top 5–10 trending topics relevant to the user's niche
- Trend momentum score (rising, peak, declining)
- 2–3 post ideas per trend
- Platform recommendations per trend
- Suggested hooks and angles

**Output C — Full Growth Strategy**
- Niche positioning summary
- 30-day content theme roadmap
- Platform-specific strategy (what to prioritize and why)
- Weekly content calendar (same as Output A)
- Trending hashtag bank (30+ tags by category)
- Content format mix recommendation (% video, % static, % Stories, etc.)
- Engagement growth tactics

#### 4.1.4 Output Display & Export
- In-app rendered output (clean, readable UI)
- Export to PDF
- Export/copy to Notion (paste-ready markdown)
- Save to history (last 10 plans)

#### 4.1.5 Regenerate & Refine
- "Regenerate" button — re-runs with same settings
- "Adjust" prompt — user can type a modification (e.g., "make it more educational" or "focus more on Reels")
- Platform toggle — switch focus platform without re-onboarding

#### 4.1.6 Saved Plans & History
- View all previously generated plans
- Re-run any past plan with updated trend data
- Label/tag plans for organization

---

### 4.2 Phase 2 Features (Post-MVP)

| Feature | Priority |
|---|---|
| Connect social accounts (OAuth) for personalized analytics-aware plans | High |
| Competitor tracking — track what competitors in your niche are posting | High |
| Trend alerts — notify user when a niche-relevant trend is spiking | Medium |
| Team/agency workspace — multi-client plan management | Medium |
| Caption & hook generator (standalone tool) | Medium |
| Chrome extension — highlight trending content while browsing | Low |
| Zapier/Make integration — auto-send calendar to scheduling tools | Low |

---

## 5. User Flows

### 5.1 New User Flow
```
Land on homepage
→ Sign up (Clerk)
→ Onboarding (niche, platforms, goal, output type)
→ "Generate My Plan" CTA
→ AI fetches trends + generates plan
→ View plan in app
→ Export or save
→ Prompted to upgrade if on free tier
```

### 5.2 Returning User Flow
```
Log in
→ Dashboard (last plan + quick stats)
→ "Generate New Plan" or "Re-run Last Plan"
→ Optionally adjust settings
→ Plan generated → view, export, or save
```

### 5.3 Upgrade Flow
```
Free user hits plan limit (2 plans/month)
→ Soft paywall: "You've used your free plans for this month"
→ Upgrade modal (plan comparison)
→ Stripe checkout
→ Unlocked immediately
```

---

## 6. Technical Architecture

### 6.1 Stack
| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router) |
| Backend / Database | Supabase (Postgres + Edge Functions) |
| Authentication | Clerk |
| Payments | Stripe |
| Hosting | Vercel |
| AI | Anthropic Claude API (claude-sonnet, web search enabled) |
| Data APIs | YouTube Data API v3, Reddit API, RapidAPI (TikTok/X scrapers) |
| Job Queue | Supabase Edge Functions + pg_cron (for scheduled refreshes) |
| PDF Export | Puppeteer or @react-pdf/renderer |

### 6.2 Data Flow
```
User triggers "Generate Plan"
→ Backend fetches trend data from APIs (YouTube, Reddit, RapidAPI)
→ Trend data cached in Supabase (24hr TTL)
→ Assembled prompt sent to Claude API (with web search)
→ Claude returns structured plan (JSON)
→ Stored in Supabase (plans table)
→ Rendered in Next.js frontend
```

### 6.3 Key Database Tables
```
users           — profile, niche, platforms, plan preferences
plans           — generated plans, linked to user, timestamp, output type
trend_cache     — cached API responses with TTL
usage_events    — plan generations per user per billing period
subscriptions   — Stripe subscription state
```

### 6.4 Security & Dev Principles
- All API keys in environment variables; separate dev/prod secrets
- External APIs (YouTube, Reddit, RapidAPI, Claude) wrapped in service layer
- Rate limiting on plan generation endpoints (prevent abuse)
- Server-side validation on all inputs
- Observability from Day 1: error logging (Sentry), `/health` endpoint
- All timestamps stored in UTC, converted to local at display layer
- CI/CD via GitHub Actions → Vercel; no local deploys to production
- Staging environment mirrors prod; CORS locked to specific origins
- DB migrations via Supabase migration files, never manual edits

---

## 7. Pricing Model

### 7.1 Tiers

| Tier | Price | Limits | Notes |
|---|---|---|---|
| **Free** | $0 | 2 plans/month, 1 platform | No export |
| **Creator** | $19/mo | 20 plans/month, all platforms, all output types | PDF export, plan history |
| **Pro** | $49/mo | Unlimited plans, priority generation, trend alerts (Phase 2) | Early access to new features |

### 7.2 Stripe Integration
- Monthly and annual billing (annual = 2 months free)
- Stripe Customer Portal for self-serve subscription management
- Webhook-driven subscription state sync to Supabase

---

## 8. Design Principles

- **Speed first** — Plan generation should feel fast. Use skeleton loaders, streaming output where possible.
- **Clarity over depth** — Every plan should be immediately actionable. No jargon, no filler.
- **Platform-aware** — Output formatting should reflect the target platform (e.g., TikTok hooks look different from LinkedIn posts).
- **Mobile-friendly** — Many small business owners will access this on mobile.
- **Minimal onboarding friction** — User should be able to generate their first plan within 3 minutes of signing up.

---

## 9. Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| RapidAPI scraper reliability (TikTok/X) | High | Abstract behind service layer; fallback to web search via Claude |
| Twitter/X API cost escalation | Medium | Use RapidAPI scraper; monitor costs; gate X-specific features to Pro |
| AI output quality variance | Medium | Prompt engineering + structured JSON output schema; user can regenerate |
| User doesn't know their "niche" | Medium | Provide niche examples and a guided picker during onboarding |
| Low retention after first plan | Medium | Weekly email digest with "new trends in your niche this week" |

---

## 10. Open Questions

1. Should niche selection be free-text or a predefined taxonomy? (Predefined = easier to map to API queries)
2. Do we build trend alerts (Phase 2) into the initial architecture or bolt on later?
3. What's the brand name — is TrendPilot the direction, or do we explore others?
4. Should the Full Growth Strategy output be gated to Pro only?
5. Do we offer a white-label/agency version as a separate SKU?

---

## 11. MVP Launch Checklist

- [ ] Clerk auth + onboarding flow
- [ ] YouTube API integration
- [ ] Reddit API integration
- [ ] RapidAPI TikTok/X integration
- [ ] Claude API plan generation (all 3 output types)
- [ ] Plan display UI (desktop + mobile)
- [ ] PDF export
- [ ] Supabase plan history
- [ ] Stripe free/Creator/Pro tiers
- [ ] Stripe webhook → Supabase sync
- [ ] Usage gating (free plan limits)
- [ ] Sentry error tracking
- [ ] `/health` endpoint
- [ ] CI/CD via GitHub Actions
- [ ] Staging environment
- [ ] Landing page + waitlist or direct signup

---

*Document owner: Josh | Last updated: April 7, 2026*
