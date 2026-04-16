# Wavepilot Design System v2

**Source of truth:** Figma landing page (April 2026)
**Status:** Active — supersedes all prior teal/Jakarta Sans tokens
**Scope:** Every surface — landing, auth, dashboard, captions, onboarding, pricing, history, emails, PDFs

---

## The vision in one line

Warm, editorial, restrained. A burnt-orange accent on a near-white canvas, serif-adjacent display type, generous whitespace. The product should feel more like a well-designed magazine than a SaaS tool.

---

## 1. Color

### Primary — Burnt Orange

The only accent color. Used for CTAs, active states, links, and the logomark. Never use more than one primary element per screen's visual unit.

| Role             | Hex       | Usage                                                   |
|------------------|-----------|---------------------------------------------------------|
| `primary`        | `#C84B24` | Buttons, logo, active nav, links, focus rings           |
| `primary-hover`  | `#A73C18` | Hover state for all primary elements                    |
| `primary-deep`   | `#802E14` | Pressed state, emphasis text on light backgrounds       |
| `primary-light`  | `#FCEEE8` | Subtle background tint for callouts, selected chips     |
| `primary-5`      | `rgba(200,75,36,0.05)` | Hover wash on neutral surfaces             |
| `primary-10`     | `rgba(200,75,36,0.10)` | Selected chip background                   |
| `primary-20`     | `rgba(200,75,36,0.20)` | Focus ring                                 |

### Neutrals — Paper + Ink

The backbone. Everything non-accent lives here.

| Role             | Hex       | Usage                                                   |
|------------------|-----------|---------------------------------------------------------|
| `bg-page`        | `#FAFAF9` | Page background (warm off-white, not pure white)        |
| `bg-card`        | `#FFFFFF` | Card, modal, input, dropdown surfaces                   |
| `bg-subtle`      | `#F4F3F1` | Section dividers, nested cards, disabled states         |
| `text-primary`   | `#1F1F1F` | Headings, body copy on light bg                         |
| `text-body`      | `#000000` | Nav links, strong inline text                           |
| `text-muted`     | `#7A808C` | Secondary copy, sub-hero, helper text                   |
| `text-mute-2`    | `#9196A0` | Metadata, stat labels, timestamps                       |
| `text-mute-3`    | `#7D7D7D` | Section eyebrows / labels                               |
| `border-default` | `#DDDDDD` | Card borders, dividers                                  |
| `border-input`   | `#E4E5EA` | Input borders (slightly lighter than default)           |
| `border-focus`   | `#C84B24` | Focus ring outline                                      |

### Semantic — Status

Kept minimal. No gradients, no heavy tints.

| Role      | Hex       | Usage                                        |
|-----------|-----------|----------------------------------------------|
| `success` | `#1F7A4C` | Quota remaining, success toasts              |
| `warning` | `#B8791E` | Near-quota, soft warnings                    |
| `danger`  | `#B23A2A` | Errors, destructive actions                  |
| `info`    | `#3A5C8B` | Neutral informational callouts               |

### Do / Don't

- DO use `bg-page` for full-page backgrounds — pure white will look wrong.
- DO keep the accent rare. One primary button per major section.
- DON'T use teal, green, or any of the old `#1D9E75` family anywhere.
- DON'T stack primary-light and primary-5 on the same card — pick one.

---

## 2. Typography

### Families

- **Display:** `Red Hat Display` — 400, 500. Used for h1–h3, logo, pricing numbers.
- **Body / UI:** `Inter` — 400, 500, 600. Used for everything else.
- **Code / Mono:** `ui-monospace, SFMono-Regular, Menlo, monospace`. Used for API snippets, keyboard hints.

Load via `next/font/google` in `src/app/layout.tsx`. Never use Plus Jakarta Sans, DM Mono, or system-ui for display — they are retired.

### Scale

Anchored to the Figma hero. All line-heights are tight for display, looser for body.

