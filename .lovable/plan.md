# Phase 6 · Slice 2 — Shadow Rollout & Observation

Goal: turn ASC into something we can actually measure during a quiet pilot. No new ASC features, no new canonical features. Just gating, telemetry, and the docs/dashboards needed to read the results.

## 1. Rollout gating (no UI surface beyond what exists)

ASC is already behind `resolveAscWizardFlag` (Client > Partner > Org > dev override). Slice 2 keeps that mechanism — we do **not** add new toggles, route changes, or nav entries.

- Add a short operator doc `docs/asc-shadow-rollout.md` covering:
  - Who: internal team + 2–5 trusted customers.
  - How to enable per workspace via `features.ascWizard.enabled = true` in the org/partner/client integration config.
  - Expectation copy ("assisted wizard, hands off to canonical builder, never publishes directly").
  - Success criteria: 10–20 full ASC → canonical journeys from shippers.
- No nav changes; entry stays via the existing decision page when the flag resolves true.

## 2. Telemetry layer (`src/lib/asc/telemetry.ts`)

One thin helper, used everywhere ASC emits a signal, so events stay consistent and easy to grep.

```text
emitAscEvent(eventType, {
  ascDraftId,
  workspaceId,
  step?,         // 1..10 where relevant
  role?,         // interviewer | gap_finder | logic_architect | generator
  targetField?,  // for proposal confirmations
  outcome?,      // ok | fail
  errorCode?,    // '402' | '429' | 'schema' | 'unknown'
  blockerCount?, warningCount?, blockerId?,
  source?,       // 'asc' | 'canonical'
})
```

Internally it calls the existing `useEmitEvent` / `platform_events` insert with `source: "asc"` and a stable `event_type` prefix `asc_*` / `canonical_from_asc_*`. `userId`, `organization_id`, and `created_at` already come from the existing emitter — we do not duplicate them in the payload.

Failure of telemetry is silent (try/catch swallow + console.warn in dev). Telemetry never blocks UX or mutates ASC state.

### Event catalog (the only events we ship in Slice 2)

Wizard lifecycle
- `asc_wizard_opened`
- `asc_step_completed` — `{ step, usedAi: boolean }`
- `asc_step_back` — `{ step }`
- `asc_wizard_abandoned` — `{ lastStep }` (emitted on unmount when state !== forked/published/discarded)

AI usage
- `asc_ai_call` — `{ role, step, outcome, errorCode? }`
- `asc_ai_proposal_confirmed` — `{ role, step, targetField }`

Readiness + handoff
- `asc_readiness_viewed` — `{ blockerCount, warningCount }`
- `asc_readiness_blocker_seen` — `{ blockerId }` (deduped per draft+blocker in session)
- `asc_handoff_initiated`
- `asc_handoff_completed` — emitted when canonical page mounts with `ascOrigin`

Canonical side (ASC-origin only)
- `canonical_from_asc_opened`
- `canonical_from_asc_saved` — first successful save of an ASC-origin draft
- `canonical_from_asc_published` — final publish where `ascOrigin` is present

## 3. Wiring points (minimal, additive)

All changes are call-site insertions of `emitAscEvent(...)`; no logic refactors.

- `src/pages/workspace/campaigns/asc/AscWizardPage.tsx`
  - `asc_wizard_opened` on first mount per draft.
  - `asc_step_completed` / `asc_step_back` on footer nav.
  - `asc_wizard_abandoned` in unmount effect, guarded by draft state.
  - `asc_handoff_initiated` when the user triggers handoff (existing handler).
- `src/hooks/useAscInterviewer.ts`, `useAscGapFinder.ts`, `useAscLogicArchitect.ts`, `useAscStep8Generate.ts`
  - Wrap the call with `asc_ai_call` on success/fail, mapping HTTP/Zod error to `errorCode`.
- ASC proposal acceptance handlers (in the relevant step components consuming those hooks)
  - `asc_ai_proposal_confirmed` on accept.
- `src/components/asc/AscReadinessPanel.tsx`
  - `asc_readiness_viewed` once per mount per draft.
  - `asc_readiness_blocker_seen` per unique blocker rendered.
- `src/components/campaigns/AscOriginPanel.tsx`
  - `canonical_from_asc_opened` on mount.
