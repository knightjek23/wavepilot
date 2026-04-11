# Wavepilot — Agile Framework
**Version:** 1.0 | **Date:** April 7, 2026

---

## Overview

Solo founder cadence. Lightweight but consistent. The goal is shipping — not process for process's sake.

| Setting | Value |
|---|---|
| Sprint length | 2 weeks |
| Target velocity | ~34 points per sprint |
| Total MVP timeline | 8 weeks (4 sprints) |
| Total tickets | 35 |
| Total points | 138 |

---

## Pointing system

| Points | Size | Meaning |
|---|---|---|
| 2–3 | Small | Clear, well-understood, no unknowns. Under 2 hours of focused work. |
| 4–5 | Medium | Some unknowns but manageable. Half to full day of work. |
| 6–8 | Large | Significant complexity or external dependency. 1–2 days. Consider splitting. |
| 8+ | Epic | Too big. Must be split before pulling into a sprint. No exceptions. |

---

## Ceremonies

### Monday kickoff — 15 min
- Review sprint board
- Pick the 3 tickets to focus on this week
- Identify any blockers before they block you
- Write them down — don't just think them

### Friday retro — 20 min
- What shipped?
- What's blocked?
- What would I do differently?
- One improvement to carry into next week
- Keep a running retro doc — patterns show up fast when you're solo

### Sprint planning — 45 min (every 2 weeks)
- Pull tickets from backlog into sprint
- Re-estimate anything that's changed since last planning
- Confirm all dependencies are unblocked before committing
- Set sprint goal in one sentence before closing

### Sprint review — 30 min (every 2 weeks)
- Demo to yourself (or a trusted user / beta tester)
- What actually got done vs what was committed?
- Calculate velocity — adjust next sprint capacity if consistently over or under
- Update sprint-plan.md with actuals

---

## Definition of done

A ticket is only done when ALL of the following are true:

### Code quality
- [ ] TypeScript — no ts-ignore, no untyped `any` without documented justification
- [ ] PR self-reviewed with fresh eyes after minimum 30 min break
- [ ] No `console.log` left in committed code
- [ ] No hardcoded secrets — all env vars, verified with `git grep`

### Testing
- [ ] Happy path manually tested on staging (not localhost)
- [ ] At least one unhappy path tested: error state, empty state, or edge case
- [ ] Service layer functions have unit tests with mocked external API calls
- [ ] API routes return correct status codes for invalid input (400, 401, 429)

### Infrastructure
- [ ] DB changes committed as migration files — no manual schema edits
- [ ] Deployed to staging and verified working
- [ ] All timestamps stored in UTC — display conversion at render layer only
- [ ] New env vars documented in `.env.example` with description

### Observability
- [ ] Errors thrown to Sentry — no silent `catch` blocks
- [ ] External API failures handled gracefully — user sees meaningful error, not 500
- [ ] Claude API token usage logged to plans table for cost monitoring

---

## Ticket types

| Type | Label | Meaning |
|---|---|---|
| Feature | FEAT | User-facing functionality |
| Chore | CHORE | Infrastructure, tooling, testing, no user-facing change |
| Bug | BUG | Something broken that was previously working |

---

## Ticket tags

| Tag | Meaning |
|---|---|
| `blocks-all` | Nothing else can start until this is done |
| `needs-{x}` | Depends on ticket or system x being complete first |
| `launch-blocker` | Must be done before any user gets access to production |
| `nice-to-have` | Can be deferred to next sprint if time-boxed |

---

## Sprint health signals

### Green — on track
- Completing 80%+ of committed points
- No more than 1 ticket blocked at a time
- Retro has at least one concrete improvement actioned

### Yellow — watch
- Completing 60–80% of committed points
- Multiple blocked tickets
- Same blocker appearing in 2+ consecutive retros

### Red — intervene
- Completing <60% of committed points
- Architecture decision unmade that's blocking 3+ tickets
- Sprint goal unclear or changed mid-sprint

**If red:** Stop adding new tickets. Clear the blockers. Consider re-planning with reduced scope.

---

## Running retro log

| Sprint | What shipped | What blocked | Improvement |
|---|---|---|---|
| S1 | — | — | — |
| S2 | — | — | — |
| S3 | — | — | — |
| S4 | — | — | — |

*(Update this after each sprint review)*
