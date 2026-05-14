# Revised Outline Compliance Report — Workspace Home Slice (May 13 Canonical Build Doc)

Scope: Re-grade the prior audit per reviewer feedback. No source changes. Implementation from the prior slice stands; only the report language is tightened.

Verification performed
- `src/App.tsx` confirms three relevant live route families: `/admin/*` (AdminShell), `/org/*` (OrgShell, additive Phase 0 mount), `/w/:workspaceId/*` (CanonicalWorkspaceShell), plus `/app/workspaces/:workspaceId/*` → `/w/:workspaceId/*` single-hop redirect.
- `WORKSPACE_NAV` in `canonicalNav.ts` matches the May 13 outline 15-item order.
- `WorkspaceHomePage.tsx` uses `KpiCard`, `EmptyState`, `StatusBadge`, `WorkspacePageHeader` for status/KPI/empty-state chrome; create-action tiles and recent-row list remain page-local compositions.

## Category grades (revised)

| # | Category | Prior | Revised | Reason |
|---|---|---|---|---|
| A | Workspace nav order vs outline §4 | PASS | PASS | 15 items in exact outline order, verified in `canonicalNav.ts`. |
| B | Workspace shell mount completeness | PASS | PASS | Runs, Agents, Supervisor routes mounted under `/w/:workspaceId/*`. |
| C | Terminology (no user-facing "Tenant") | PASS | PASS | No regressions on touched surfaces. |
| D | Canonical primitives available | PASS | PASS | `KpiCard`, `EmptyState`, `StatusBadge`, `WorkspacePageHeader` exist and are exported. |
| **E** | **Workspace home compliance** | PASS | **PARTIAL** | Visual composition uses canonical primitives, but the documented canonical workspace home in the outline is `/app/workspaces/:workspaceId/*` while live code serves `/w/:workspaceId/*`. Route-family compliance is unresolved; tracked under K. |
| **F** | **UI primitive convergence** | PASS | **PARTIAL** | Status/KPI/empty-state chrome converged, but the create-action tile and the recent-items row are still page-local compositions on `WorkspaceHomePage`, not promoted shared primitives (`ActionCard`, `RecentList`). |
| G | Supervisor framing | PASS | PASS | Canonical placeholder using `EmptyState`; no `/admin` redirect, no fake CTA. |
| H | Runs/Agents framing | PARTIAL | PARTIAL | Routes mounted; data layer still org-scoped via the wrapped pages. Honest "Phase 8 follow-up" notice present. |
| I | Legacy redirect hygiene | PASS | PASS | `/app/workspaces/:workspaceId/*` is single-hop only; no nav links target it. |
| J | Demo-data hygiene on home | PASS | PASS | Demo heuristic excluded from KPI counts; surfaced via `EmptyState` notice. |
| **K** | **Outline vs live route-family mismatch** | PARTIAL | **PARTIAL** | Unchanged. Workspace family `/w/:workspaceId/*` (live) vs `/app/workspaces/:workspaceId/*` (outline §17) is a controlled implementation divergence requiring an editorial fix in the build doc. |

## Redirect + Compatibility Check (corrected)

Workspace family
- Canonical live route: `/w/:workspaceId/*` (CanonicalWorkspaceShell)
- Documented canonical route in outline: `/app/workspaces/:workspaceId/*`
- Compatibility alias: `/app/workspaces/:workspaceId/*` → single-hop redirect to `/w/:workspaceId/*`
- Status: controlled implementation divergence; outline editorial correction owed.

Org family (corrected per reviewer)
- Canonical live route per outline §1/§3: `/admin/*` (AdminShell). This remains the documented canonical org surface and is the family the outline's nav vocabulary anchors on.
- Additional live route family: `/org/*` (OrgShell). Mounted in `App.tsx` as the Phase 0 additive canonical-shell scaffold. **Not yet promoted to canonical org status by the outline.** Until the outline explicitly adopts `/org/*`, classify it as **internal shell scaffold / forward-canonical candidate**, not as a current canonical org family. Prior report wording that listed `/org/*` as a canonical live route was overstated.
- Compatibility alias: none today between `/admin/*` and `/org/*`; they coexist as parallel shells. This is a separate documented risk (org-shell duplication) and should be added to Remaining Gaps.

Marketing / auth / superadmin families: unchanged, not in scope of this slice.

## Remaining Gaps (explicit)

1. **Route-family mismatch (workspace)** — `/w/:workspaceId/*` live vs `/app/workspaces/:workspaceId/*` documented. Needs outline editorial update or a code rename decision.
2. **Org-shell duplication** — `/admin/*` (canonical per outline) and `/org/*` (Phase 0 additive shell) both live. No redirect bridge, no outline statement on which wins. Decision owed.
3. **Runs/Agents still org-scoped inside workspace wrappers** — workspace routes mount org-level data. Workspace-strict `workspace_id` filtering is deferred (Phase 8 follow-up).
4. **Supervisor is a placeholder** — canonical empty state only; module deferred.
5. **Residual home-page UI drift** — create-action tiles and recent-items row on `WorkspaceHomePage` are page-local; promote to shared `ActionCard` and `RecentList` primitives in the next UI-convergence slice.
6. **Outline editorial debt** — the build doc still references the older workspace route family and does not yet acknowledge `/org/*` shell.

## Net verdict

Implementation is directionally correct and the nav/IA alignment is real. Audit grading is now tightened: two PASS → PARTIAL downgrades (E, F), Redirect/Compatibility Check rewritten to stop calling `/org/*` canonical, and org-shell duplication added as an explicit gap. K remains PARTIAL as written.

## Proposed next slice (grounded in outline)

**UI-primitive promotion + org-shell decision.**
1. Extract `ActionCard` and `RecentList` from `WorkspaceHomePage` into `src/components/common/`, then refactor home and any near-duplicates to consume them. Closes Gap #5 and lifts Category F to PASS.
2. Decide `/admin` vs `/org`: either (a) update the outline to adopt `/org/*` as canonical and add `/admin/*` → `/org/*` single-hop redirects, or (b) retire `/org/*` shell scaffolding. Closes Gap #2.
3. Outline editorial pass: reconcile §17 workspace route family with live `/w/:workspaceId/*`. Closes Gap #1 and lifts K + E to PASS.

No code in this turn — this is a report-only revision. Approve to proceed with the next slice as scoped above.
