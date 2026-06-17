# Phase 5 · Slice 1 — Canonical Builder Assimilation After ASC Handoff

## Goals
- Make ASC origin context durable across autosave + route transition.
- Surface structured carry-over (outcomes, reasons, destination, follow-ups) inside the canonical builder, not as a notes blob.
- Unblock canonical save with deterministic, modest name fallbacks.
- No bidirectional sync, no direct publish, no route re-homing, no canonical type churn beyond one optional additive field.

## Changes
1. `CampaignIntakeData.ascOrigin?` (optional, additive) — provenance only:
   - `ascDraftId`, `forkedAt`
   - `carried`: primaryOutcome, secondaryOutcome, callerReasons[], destination, launchSlug
   - `followUps`: [{id, area, message}]
   - `reviewState.followUpsDismissedIds`: presentation-scoped only
2. `forkTranslator`:
   - Add deterministic `campaignName` / `clientName` fallback from `business.description` (first 60 chars at word boundary, no polish).
   - Stop dumping structured data into `additionalNotes`; emit `prefill.ascOrigin` instead.
   - `additionalNotes` becomes a one-line pointer ("Handed off from ASC — see the ASC origin panel above.") or omitted if user already has notes downstream.
   - Takes `forkedAt` to stay pure.
3. `AscWizardPage.handleFork`: pass `now` to translator so `ascOrigin.forkedAt` matches reducer record.
4. New `AscOriginPanel`: banner + carried context cards + follow-up checklist with explicit "Add as new disposition candidates" (additive only) and copy-slug action. Reads/writes `intake.ascOrigin.reviewState`.
5. `CampaignIntakePage`: render `AscOriginPanel` above Section 1 when `intake.ascOrigin` present; preserve `ascOrigin` through `update()`.
6. `WorkspaceCampaignNewPage`: drop redundant ASC shell banner (panel is now durable surface), keep one comment line.

## Tests
- `ascCanonicalAssimilationTranslator.test.ts`
- `ascOriginPersistence.test.ts`
- `ascOriginPanel.test.tsx`
- `ascCanonicalPublishContinuity.test.ts`
- `ascRouteTransitionContinuity.test.tsx` — explicit `/new` → `/admin/campaigns/edit/:id` transition

## Out of scope
Bidirectional sync, direct publish, route re-homing, runtime coupling, broad canonical schema changes.
