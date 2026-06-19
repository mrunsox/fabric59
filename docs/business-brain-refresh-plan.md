# Business Brain + Product + Marketing — Refresh Plan

Coordinated, phased remediation program. Phase 0 (this audit) is documentation
only. Each subsequent phase ships behind regression tests and leaves the
backend / bridge contracts untouched unless explicitly called out.

## Shared design direction

Premium enterprise, alive but not noisy, agent-confidence-optimized. Light
mode primary surface; cyan `#0EA5E9` accent; Linear-style density. No generic
AI gradients. (Locked by `mem://style/premium-enterprise-design`.)

## Shared UX principles

- Clarity before delight. Every shipped capability has a discoverable entry.
- No dead-ends. Empty / loading / failed / no-data / permission states are all
  surfaced with surface-specific copy and an exit.
- One clear next action per surface.
- Provenance is always one click away (source, last reviewed, confidence).
- Live-call surfaces stay scannable: no horizontal scroll, no decorative motion
  in critical zones.

## Phases

### Phase 0 — Audit & blueprint (this slice)
Outputs: `docs/business-brain-frontend-audit.md`, this file, and the
`OUTLINE.md` initiative index. No code changes.

### Phase 1 — Critical product / frontend activation fixes (**in progress**)
Fix broken nav, dead ends, and permission/empty/failure states for shipped
Brain capabilities. No visual reskin. Detailed slice list lives in
`.lovable/plan.md`.

### Phase 2 — Logged-in product visual refresh
Apply the shared design direction across Brain pages, ASC side panel, and the
live-call Assist surface. Motion, depth, density tuning. No new capabilities.

### Phase 3 — Marketing messaging refresh
Rewrite home, solutions, personas, pricing, customers, trust copy to match
shipped Business Brain reality. Replace generic AI promises with concrete
capability claims tied to surfaces.

### Phase 4 — Marketing visual refresh
Apply the shared design direction to public pages, including SEO/OG metadata
and shared marketing components.

### Phase 5 — Coherence / QA / polish
Cross-surface QA sweep, fix the last Medium-severity audit items, finalize
docs and OUTLINE.md status flags.

## Prioritization matrix (used in Phase 1)

| Score | Meaning |
|---|---|
| Impact | How many shipped capabilities become reachable / usable |
| Effort | UI-only cost (no backend / bridge changes allowed) |
| Confidence | Are we sure this is the right fix without redesigning? |

Phase 1 only ships items scoring **High Impact + Low/Med Effort + High
Confidence**. Anything else defers.
