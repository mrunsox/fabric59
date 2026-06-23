
# Runner Visual Hierarchy — Tonal Pane Contrast

## Problem

Today the agent workspace renders three equally-weighted white cards side by side (Workspace Guide / Live Flow / Call Copilot). Every panel has the same surface, the same border, the same icon weight, the same chip styling — so the eye has nowhere to land and the screen reads as one wall of information. On a live call, the agent needs to know in <1 second which surface is "do this now" vs "reference" vs "AI assist".

## Solution: role-based pane tiers (not a color theme)

Treat the three columns as three *roles*, not three identical cards. Each role gets a distinct surface tone, border weight, and header treatment. We stay inside existing semantic tokens (no hardcoded hex), keep the light-mode pure-white aesthetic, and add ~3 new tokens.

### Tier model

```text
┌─────────────────┬───────────────────────┬─────────────────┐
│  REFERENCE      │   ACTIVE / PRIMARY    │   ASSIST        │
│  Workspace      │   Live Flow           │   Call Copilot  │
│  Guide          │   (what to do NOW)    │   + side stack  │
│                 │                       │                 │
│  muted surface  │   elevated white      │   tinted surface│
│  quiet borders  │   strong border +     │   subtle cyan   │
│  smaller type   │   soft shadow +       │   wash, dashed  │
│  collapsed by   │   accent rail on top  │   "AI" framing  │
│  default vibe   │                       │                 │
└─────────────────┴───────────────────────┴─────────────────┘
```

- **Center (Primary / Active)** — pure white card, slightly larger inner padding, a 2px cyan top rail on the active step card, a soft elevation shadow, and a brighter "LIVE FLOW" header. This is the only pane that gets shadow + accent rail. Everything else recedes.
- **Left (Reference / Guide)** — surface switches to `--surface-muted` (a near-white warm gray, ~hsl(220 14% 98%)), border drops to `--border-subtle`, section titles use `text-muted-foreground`, and the active "Relevant to this step" card keeps a small cyan left border so it still pops *within* the muted pane. The pane reads as a quiet reference shelf.
- **Right (Assist / AI)** — surface gets a very faint cyan wash (`--surface-assist`, ~hsl(190 60% 98%)), the "CALL COPILOT" header uses the cyan primary color + sparkle icon, suggestion cards keep white inner surface so they pop against the wash. Transfer Directory and Resources cards drop back to plain white tiles inside the assist column so they don't compete with copilot suggestions.

### Supporting moves (small, finish the hierarchy)

1. **Header bar de-noise** — the top chrome (Routing / ANI / 01:48 / RESUMED / Step 1 of 17 / 10 required / Ready / STARTED) is currently 8 same-weight chips. Group into 3 clusters with separators: *Call state* (Routing, ANI, timer) · *Progress* (Step x of y, required) · *Session* (Ready, Started, Reset). Cluster separators are 1px vertical rules in `--border-subtle`. No color changes to the chips themselves.
2. **"ALL STEPS" list** — the long 17-item checklist directly under the active step duplicates information and competes with it. Wrap it in a `<details>` collapsed by default with a "Show all 17 steps" toggle. Active step stays expanded in the LIVE FLOW card above; the agent opens the full list only when scanning.
3. **Active-step emphasis in center** — the current step card gets a 2px left cyan rail + slightly heavier title weight. The "DISPLAY" pill stays as-is. Body text size unchanged.
4. **Section dividers in Workspace Guide** — replace the equal-weight chevron rows with a thin top border between sections and reduce icon weight, so the active "Relevant to this step" callout is the clear hotspot of that column.

### What we are NOT doing

- Not introducing dark mode or a new color palette.
- Not re-laying-out the 3-column shell (no width changes, no reorder, no collapsing columns).
- Not touching call-runner business logic, hooks, snapshot/copilot data, or routes.
- Not restyling shadcn primitives globally — changes are scoped to the runner shell and its three panel wrappers.

## Technical Details

- **Tokens** (`src/index.css`): add `--surface-muted`, `--surface-assist`, `--border-subtle`, `--rail-active` (cyan). Mirror in `tailwind.config.ts` as `bg-surface-muted`, `bg-surface-assist`, `border-subtle`, `bg-rail-active`. All HSL.
- **Component edits** (presentation only):
  - `src/pages/agent/LiveCallRunnerPage.tsx` — apply tier classes to the three column wrappers + header chip grouping.
  - `src/components/call-runner/GuidePanel.tsx` — muted surface, subtler section rows, keep the active callout's cyan accent.
  - `src/components/call-runner/FlowPanel.tsx` — white surface + shadow + 2px cyan top/left rail on active step card; collapse "ALL STEPS" into a `<details>` toggle.
  - `src/components/call-runner/CopilotPanel.tsx` — assist wash on the outer panel, keep suggestion cards white.
  - `src/components/call-runner/SessionHeader.tsx` — cluster chips with `<Separator orientation="vertical">`.
- **Tests**: extend `src/test/regressions/liveCallRunnerUx.test.tsx` with a snapshot/assertion that each column wrapper carries its tier class and that "ALL STEPS" is collapsed by default. No new test files unless an existing one becomes unwieldy.
- **Accessibility**: keep all contrast ratios ≥ 4.5:1 against the new tinted surfaces (verify body text against `--surface-assist` and `--surface-muted`). No color-only signaling — the active step still has its number, label, and "DISPLAY" pill.

## Stop-gate

After implementation, report: token additions, per-column class changes, header cluster structure, ALL STEPS collapse behavior, contrast spot-checks, and updated test results. No backend, schema, or runner-logic changes.
