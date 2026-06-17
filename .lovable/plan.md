# Phase 6 · Slice 1 — ASC + Canonical Consolidation, Docs, and Guardrails

Documentation + guardrails only. No behavior changes, no new features, no UX surfaces beyond comment breadcrumbs.

## 1. Architecture doc

**Create** `docs/asc-architecture.md` as the single source of truth for the ASC → canonical flow. Sections:

1. **Overview & responsibility boundaries** — what ASC owns vs. what canonical owns; the one-way handoff diagram.
2. **Steps 1–10 reference table** — for each step: concern owned, AI role allowed to write (interviewer / gap finder / logic architect / step-8 generator), confirm rules, ASC-local vs. canonical scope.
3. **Translation boundary** — `src/lib/asc/forkTranslator.ts`:
   - inputs: `AscDraft`, `AscGenerated`
   - outputs: `prefill: Partial<CampaignIntakeData>`, `ascOrigin`
   - intentional drops: interviewer/gapFinder/logicArchitect meta, confidence, rationales
   - name-fallback rule (≤60 chars from business description)
4. **`CampaignIntakeData.ascOrigin`** — provenance role, carried fields (outcomes, reasons, destination, launchSlug, followUps[], reviewState), how `AscOriginPanel` renders it, presentation-scoped `reviewState`.
5. **Post-fork behavior** — reducer `ALLOWED_WHEN_FORKED` allowlist (lifecycle + nav only) as primary enforcement; UI `<fieldset disabled>` as secondary; navigation across Steps 1–9 remains possible read-only; canonical `AscOriginPanel` "no sync back to ASC" messaging.
6. **Invariants** (explicit, numbered):
   - I1. ASC cannot mutate state when `state === "forked"`.
   - I2. Handoff is one-way; no reverse translation back into ASC.
   - I3. Canonical publish path is identical for ASC-origin and non-ASC campaigns.
   - I4. ASC-local types are never imported by canonical runtime modules (only the translator bridges them).
   - I5. ASC never calls the canonical publish/save action directly.
7. **For Contributors** — where to add new ASC roles, where to update invariants/tests, pointers to key files.

## 2. Golden-path integration test

**Create** `src/test/integration/ascToCanonicalHappyPath.test.ts` (new `integration/` folder under `src/test/`).

Flow:

1. Build representative `AscDraft` via `createEmptyAscDraft` + reducer dispatches (Steps 1–7 populated, Step 8 generation applied, draft state `complete`).
2. Call `translateAscDraftToIntake(draft, { forkedAt })`. Assert:
   - `prefill.campaignName` and `prefill.clientName` present and non-empty.
   - `prefill.ascOrigin.{ascDraftId, forkedAt, primaryOutcome, callerReasons, destination, launchSlug, followUps}` shaped as expected.
   - No ASC-only metadata leaks (`interviewer`, `gapFinder`, `logicArchitect`, `confidence`, `rationales`).
   - `prefill.additionalNotes` contains only the pointer line, not the full structured payload.
3. Feed `prefill` into a minimal `CampaignIntakeData` using the same default-merge pattern `CampaignIntakePage` uses, and assert `ascOrigin` survives the merge and required Section-1 fields are satisfied.
4. Simulate "save as submitted" by invoking the same required-field validation predicates the page uses (re-import the validation helper or inline the equivalent rule set the test pins). Assert the ASC-origin intake passes the same rules a non-ASC intake with the same fields would pass — no ASC-specific branch.

Test must fail loudly if translator shape, intake assimilation, or publish-path validation diverges.

## 3. Invariants sanity tests

**Create** `src/test/regressions/ascInvariants.test.ts`. Lightweight string/regex scans (no AST):

- **I4 guard**: read canonical runtime files (`src/pages/admin/CampaignIntakePage.tsx`, `src/components/campaigns/AscOriginPanel.tsx`, and the canonical publish action module) and assert none contain `from "@/lib/asc/` or `from "../../lib/asc/` except for the explicitly-allowed `ascOrigin` type re-export path (whitelisted constant in the test).
- **I5 guard**: read ASC entrypoints (`src/lib/asc/*.ts`, `src/pages/workspace/campaigns/asc/**`) and assert none import the canonical publish/save function (pin the exact symbol/path used by canonical `handleSave("submitted")`).
- **I1 guard**: import `ALLOWED_WHEN_FORKED` from `src/lib/asc/reducer.ts` (export it if not already exported — minimal change) and assert it contains exactly the expected lifecycle/nav actions and excludes a pinned list of known mutating actions (`UPDATE_INPUT`, `APPLY_AI_PATCH`, `SET_GENERATED`, `SET_STEP_STATUS`, etc.).

If `ALLOWED_WHEN_FORKED` is not currently exported, add a named export — the only code change in this slice.

## 4. Breadcrumb comments

Add a single-line comment pointing to `docs/asc-architecture.md` in:

- `src/lib/asc/forkTranslator.ts` (top of file)
- `src/components/campaigns/AscOriginPanel.tsx` (top of file)
- `src/pages/workspace/campaigns/asc/AscWizardPage.tsx` (top of file)

No behavior changes.

## Files

**Created**
- `docs/asc-architecture.md`
- `src/test/integration/ascToCanonicalHappyPath.test.ts`
- `src/test/regressions/ascInvariants.test.ts`

**Edited (minimal)**
- `src/lib/asc/reducer.ts` — export `ALLOWED_WHEN_FORKED` if not already exported
- `src/lib/asc/forkTranslator.ts` — doc-link comment
- `src/components/campaigns/AscOriginPanel.tsx` — doc-link comment
- `src/pages/workspace/campaigns/asc/AscWizardPage.tsx` — doc-link comment

## Non-goals

No new ASC roles/steps, no readiness changes, no fork-mechanic or `ascOrigin` shape changes, no canonical feature work, no publish behavior changes, no new RLS/schema/edge functions.
