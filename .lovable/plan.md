## Rename "Workspace guide" → "Campaign guide" (UI labels only)

Update user-facing strings only. Internal route paths (`/guide`), table names, type names, and variable names stay as-is to avoid churn.

### Files to update

**Navigation**
- `src/config/canonicalNav.ts` line 51 — nav label `"Workspace guide"` → `"Campaign guide"`.

**Page chrome**
- `src/pages/workspace/WorkspaceGuideBuilderPage.tsx` — `eyebrow`, `title`, and the loading text.
- `src/pages/workspace/WorkspaceGuidesPage.tsx` — description copy.
- `src/pages/workspace/WorkspaceLibraryPage.tsx` — inline link label.
- `src/pages/workspace/WorkspaceKnowledgePage.tsx` — guides description.

**Components**
- `src/components/workspace/guides/AttachGuideCard.tsx` — button/label "Workspace guide".
- `src/components/call-runner/GuidePanel.tsx` — panel header + empty-state copy.
- `src/components/workspace-guide/WorkspaceGuideAssembler.tsx` — visible "Workspace Guide" text in the assembler explainer.

**Setup readiness**
- `src/hooks/useWorkspaceSetupReadiness.ts` — `label` and `hint` strings.

**Regression tests that assert the old label**
- `src/test/regressions/phase11BuildIA.test.ts` — update expected label.
- `src/test/regressions/workspaceGuideBuilder.test.ts` — update label regex.

### Out of scope
- Route `/w/:workspaceId/guide` stays.
- DB/table names, type names, file names, code comments referencing "workspace guide" internally — left as-is.
- Cockpit attribution string `"From workspace guide · …"` — left as-is for now (cockpit copy is a separate surface; can rename in a follow-up if desired).
