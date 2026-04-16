# Caption/Hook Generator — Deploy Checklist
**Feature:** AI-generated hooks + captions, platform-aware, per-card copy
**Version:** 1.1 | **Target:** Production (wavepilot.co)

> **Ships alongside Design System v2.** This feature was rebuilt on the new
> burnt-orange palette and Red Hat Display / Inter type system.
> Token reference: [`docs/wavepilot-design-system-v2.md`](./wavepilot-design-system-v2.md).
> The entire `/captions` surface now uses `#C84B24` primary and the new radius/type tokens.
> If anything renders with the old teal, something didn't deploy — check the CSS rebuild on Vercel.

---

## What shipped

- **Route:** `/captions` (authed)
- **API:** `POST /api/captions/generate`, `GET /api/captions/list`
- **DB:** new `caption_sets` table + `event_type` / `success` columns on `usage_events`
- **Quota:** Free = 5/mo, Creator = 100/mo, Pro = ∞ (separate from plan quota)
- **Rate limit:** 20 requests / user / hour (separate pool from plan generation)

---

## 1. Run the DB migration

The migration file is `supabase/migrations/005_captions.sql`. It:
1. Creates the `caption_sets` table with RLS enabled
2. Adds `event_type` (plan | caption) and `caption_set_id` columns to `usage_events`
3. Adds a `success` flag so failed attempts no longer burn quota
4. Adds a composite index on `(user_id, billing_period, event_type)`

**To run it (Supabase dashboard):**
- Open Supabase → SQL Editor → paste the full contents of `005_captions.sql` → Run
- Verify in Table Editor that `caption_sets` exists and `usage_events` now has `event_type`, `caption_set_id`, `success` columns

**To run it (CLI, if you've set up `supabase`):**
```
supabase db push
```

---

## 2. Deploy

**Design system v2 ships with this release.** `next/font` now loads Red Hat Display and Inter from Google Fonts — first build will show those in the dependency output. No new env vars. Everything reuses:
- `ANTHROPIC_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY`

**Push:**
```
git add .
git commit -m "feat: caption/hook generator with separate quota"
git push
```

Vercel auto-deploys. First build will rebuild `node_modules` — expect ~3 min.

---

## 3. Smoke test (prod)

Do these in order. Each one proves a different layer.

1. **Auth gate** — Open `/captions` in an incognito window. Should redirect to sign-in.
2. **Happy path** — Sign in, go to `/captions`.
   - Topic: `"5 mistakes first-time freelancers make with pricing"`
   - Platform: Instagram
   - Vibe: Educational
   - Count: 5
   - Hit Generate. Should see 5 cards in ~10–20s. Each with hook, caption, hashtags.
3. **Copy** — Click Copy on any card. Button should flip to "Copied!" for ~2s.
4. **History** — Reload the page. Expand "Recent captions". Your just-generated set should appear.
5. **Load from history** — Click one. Form and result should repopulate.
6. **Validation** — Try a 5-char topic → inline error. Skip platform → inline error.
7. **Dashboard entry** — Go to `/dashboard`. Header should show a `Captions` link. Below the plan form should be a "Need captions fast?" CTA card linking to `/captions`.
8. **Brand check** — Every accent should render as burnt orange `#C84B24` (not teal). Headings should load in Red Hat Display (serif-adjacent), body in Inter. If anything still looks teal or sans-serif-blocky, hard-refresh to bust the font/CSS cache.

---

## 4. Known cost sizing

Per generation batch (N=10, platform=Instagram):
- Input tokens: ~400–600 (system + user prompt)
- Output tokens: ~1200–1800 (10 hooks + captions + hashtags as JSON)
- Cost (Sonnet 4): ~$0.02–$0.03 per batch

At Creator tier (100 batches / month), max API cost per paying user = ~$3/mo. Creator pricing is $19/mo — margin is healthy.

---

## 5. What's NOT in v1 (intentional)

- **Editing generated captions** — v1 is copy-only. Editing can live in v2 once we see what users actually want to change.
- **Deleting from history** — same rationale. Low volume in v1.
- **Favoriting** — not needed until users have 20+ generations.
- **Bulk export** — wait for signal.
- **Custom vibe presets** — 5 predefined vibes cover most creator requests.

---

## 6. Rollback plan

If the caption UI breaks in prod:
1. Feature is fully isolated — removing the `/captions` link in `dashboard/page.tsx` hides it
2. Deploy that one-line change, `/captions` page remains but no discovery surface
3. Investigate in staging

If the DB migration is the problem:
- `caption_sets` is a new table (dropping it is safe, zero coupling)
- `event_type` / `success` / `caption_set_id` columns have defaults, safe to leave in place
- No rollback SQL needed unless corruption
