# Phase 1 / Slice 1 — Business Brain foundations

## Status

Shipped — see `docs/business-brain-architecture.md` for the full design.

## What landed

- Six `bb_*` tables with RLS, GRANTs, and an audit-trail review-event table.
- Private storage bucket `business-brain-sources` with workspace-scoped policies.
- `src/lib/business-brain/` module: `types`, `entitySchemas`, `selectors` (bridge boundary), `promotion`, `flagResolver`, `telemetry`.
- `src/hooks/useBusinessBrain.ts`: list sources / extractions / facts, ingest paste, ingest upload, approve (with explicit merge), reject.
- `supabase/functions/bb-ingest`: chunk + AI extract a source. Verifies workspace role.
- `supabase/functions/bb-approve-fact`: server-side promotion. Rejects duplicate `canonical_key` with HTTP 409 — no silent merge.
- `/w/:workspaceId/brain` shell with three tabs: Knowledge Bin, Suggested Facts, Approved Knowledge.
- Source freshness in the Bin from day one: version, supersession, processing status, status message.
- Conservative merge UX: duplicate detection happens on approve; reviewer must explicitly pick the merge target.
- Tests: `bbEntitySchemas`, `bbPromotionMerge`, `bbBridgeBoundary`, `bbTelemetrySafety`.
- Telemetry: `bb_source_added`, `bb_source_processed`, `bb_source_failed`, `bb_extraction_completed`, `bb_fact_approved`, `bb_fact_rejected`, `bb_fact_merged`, `bb_fact_edited` — into `platform_events` (`source = "business-brain"`).

## Out of scope (locked)

- ASC integration (Phase 2).
- URL crawl execution (URL tab is disabled).
- Retrieval / embeddings / search.
- Live call assist (Phase 4).
- Transcript ingestion (Phase 5).
- Vertical skins (Phase 6).
- Auto-merge / auto-approve heuristics.

## Rollout

Flag: `features.businessBrain.enabled` on Org/Partner/Client integration_configs.
Dev override: `localStorage["fabric59.features.businessBrain.enabled"] = "1"` (DEV builds only).
Nav is intentionally NOT added to the primary sidebar in this slice — pilot via direct URL `/w/:workspaceId/brain`.

## Next slice candidates

1. PDF/DOCX text extraction in `bb-ingest` (server-side parse).
2. CSV directory ingestion with column mapping.
3. Phase 2 / Slice 1 — wire `listApprovedFacts` and ship an advisory suggestion tray for ASC Step 3.