- `src/pages/admin/CampaignIntakePage.tsx` (and `WorkspaceCampaignNewPage.tsx` for the route-transition path)
  - `asc_handoff_completed` on mount when `ascOrigin` is present (once per `ascDraftId`).
  - `canonical_from_asc_saved` on first successful save where `ascOrigin` is present.
  - `canonical_from_asc_published` on successful publish where `ascOrigin` is present.

De-dup strategy: per-mount `useRef` guards for "once per session/draft" events; no DB-side dedup, no schema changes.

## 4. Read path — a tiny observation dashboard

A superadmin-only page so we can read the rollout without writing SQL each time.

- New route `src/pages/superadmin/AscShadowObservationPage.tsx`, linked from `SuperadminOverviewPage` behind the existing superadmin guard.
- Data: queries `platform_events` filtered to `event_type LIKE 'asc_%' OR LIKE 'canonical_from_asc_%'` for the last 30 days.
- Renders:
  - Funnel counts: opened → step 5 → step 8 → step 10 → handoff_initiated → handoff_completed → canonical_saved → canonical_published.
  - AI adoption: % of `asc_step_completed` with `usedAi=true`; proposal confirmation rate per role.
  - Top blockers: grouped counts of `asc_readiness_blocker_seen`.
  - Handoff drop-off: simple per-draft state machine derived from events.
- Implementation is read-only client-side aggregation over the `platform_events` query; no new tables, no edge function.

## 5. Qualitative debrief asset

Add `docs/asc-shadow-debrief.md`: the five debrief questions verbatim, plus a one-paragraph "how to run a debrief" intro. This is the canonical script the team uses when interviewing internal/external pilots.

## 6. Tests

Lightweight, focused on the contract — no flaky network tests.

- `src/test/regressions/ascTelemetryContract.test.ts`
  - Calls `emitAscEvent` with each event type using a stubbed emitter.
  - Asserts: event_type matches the documented catalog; payload only contains the documented keys; unknown event types throw at compile time (TS literal union) and at runtime are rejected.
- `src/test/regressions/ascTelemetrySafety.test.ts`
  - Stub emitter that throws; assert calling `emitAscEvent` does not throw and does not mutate any caller-provided objects.
- `src/test/regressions/ascHandoffEventsFire.test.tsx`
  - Mount `AscOriginPanel` and `CampaignIntakePage` (with mocked router/state) under an emitter spy; assert `canonical_from_asc_opened` and `asc_handoff_completed` fire exactly once per mount with the expected payload shape.

No tests assert event counts in production data; we only verify the emit contract.

## 7. Out of scope (locked)

- No new ASC steps, roles, or AI prompts.
- No canonical builder changes beyond inserting telemetry calls and the existing `AscOriginPanel` mount event.
- No schema migrations, no new tables, no RLS changes, no edge functions.
- No nav exposure of ASC beyond the existing flag-gated decision page.
- No automated rollout gating based on event data — pilot expansion stays a human decision informed by the dashboard.

## Files touched

Created
- `src/lib/asc/telemetry.ts`
- `src/pages/superadmin/AscShadowObservationPage.tsx`
- `docs/asc-shadow-rollout.md`
- `docs/asc-shadow-debrief.md`
- `src/test/regressions/ascTelemetryContract.test.ts`
- `src/test/regressions/ascTelemetrySafety.test.ts`
- `src/test/regressions/ascHandoffEventsFire.test.tsx`

Edited (telemetry call-sites only)
- `src/pages/workspace/campaigns/asc/AscWizardPage.tsx`
- `src/hooks/useAscInterviewer.ts`, `useAscGapFinder.ts`, `useAscLogicArchitect.ts`, `useAscStep8Generate.ts`
- `src/components/asc/AscReadinessPanel.tsx`
- `src/components/campaigns/AscOriginPanel.tsx`
- `src/pages/admin/CampaignIntakePage.tsx`
- `src/pages/workspace/WorkspaceCampaignNewPage.tsx`
- `src/pages/superadmin/SuperadminOverviewPage.tsx` (one nav entry)
- `.lovable/plan.md`

## Exit criteria

- Pilot workspaces with the flag on emit the full event set without errors.
- Superadmin observation page renders the funnel, AI adoption, top blockers, and handoff drop-off from real `platform_events` data.
- All new tests green; no behavior changes to ASC or canonical flows beyond emitting events.
