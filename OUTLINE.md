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
| 3 — Marketing messaging refresh | **In progress** | Public copy rewritten to match shipped Brain capabilities. |
| 4 — Marketing visual refresh | **In progress** | Public design system aligned with refreshed Brain workspace; SEO/OG sweep to follow. |
| 5 — Coherence / QA / polish | **Done** | Audit-first sweep; no new regressions; baseline parity (1068/6/7); see `docs/business-brain-phase5-audit.md`. Program complete. |

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

---

# Dashboard Consolidation + UX Reset — Initiative Outline

Follow-on program. The Business Brain refresh is complete; the broader
logged-in workspace still feels fragmented. This program produces a
canonical IA, a guided setup journey, and a unified visual system across
all operational surfaces.

## Phases

| Phase | Status | What it produces |
|---|---|---|
| 0 — Audit & blueprint | **Done** | `docs/dashboard-ux-audit.md`, `docs/dashboard-ia-reset-plan.md`, this section, `.lovable/plan.md` entry |
| 1 — IA & navigation cleanup | **Done** | Sidebar regrouped to Build / Operate / Insight / Connect / Settings; Cockpit + Library relabels; Runs/Agents/Supervisor/Templates demoted; admin-only "Hidden / Legacy" group in ⌘K; workspace scope strip; Clients-detail Ownership & scope block; language-leak sweep across workspace surfaces. |
| 2 — Setup / onboarding flow redesign | **Done** | Canonical 8-step workspace setup checklist (`useWorkspaceSetupReadiness`) + shared `WorkspaceSetupChecklist` component (panel + strip variants); wired into Campaigns landing, Cockpit, Campaign New, and surface empty states; subtle "Affects workspace readiness" indicator in Brain Settings |
| 3 — Page-type unification | Planned | Library (Guides + Templates + Blueprints) shell; sectioned Settings; Connect shell; Notifications log/config split |
| 4 — Operator cockpit + live workflow polish | Planned | Cockpit shell merges Live + Supervisor + Runs; readiness preconditions; campaign-context links across QA/Analytics |
| 5 — Final coherence / a11y / regression sweep | Planned | Audit-first sweep mirroring Business Brain Phase 5; `docs/dashboard-consolidation-phase5-audit.md`; program closeout |

## Rules that apply to every later phase

- Backend (`supabase/**`), RLS, and existing schemas stay untouched unless a phase explicitly opens them.
- No new product capabilities introduced by IA/UX changes alone.
- Regression baseline preserved before a phase is marked done.
- Marketing site, Trust/Security/legal pages, and the Business Brain sub-IA are not touched by this program.
- Each phase stops at an approval gate.

## See also

- `docs/dashboard-ux-audit.md`
- `docs/dashboard-ia-reset-plan.md`
- `.lovable/plan.md` (latest entries)
