# Codebase Cleanup — Pass 1

Audit-driven, behavior-preserving removal of clearly dead code introduced or left behind by the canonical convergence work. Subsequent passes (2–4) will be proposed separately after this one lands cleanly.

## Audit

### A. High-confidence removals (95%+, zero references)

| # | Path | What it was | Why dead | Validation |
|---|---|---|---|---|
| 1 | `src/components/auth/AuthShell.tsx` | Phase-2 compat re-export of `@/shells/AuthShell` | `rg "components/auth/AuthShell"` → zero importers in `src/` (only its own file). Canonical lives at `src/shells/AuthShell.tsx`. | Repo-wide ripgrep + typecheck |
| 2 | `src/components/onboarding/OnboardingShell.tsx` | Phase-2 compat re-export of `@/shells/OnboardingShell` | `rg "components/onboarding/OnboardingShell"` → zero importers. | Repo-wide ripgrep + typecheck |
| 3 | `src/shells/SuperadminShell.tsx` | Phase-0 re-export of `@/components/layout/SuperadminShell` | The only importer (`App.tsx`) imports directly from `components/layout/SuperadminShell`. The shim has no consumers. | Repo-wide ripgrep + typecheck |
| 4 | `SURFACED_WORKSPACE_SECTIONS` export in `src/config/navigation.ts` | Filtered list of surfaced workspace sections | Only references are (a) its own definition and (b) `canonicalSurfaces.test.ts` asserting it is **not** used by the shell. Genuinely dead code. | Ripgrep confirms no live consumer |

Items 1–3: delete files. Item 4: remove the export + the `surfaced` filter helper; leave `WORKSPACE_SECTIONS` intact (consumed by `OutlinePage` and `WorkspacesIndexPage`). The `surfaced` field on entries stays for now (still serialized in `WORKSPACE_SECTIONS` consumers' types) to avoid behavior change in `/outline`.

### B. Manual-review (flag, do not delete this pass)

| Path | Why flagged | Recommended next pass |
|---|---|---|
| `src/pages/superadmin/AdvancedRoutesPage.tsx`, `DevGuidePage.tsx`, `TestCasesPage.tsx`, `FeatureVaultPage.tsx`, `SourceExportsPage.tsx` | De-surfaced from superadmin nav, still mounted as compatibility routes in `App.tsx`. Intentionally retained per prior approval. | Pass 3 — confirm with user before deleting |
| `src/components/auth/OrgParamRedirect.tsx` | Used by `/org/*` legacy redirects in `App.tsx`. Compatibility bookmark surface. | Keep — proven live |
| `src/pages/admin/ClientsPage.tsx` | Thin `<TenantsPage />` wrapper mounted at `/admin/clients`. Compatibility relabel. | Keep — proven live |
| `src/pages/workspace/LegacyWorkspaceRedirect.tsx` | Bookmark redirect `/app/workspaces/:id/* → /w/:id/*`. | Keep — bookmark compat |
| `src/data/surfaceAudit.ts` | Read-only Phase-11 inventory rendered by `/outline`. Large file, looks stale but is intentionally retained doc data. | Keep — documented internal tool |
| `src/config/navigation.ts` `WORKSPACE_SECTIONS` `surfaced` flags | Whole "surfaced" concept superseded by `canonicalNav.ts` groups, but `WORKSPACE_SECTIONS` is still consumed by `OutlinePage` and `WorkspacesIndexPage`. | Pass 2 — propose collapsing `WORKSPACE_SECTIONS` to a minimal outline doc list |
| `src/components/layout/SectionTabs.tsx`, `ScrollToTopButton.tsx`, `AdminShell.test.tsx` | Not yet verified in this pass — defer to Pass 2 sweep | Pass 2 |

## Files changed in this pass

- **Delete:** `src/components/auth/AuthShell.tsx`
- **Delete:** `src/components/onboarding/OnboardingShell.tsx`
- **Delete:** `src/shells/SuperadminShell.tsx`
- **Edit:** `src/config/navigation.ts` — remove `SURFACED_WORKSPACE_SECTIONS` export (and its filter line). No other changes.
- **Edit (test):** `src/test/regressions/canonicalSurfaces.test.ts` — remove the now-obsolete `SURFACED_WORKSPACE_SECTIONS` negative assertion (lines ~177–178). The sibling assertion forbidding bare `WORKSPACE_SECTIONS` in the workspace shell is preserved.

## Validation

- `rg` for each deleted symbol/path across `src/` post-edit → expect zero hits.
- Run `src/test/regressions/canonicalSurfaces.test.ts`, `canonicalScopeAlignment.test.ts`, `navRouting.test.ts`, `superadminSurface.test.ts`.
- Typecheck via existing harness.
- Pre-existing unrelated failures in `canonicalSurfaces.test.ts` (marketing copy, onboarding handoff path) called out separately — not touched.

## Scope boundaries (explicit non-goals)

- No route mounting changes in `App.tsx`.
- No Supabase / RLS / migrations.
- No restyle, no shell refactor, no marketing copy edits.
- No deletion of any compatibility route or page tied to a mounted URL.
- Passes 2–4 deferred until this one is approved and green.

## Final report (after execution)

Will include: files deleted, files edited, dead exports removed, tests updated, items intentionally kept with one-line reason, and any medium-confidence leftovers flagged for the next pass.