| Token          | Size / LH    | Weight | Family            | Usage                            |
|----------------|--------------|--------|-------------------|----------------------------------|
| `display-xl`   | 60 / 72      | 500    | Red Hat Display   | Landing hero                     |
| `display-lg`   | 44 / 52      | 500    | Red Hat Display   | Section heroes, page H1          |
| `display-md`   | 32 / 40      | 500    | Red Hat Display   | Subsection H2                    |
| `display-sm`   | 24 / 32      | 500    | Red Hat Display   | Card H3, logo wordmark           |
| `body-lg`      | 22 / 32      | 400    | Inter             | Sub-hero, lead paragraphs        |
| `body`         | 16 / 24      | 400    | Inter             | Default body                     |
| `body-sm`      | 14 / 20      | 400    | Inter             | Helper text, secondary copy      |
| `label`        | 13 / 16      | 500    | Inter             | Form labels, stat labels         |
| `eyebrow`      | 12 / 16      | 500    | Inter (uppercase, tracking 0.08em) | Section eyebrows |
| `caption`      | 12 / 16      | 400    | Inter             | Metadata, captions, timestamps   |

### Do / Don't

- DO pair Red Hat Display 500 with Inter 400 for hero + sub-hero. It's the whole look.
- DO use sentence case for buttons and nav. Uppercase only for eyebrows.
- DON'T use weights heavier than 600 on Inter. No 700/800/900 anywhere.
- DON'T italicize display type.

---

## 3. Spacing

4pt base grid. Most of the landing hero breathes at `space-16` and up, so don't be shy.

| Token       | Value  | Usage                              |
|-------------|--------|------------------------------------|
| `space-1`   | 4px    | Icon-to-text inside a chip         |
| `space-2`   | 8px    | Tight groups                       |
| `space-3`   | 12px   | Card inner padding small           |
| `space-4`   | 16px   | Default gap                        |
| `space-6`   | 24px   | Card padding                       |
| `space-8`   | 32px   | Card padding large                 |
| `space-12`  | 48px   | Section padding mobile             |
| `space-16`  | 64px   | Section padding desktop            |
| `space-24`  | 96px   | Hero vertical breathing room       |
| `space-32`  | 128px  | Between major landing sections     |

---

## 4. Radius

Flatter and tighter than v1. Nothing is a pill anymore except tags.

| Token       | Value  | Usage                              |
|-------------|--------|------------------------------------|
| `radius-sm` | 4px    | Tags, small chips                  |
| `radius-md` | 6px    | Buttons, inputs, selects           |
| `radius-lg` | 12px   | Cards, modals                      |
| `radius-xl` | 16px   | Hero cards, stat blocks            |
| `radius-pill` | 9999px | Avatar, status dots, tag chips (only) |

---

## 5. Shadow

Almost none. The system relies on borders, not drop shadows.

| Token       | Value                                               | Usage                 |
|-------------|-----------------------------------------------------|-----------------------|
| `shadow-sm` | `0 1px 2px rgba(17, 17, 17, 0.04)`                  | Sticky nav, dropdowns |
| `shadow-md` | `0 4px 12px rgba(17, 17, 17, 0.06)`                 | Modals, popovers      |
| `shadow-lg` | `0 12px 32px rgba(17, 17, 17, 0.08)`                | Hero image float      |

Never use shadow for a static card. Use `border: 1px solid var(--border-default)` instead.

---

## 6. Components

### Button

**Primary**
- Background: `#C84B24`, text: `#FFFFFF`
- Padding: `12px 20px` (default) / `14px 24px` (large)
- Radius: `6px`, font: Inter 500 / 14–15px
- Hover: `#A73C18`, Active: `#802E14`
- Focus: 2px outline in `primary-20`, offset 2px

**Secondary**
- Background: transparent, border: `1px solid #DDDDDD`, text: `#1F1F1F`
- Hover: bg `#F4F3F1`

**Ghost**
- No border, text `#1F1F1F`, hover bg `primary-5`

### Input

- Height: 44px (desktop) / 48px (mobile)
- Border: `1px solid #E4E5EA`
- Radius: `6px`
- Padding: `12px 14px`
- Placeholder: `#9196A0`
- Focus: border `#C84B24`, ring `primary-20`

### Card

