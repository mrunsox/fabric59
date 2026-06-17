# Business Brain — Phase 1 Architecture

Status: **Phase 1 / Slice 1 — Foundations shipped.**

## Purpose

The Business Brain is Fabric59's governed business knowledge layer. It
ingests business source material, extracts candidate facts with AI, and
captures them as **suggested facts** that human reviewers promote into
**approved facts** — the only knowledge other parts of the product are
allowed to depend on.

## Three-tier truth model

```text
Source (bb_sources)
  └── chunks (bb_source_chunks)
       └── Extraction (bb_extractions, review_status = suggested|approved|rejected|superseded)
            └── Approved Fact (bb_facts, verification_state = approved|needs_review|stale)
                 └── Relations (bb_fact_relations)
                 └── Review events (bb_review_events)
```

**Approval is the only path** from AI output to governed truth. No edge
function, hook, or trigger writes into `bb_facts` without going through
`bb-approve-fact`, which records the reviewer.

## Module layout

| Path | Purpose |
| ---- | ------- |
| `src/lib/business-brain/types.ts` | Public type constants. |
| `src/lib/business-brain/entitySchemas.ts` | Zod schema + `canonicalKey` / `displayName` per entity type. |
| `src/lib/business-brain/selectors.ts` | **Bridge boundary.** Downstream consumers must import only from here. |
| `src/lib/business-brain/promotion.ts` | Pure helpers (e.g. `mergeSourceRefs`). |
| `src/lib/business-brain/flagResolver.ts` | Org/Partner/Client merged feature flag. |
| `src/lib/business-brain/telemetry.ts` | `emitBbEvent` into `platform_events`. |
| `src/hooks/useBusinessBrain.ts` | React Query hooks for sources / extractions / facts / approve / reject. |
| `src/pages/workspace/brain/*` | Three-tab UI: Knowledge Bin, Suggested Facts, Approved Knowledge. |
| `supabase/functions/bb-ingest` | Chunk + AI-extract a source. |
| `supabase/functions/bb-approve-fact` | Server-side promotion / explicit merge. |

## Entity types (Phase 1)

`department`, `service`, `staff`, `phone`, `hours`, `destination_contact`,
`faq`, `escalation_contact`, `intake_requirement`, `policy`.

Additional types from the original scope (`extension`, `location`,
`service_area`, `service_category`, `required_phrase`, `prohibited_phrase`,
`role`) are intentionally deferred until a real use case lands.

## Bridge boundary (non-negotiable)

Downstream code (ASC, canonical builder, agent workspace) may import:

- View-model types: `ApprovedFactView`
- Async selectors: `listApprovedFacts`, `getFactSourceRefs`

It may **not** import:

- `bb_*` table row types from `src/integrations/supabase/types.ts`
- `BbExtractionRow`, `BbFactRow`, `BbSourceRow` from `useBusinessBrain.ts`
- Anything under `src/pages/workspace/brain/`
- Any `bb-*` edge function client wrapper outside the bridge

This boundary is enforced by `src/test/regressions/bbBridgeBoundary.test.ts`.

## Promotion rules (conservative — no fuzzy auto-merge)

1. Approval **creates a new fact** unless the reviewer explicitly chose a
   merge target in the UI.
2. The server rejects duplicate `canonical_key` with HTTP 409 and returns
   `existingFactId` so the UI can surface the merge dialog.
3. Merge preserves all prior `source_refs` and appends new ones,
   deduplicated on `(source_id, extraction_id, snippet)`.
4. Approved extractions are immutable — re-approve is forbidden.

## Source freshness / versioning

`bb_sources` carries `version`, `prior_source_id`, `content_hash`, and
`status`. The Knowledge Bin renders all four from day one. Re-ingesting the
same content (same hash) is a no-op. Stale-detection logic on `bb_facts` is
deferred to Phase 5.

## Telemetry

Events live in `platform_events` with `source = "business-brain"`:

- `bb_source_added`, `bb_source_processed`, `bb_source_failed`
- `bb_extraction_completed`
- `bb_fact_approved`, `bb_fact_rejected`, `bb_fact_merged`, `bb_fact_edited`

Failures swallow silently and never block UX.

## Out of scope for Slice 1

- ASC integration of any kind.
- URL crawl execution.
- Retrieval / search / embeddings.
- Live call assist.
- Transcript ingestion.
- Auto-merge or auto-approve heuristics.
- Vertical-specific schemas.

These are reserved for later phases tracked in `.lovable/plan.md`.
