# Business Brain — Frontend Audit (Phase 0 → Phase 1 inputs)

Canonical issue list for the logged-in product surfaces shipped by Business
Brain Phases 1–8. Severity drives target phase. Marketing audit lives in a
later phase and is intentionally out of scope here.

| Columns |
|---|
| **Capability** — shipped feature being audited |
| **Route / file** — primary surface |
| **Expected** — what the user should be able to do |
| **Observed** — current behavior (verified in repo) |
| **State** — working / hidden / confusing / broken / incomplete / internal |
| **Severity** — Critical / High / Medium / Low |
| **Fix** — short description |
| **Target phase** — 1 (this phase) / 2+ (visual or later) |

## Critical & High issues (Phase 1 fix list)

| # | Capability | Route / file | Expected | Observed | State | Sev | Fix | Phase |
|---|---|---|---|---|---|---|---|---|
| 1 | Sidebar entry for Business Brain | `src/config/canonicalNav.ts` `knowledge` item | Link resolves to `/w/:wid/brain` and reads "Business Brain" | `to: "knowledge"` (no route mounted at that path) and label "Knowledge" | Broken | Critical | Repoint `to: "brain"`, relabel "Business Brain" | 1 |
| 2 | Reach Brain Settings from outside the Brain layout | (no global link) | Admin can find Settings in ≤ 2 clicks | Only accessible by typing the URL | Hidden | Critical | Add a command-palette quick action for admins | 1 |
| 3 | Reach Brain Health from outside the Brain layout | (no global link) | Reachable in ≤ 2 clicks | Only via the in-layout tab (which is fine) and direct URL | Hidden | High | Add command-palette quick action for admins; do **not** add a top-level nav item | 1 |
| 4 | Disabled-state for Business Brain layout | `BusinessBrainLayoutPage.tsx` | Actionable CTA: admin → open Settings, non-admin → ask owner | Renders a raw `<code>features.businessBrain.enabled</code>` flag-name snippet | Confusing | Critical | Replace with role-aware CTA | 1 |
| 5 | ASC side panel "Preview / Why / History" tabs | `src/components/asc/AscSidePanel.tsx` | Either ship, gate, or render an explicit empty state with a useful exit | Bare placeholder sentences inside each tab | Confusing | High | Render `<BbStateBlock kind="upcoming" />` with a link to docs / live runner | 1 |
| 6 | Settings page non-admin state | `BusinessBrainSettingsPage.tsx` | Clear permission-denied with named role | Generic muted-text message | Confusing | High | Use shared `<BbPermissionDenied />` | 1 |
| 7 | Health page non-admin state | `BrainHealthPage.tsx` | Same as above | Same generic muted message | Confusing | High | Use shared `<BbPermissionDenied />` | 1 |
| 8 | Workflow continuity from gap topic → fact draft | `BbGapDrawer.tsx`, governance sections | Deep-link preserves return context | "Edit fact" navigates without `from=gap:<id>` context | Incomplete | High | Thread `from=gap:<topicId>` through deep links; show back-chip on destination | 1 |
| 9 | Suggested Facts empty / post-approval continuity | `SuggestedFactsPage.tsx` | After approve, show "Next / All caught up" CTA | Card disappears silently; no forward affordance in empty state | Incomplete | High | Add forward-CTA to empty state pointing at Approved Knowledge | 1 |
| 10 | Brain Search no-results | `BrainSearchPage.tsx` | Explicit "we logged this for review" + "Propose this as a fact" (gated by perms) | Generic "no approved knowledge matched" copy; gap signal logged silently | Confusing | High | Add gap-logged note + permission-gated "Propose as a fact" / fallback "Open Governance" | 1 |
| 11 | Health card empty vs failed | `BrainHealthPage.tsx` cards | Distinct text/icon for No data vs Failure; window/last-updated visible | Distinction exists for some cards, but no "window" label and no "last updated" stamp | Incomplete | High | Use `<BbStateBlock />` and stamp window + freshness on cards | 1 |
| 12 | Settings status summary "No data" vs "Failed" | `BusinessBrainSettingsPage.tsx` `StatusSummaryCard` | Visually distinct | Mostly compliant, but the two states share the same muted styling in one branch | Incomplete | High | Route through `<BbStateBlock />` | 1 |

## Medium / Low (deferred to later phases)

| # | Capability | Severity | Target phase |
|---|---|---|---|
| 13 | Visual hierarchy of Approved Knowledge cards | Medium | 2 (visual refresh) |
| 14 | Motion / depth across Brain tabs | Medium | 2 |
| 15 | Marketing pages mentioning AI vs. Business Brain reality | High (marketing) | 3 |
| 16 | OG / SEO sweep for Brain marketing pages | Medium | 4 |
| 17 | Cross-phase coherence and polish | Medium | 5 |

## Verification snapshot (Phase 0)

- Routes mounted (verified in `src/App.tsx`): `/w/:wid/brain`, `/brain/suggested`, `/brain/approved`, `/brain/search`, `/brain/governance`, `/brain/health`, `/w/:wid/settings/brain`.
- Sidebar `knowledge` nav item is **broken** — no route at `/w/:wid/knowledge`.
- Command palette iterates `WORKSPACE_NAV_GROUPS`/`PINNED`/`DEMOTED`; Brain Settings and Health are not in any of those.
- ASC side panel renders three placeholder tabs (Preview, Why, History) with no exit.
