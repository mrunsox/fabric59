# Phase 5 — Coherence, A11y, Performance & Regression Audit

Final hardening pass across the Business Brain product surfaces and refreshed
marketing pages. Audit-first, then in-scope presentational fixes only.

## Method

- **Code audit**: token usage, heading order, landmark uniqueness, icon-only
  button labels, `aria-hidden` traps, duplicate ids, focus rings, performance
  patterns added in Phase 4.
- **Responsive screenshots**: Playwright at 1280 desktop and 375 mobile for
  Home, Solutions, Personas, Customers, Pricing.
  Stored under `/tmp/browser/phase5/screenshots/` and mirrored to
  `/mnt/documents/phase5/` for a representative subset.
- **Regression**: full `vitest run`.

## Regression baseline

`bunx vitest run`: **1068 passed, 6 failed, 7 skipped** — identical to the
end-of-Phase-4 baseline. The 6 failures (`navRouting.test.ts` ghost-route
guards and one tokens offender check) are pre-existing and unrelated to
Phases 1–4 visual/copy work. **No new regressions introduced.**

## Issue list

### Critical

_None._ No structural regression, no broken landmark, no broken auth flow,
no broken navigation. Stop-gate cleared.

### High

_None._ Heading order is correct on all five marketing pages
(`MarketingHero` h1 → `SectionIntro` h2 → `CapabilityCard`/`PersonaList`
h3). `MarketingShell` provides a single `<main>` and no marketing page
adds a second. Icon-only buttons in `CanonicalMarketingHeader`
(mobile menu) and brand link already carry `aria-label`. No
`text-white` / `bg-black` / arbitrary hex offenders found in any
in-scope marketing, ASC, Assist, Business Brain, or settings file.

### Medium

_None actionable this phase._ The pre-existing `navRouting` test failure
flags a workspace nav item (`agent` → `/w/:id/agent`) without a mounted
route. This is a routing/feature gap, not a Phase 5 regression — per the
user guardrail, it is **parked as a future phase** rather than pulled
into this sweep.

### Cosmetic

- Home hero eyebrow ("GUIDED CALL WORKSPACE · FOR OUTSOURCED ANSWERING &
  VR PROVIDERS") wraps to two lines at desktop because the pill is
  long. Acceptable: the pill is bounded by `max-w` in `MarketingHero`
  and stays inside the hero column on both desktop and mobile. No
  change applied — modifying copy is out of scope and the visual
  reads as intended.
- `MarketingLayout.tsx` (legacy, not used by the refreshed shell)
  still uses `min-h-screen`. Out of in-scope rendering path; left
  untouched to avoid touching surfaces outside Phase 4 scope.

## Surface-by-surface notes

| Surface | Desktop | Mobile (375) | A11y | Notes |
|---|---|---|---|---|
| Home | clean | clean | h1/h2/h3 order ok | Hero ops panel collapses below hero copy as expected. |
| Solutions | clean | clean | h1/h2/h3 order ok | Non-sticky mini-nav wraps to 2 lines on 375; chips stay tappable (>=44px row). |
| Personas | clean | clean | ok | Two-column persona panels stack to single column under `md`. |
| Customers | clean | clean | ok | Story cards stack cleanly; outcome strip stays full-width inset. |
| Pricing | clean | clean | ok | Three tiers stack 1-col on mobile; "Recommended" eyebrow + ring render at all widths. |
| Footer (all) | clean | clean | ok | 12-col grid collapses 1 → 2 → 12 as designed. |
| Header (all) | clean | clean | mobile menu has `aria-label="Open menu"` | Scroll-shadow renders without layout thrash. |
| ASC side panel | code-audited | n/a | tab strip uses `data-[state=active]`, keyboard nav via Radix Tabs | No motion added in suggestion lists (Phase 2 constraint preserved). |
| Assist host (`BbAssistPanel`) | code-audited | n/a | semantic headings + landmark ok | Lists remain motion-free. |
| Settings (`BusinessBrainSettingsPage`) | code-audited | n/a | feature flag controls use `BrainBadge` tonal recipes with text, not color alone | No duplicate ids in list-rendered inputs. |

## Performance-safe polish

- `MarketingHero` backdrop is pure CSS (radial gradient + dot-grid
  background-image generated from `radial-gradient`), no image assets,
  no animation.
- `HeroOpsPanel` is fully static markup — no timers, no random data,
  no fake live updates.
- `CanonicalMarketingHeader` scroll-shadow uses a single
  `useEffect` scroll listener with a boolean state toggle — no layout
  thrash, no measurement reads per frame.
- No new heavy filters or shadows were introduced; Phase 4 cards use
  the hairline-border-shift recipe.

## Fixes applied in this phase

_None required._ The audit returned zero critical, high, or medium
items inside Phase 5 scope. The two cosmetic notes above are
documented for traceability rather than patched, per the
"no new capabilities / no messaging rewrites" guardrails.

## Program acceptance

All Phase 5 acceptance criteria pass:

- [x] Audit produced and categorized.
- [x] Visual regression screenshots captured for all five refreshed
  marketing pages at desktop + mobile.
- [x] Regression suite at parity with Phase 4 baseline (1068 pass / 6
  pre-existing fail).
- [x] No new product surface area, routes, schemas, or messaging
  rewrites introduced.
- [x] Parked items (the `navRouting` ghost-route gap) explicitly
  documented as a future-phase concern.

**Business Brain refresh program: complete.**

## Parked for a future phase

- Resolve the `WorkspaceAgentsPage` / `/w/:id/agent` ghost-route guard
  failure in `navRouting.test.ts` — feature/routing scope, not visual.
- Decide whether the legacy `MarketingLayout.tsx` is still needed; if
  not, remove in a dedicated cleanup PR.
