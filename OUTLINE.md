# Business Brain + Product + Marketing — Initiative Outline

System-level audit and refresh program. One coordinated effort across the
logged-in Business Brain product, agent-operational surfaces, and the public
marketing site.

## Phases

| Phase | Status | What it produces |
|---|---|---|
| 0 — Audit & blueprint | Done | `docs/business-brain-frontend-audit.md`, `docs/business-brain-refresh-plan.md`, this file |
| 1 — Critical product / frontend activation fixes | **In progress** | Broken nav fixed, hidden surfaces reachable, dead ends removed, empty/error/permission states tightened. No visual reskin. |
| 2 — Logged-in product visual refresh | Planned | Premium enterprise visual direction applied to Brain + ASC + Assist. |
| 3 — Marketing messaging refresh | Planned | Public copy rewritten to match shipped Brain capabilities. |
| 4 — Marketing visual refresh | Planned | Public design system + SEO/OG sweep. |
| 5 — Coherence / QA / polish | Planned | Cross-surface QA, last Medium audit items, final docs. |

## Rules that apply to every later phase

- Backend (`supabase/**`), RLS, and `bb_*` schema stay untouched unless a
  phase explicitly opens them.
- `src/lib/business-brain/bridge/**` contracts stay backward compatible.
- Regression tests must pass before a phase is marked done.
- Phase 1 ships no new product capabilities, no marketing changes, and no
  visual reskin beyond what's needed to complete an already shipped path.

## See also

- Detailed slice plan: `.lovable/plan.md`
- Architecture: `docs/business-brain-architecture.md`
