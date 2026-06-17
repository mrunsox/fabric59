# ASC → Canonical Campaign Builder Architecture

Authoritative reference for the AI-assisted Setup Conversation (ASC) wizard and
its one-way handoff into the canonical campaign builder. Phase 6 · Slice 1.

If something in this doc disagrees with the code, the code wins — but please
update this doc in the same PR.

---

## 1. Overview & responsibility boundaries

ASC is a guided, AI-assisted capture surface that produces an ASC-local draft.
It does **not** publish campaigns and does **not** write canonical DB rows.
When a draft is ready, the user "forks" it into the canonical builder, which
then owns all downstream save, validation, and publish behavior.

```text
  ASC wizard (Steps 1–10)
  ┌──────────────────────────────────────┐
  │ AscDraft (input, meta, generated)    │
  │   AI roles: interviewer, gap-finder, │
  │   logic-architect, step-8 generator  │
  └──────────────┬───────────────────────┘
                 │ forkToCanonical (one-way)
                 │   translateAscDraftToIntake
                 ▼
  ┌──────────────────────────────────────┐
  │ CampaignIntakeData (canonical)       │
  │   + ascOrigin (provenance, additive) │
  │   handleSave("submitted") → publish  │
  └──────────────────────────────────────┘
                 ▲
                 │ (no reverse path; ASC is read-only after fork)
```

---

## 2. Steps 1–10 reference

| Step | Concern                          | AI role allowed to write          | Confirm rule                          | Scope        |
| ---- | -------------------------------- | --------------------------------- | ------------------------------------- | ------------ |
| 1    | Business identity                | interviewer                       | user-confirm each proposed field      | ASC-local    |
| 2    | Purpose (primary/secondary)      | interviewer                       | user-confirm each proposed field      | ASC-local    |
| 3    | Caller types / reasons           | interviewer, gap-finder (advise)  | user-confirm; gaps are advisory only  | ASC-local    |
| 4    | Handling                         | interviewer, gap-finder (advise)  | user-confirm; gaps are advisory only  | ASC-local    |
| 5    | Outcomes (manual + LA proposals) | logic-architect (proposals only)  | user-confirm/edit/reject              | ASC-local    |
| 6    | Notifications                    | logic-architect (proposals only)  | user-confirm/edit/reject              | ASC-local    |
| 7    | Destination / launch slug        | logic-architect (proposals only)  | user-confirm; client-side uniqueness  | ASC-local    |
| 8    | ASC-local generation             | step-8 generator                  | writes `generated`; stale on input ∆  | ASC-local    |
| 9    | Review                           | none (read-only)                  | edit-at-source navigation             | ASC-local    |
| 10   | Readiness + handoff              | none                              | blockers must clear; one-way fork CTA | ASC → canon. |

After fork: the canonical builder owns publish. ASC steps remain navigable but
read-only.

---

## 3. Translation boundary

`src/lib/asc/forkTranslator.ts` is the *only* bridge between ASC-local types
and canonical types.

- **Reads**: `AscDraft` (input, meta, generated).
- **Writes** into `Partial<CampaignIntakeData>`:
  - `campaignName`, `clientName` — deterministic fallbacks derived from the
    business description, snapped to ≤60 chars at a word boundary. Modest
    on purpose; the user edits in canonical.
  - `campaignDescription` — truncated business description.
  - `ascOrigin` — provenance object (see §4).
  - `additionalNotes` — a single pointer line to the ASC origin panel. The
    structured payload itself lives in `ascOrigin`, not in notes.
- **Intentionally dropped**:
  - `meta.interviewer`, `meta.gapFinder`, `meta.logicArchitect` (proposals,
    advisories, turn history, confirmedFields)
  - `generated.confidenceByArea`, rationales, step8 advisories
  - any ASC reducer/UI state

Translator is pure: same input + same `forkedAt` → same output. No I/O, no
`Date.now()`.

---

## 4. `CampaignIntakeData.ascOrigin`

Additive, optional provenance field on the canonical intake. Not a shadow
canonical model — canonical editable fields above it remain the source of
record.