- Background: `#FFFFFF`
- Border: `1px solid #DDDDDD`
- Radius: `12px`
- Padding: `24px` (default) / `32px` (hero)
- No shadow by default.

### Chip / Tag

- Unselected: border `#DDDDDD`, text `#7A808C`, bg `#FFFFFF`
- Selected: bg `primary-10`, border `#C84B24`, text `#802E14`
- Padding: `6px 12px`, radius `pill`, font `label` token

### Nav

- Logo: Red Hat Display 500, 24px, `#000000`
- Links: Inter 500, 15px, `#000000`, hover → `#C84B24`
- Active link: `#C84B24` with 2px underline

### Modal

- Backdrop: `rgba(17, 17, 17, 0.5)`
- Card: `bg-card`, radius `lg`, padding `space-8`, shadow `md`
- Max width: 480px default

---

## 7. Motion

Reserved. Nothing moves that doesn't need to.

- **Duration:** 150ms (micro) / 240ms (default) / 400ms (emphasis)
- **Easing:** `cubic-bezier(0.2, 0, 0, 1)` (default out), `cubic-bezier(0.4, 0, 0.2, 1)` (in-out)
- **Never:** spring bounce, parallax scroll, auto-playing carousels
- **Always:** respect `prefers-reduced-motion` — swap to opacity-only transitions

---

## 8. Imagery

- Photography: natural light, warm tones, editorial crops. No stock photos with UI chrome.
- Illustrations: flat, single-weight stroke, one-color (either `#1F1F1F` or `#C84B24`).
- Icons: Lucide, 1.5px stroke, 20px at body scale.

---

## 9. Code-level tokens

These are the canonical names for `globals.css` and Tailwind config.

```css
:root {
  /* color */
  --color-primary: #C84B24;
  --color-primary-hover: #A73C18;
  --color-primary-deep: #802E14;
  --color-primary-light: #FCEEE8;

  --color-bg-page: #FAFAF9;
  --color-bg-card: #FFFFFF;
  --color-bg-subtle: #F4F3F1;

  --color-text-primary: #1F1F1F;
  --color-text-body: #000000;
  --color-text-muted: #7A808C;
  --color-text-mute-2: #9196A0;
  --color-text-mute-3: #7D7D7D;

  --color-border-default: #DDDDDD;
  --color-border-input: #E4E5EA;

  --color-success: #1F7A4C;
  --color-warning: #B8791E;
  --color-danger: #B23A2A;
  --color-info: #3A5C8B;

  /* type */
  --font-display: "Red Hat Display", ui-serif, Georgia, serif;
  --font-body: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, monospace;

  /* radius */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 12px;
  --radius-xl: 16px;
}
```

---

## 10. Migration from v1

Every teal reference in the codebase maps to:

| v1 (retired)              | v2 (current)               |
|---------------------------|----------------------------|
| `#1D9E75` (teal primary)  | `#C84B24`                  |
| `#177a5b` (teal hover)    | `#A73C18`                  |
| `#0F6E56` (teal deep)     | `#802E14`                  |
| `#E1F5EE` (teal light)    | `#FCEEE8`                  |
| `rgba(29,158,117,*)`      | `rgba(200,75,36,*)`        |
| `Plus Jakarta Sans`       | `Red Hat Display` (display) / `Inter` (body) |
| `DM Mono`                 | `ui-monospace, SFMono-Regular, Menlo, monospace` |
| Radius 8px (buttons)      | 6px                        |

Files touched in the sweep: `src/app/page.tsx`, `src/app/dashboard/page.tsx`, `src/app/captions/page.tsx`, `src/app/onboarding/page.tsx`, `src/app/pricing/page.tsx`, `src/app/history/page.tsx`, `src/components/UpgradeBanner.tsx`, `src/components/QuotaModal.tsx`, `src/app/api/export/pdf/route.ts`, `src/app/globals.css`, `src/app/global-error.tsx`, `src/app/layout.tsx`, `src/app/sign-in/[[...sign-in]]/page.tsx`, `src/app/sign-up/[[...sign-up]]/page.tsx`.

---

*Last updated: 2026-04-15. If you're adding a new surface, pull tokens from this file — don't hand-pick hex codes.*