Shape (see `src/types/campaign.ts`):

- `ascDraftId`, `forkedAt` — provenance metadata.
- `carried` — optional structured context: `primaryOutcome`, `secondaryOutcome`,
  `callerReasons[]`, `destination`, `launchSlug`.
- `followUps[]` — capped at 20 items, with an overflow indicator row.
- `reviewState` — presentation-scoped (currently `followUpsDismissedIds[]`).
  Explicitly *not* domain semantics.

`AscOriginPanel` (`src/components/campaigns/AscOriginPanel.tsx`) renders this
inside the canonical intake page with:

- a "handed off from ASC" banner + link back to the original ASC draft,
- additive "Insert as new disposition" actions (never overwrite),
- a follow-up checklist whose dismissals persist in `reviewState`,
- explicit "Changes here do not sync back to ASC." copy.

Because `ascOrigin` lives inside the `intake_data` JSONB, it survives the
`/campaigns/new` → `/admin/campaigns/edit/:id` route transition after first
autosave.

---

## 5. Post-fork behavior

When `draft.state === "forked"`:

- **Primary enforcement (reducer)**: `src/lib/asc/reducer.ts` exports
  `ALLOWED_WHEN_FORKED` — the allowlist of lifecycle/navigation actions
  (`INIT_DRAFT`, `RESET_DRAFT`, `SET_STEP`, `TOUCH`, `MARK_FORKED`). All other
  actions are silently no-op'd at the top of `ascReducer`. This is the real
  source of truth — custom controls, AI panels, and callbacks cannot bypass it.
- **Secondary UI affordance**: `AscWizardPage` wraps Steps 1–9 bodies in
  `<fieldset disabled>` so native form controls render inert. Step 10 stays
  interactive for navigation.
- **Navigation**: users can still browse all steps to review the historical
  draft.
- **Banner**: "This draft has been handed off to the canonical builder.
  Changes here no longer affect the canonical campaign." Includes `forks[0]`
  timestamp + actor.
- **Canonical side**: `AscOriginPanel` shows the inverse banner: "Changes here
  do not sync back to ASC."

---

## 6. Invariants

These are protected by regression tests in `src/test/regressions/` and the
golden-path test in `src/test/integration/`.

- **I1**. ASC cannot mutate state when `state === "forked"` (reducer no-op
  for any action not in `ALLOWED_WHEN_FORKED`).
- **I2**. Handoff is one-way. There is no reverse translation back into ASC.
- **I3**. The canonical publish path (`handleSave("submitted")` in
  `CampaignIntakePage`) is identical for ASC-origin and non-ASC campaigns —
  no ASC-specific branches.
- **I4**. ASC-local types are never imported by canonical runtime modules.
  Only `forkTranslator.ts` bridges the two.
- **I5**. ASC modules never import the canonical publish/save action
  (`useSaveCampaignSetup`, `useAutoProvision`).

---

## 7. For contributors

- **Add a new ASC AI role**: define its schema under `src/lib/asc/*Schema.ts`,
  add actions in `src/lib/asc/actions.ts`, handle them in `reducer.ts`. If the
  action mutates state, do **not** add it to `ALLOWED_WHEN_FORKED`.
- **Extend `ascOrigin`**: update the type in `src/types/campaign.ts`, the
  translator, the panel, and the relevant tests under
  `src/test/regressions/ascCanonical*` and `src/test/integration/`.
- **Touch the publish path**: keep ASC-origin and non-ASC intakes on the
  same code path (I3). If a branch is unavoidable, add a test that exercises
  both shapes.
- **Key files**:
  - `src/lib/asc/forkTranslator.ts` — only ASC↔canonical bridge
  - `src/lib/asc/reducer.ts` — post-fork guard
  - `src/components/campaigns/AscOriginPanel.tsx` — canonical-side provenance
  - `src/pages/workspace/campaigns/asc/AscWizardPage.tsx` — wizard host
  - `src/test/integration/ascToCanonicalHappyPath.test.ts` — golden path
  - `src/test/regressions/ascInvariants.test.ts` — guardrail scans
