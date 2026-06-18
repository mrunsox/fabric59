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

---

# Phase 1 / Slice 2 — Richer Ingestion & Fact Quality (Shipped)

## Delivered

- **CSV team directory ingest** via `useBbIngestCsv` + new "Team CSV" tab in Knowledge Bin.
  Auto header mapping (`autoMapHeaders`) and reviewer-editable column mapping. File stored in
  `business-brain-sources` bucket. Edge function `bb-ingest` gains a `mode: "structured_directory"`
  branch with deterministic extraction (no AI) per `rowsToExtractions`.
- **Strict destination_contact rule.** Only emitted for non-person rows whose `label` matches a
  known business-contact pattern. Mixed rows (named staff with billing-style labels) classify as
  `staff` (+ `phone`), never `destination_contact`. Asserted by `bbCsvIngest.test.ts`.
- **Improved FAQ ingest** via `useBbIngestFaq` + client-side `parseFaqText` (Q:/A:, numbered,
  blank-line). Edge function fast-paths when ≥2 pairs detected; otherwise AI fallback runs on
  the raw text. AI prompt extended to allow conservative `faq.service` association only when
  explicit and reusable.
- **Review UX** — Suggested Facts gets entity / source / confidence-band filters; merge dialog
  gets a search box across same-type approved facts with key-collision candidates surfaced first.
  Approved Knowledge gets free-text search, last-reviewed date range, latest-import column, and a
  "Snippets" drawer (Sheet) listing each `source_refs[]` with originating source + snippet.
- **Schema hardening** in `entitySchemas.ts`: phone ≥7 digits, `hours.weekly` optional best-effort
  map (free-form `schedule` always preserved), `policy.body` ≤500 chars, `intake_requirement.fields`
  deduped/lowercased, `faq.service` optional.
- **Boundary preserved.** `selectors.ts` remains a stub. New regression
  `bbAscBoundary.test.ts` checks both directions: ASC code may not import BB internals; BB code
  may not import ASC modules.

## Tests added

- `src/test/regressions/bbCsvIngest.test.ts` — auto-mapping, normalization, deterministic
  rules, mixed-row regression, dedup, ≥7-digit phone gate, label-based destination gating.
- `src/test/regressions/bbFaqParser.test.ts` — Q:/A:, numbered, blank-line, dedupe,
  unparseable-prose fallback, single-pair fast-path guard.
- `src/test/regressions/bbAscBoundary.test.ts` — bidirectional import invariants.
- Extensions to `bbEntitySchemas.test.ts` — phone min-digits, policy length cap,
  intake-field dedupe, hours weekly accepted, faq service accepted.

## Files of note

- `src/lib/business-brain/csvParser.ts` (new)
- `src/lib/business-brain/faqParser.ts` (new)
- `src/lib/business-brain/hoursParser.ts` (new)
- `src/lib/business-brain/entitySchemas.ts` (refined)
- `src/hooks/useBusinessBrain.ts` (+ `useBbIngestCsv`, `useBbIngestFaq`)
- `src/pages/workspace/brain/{KnowledgeBin,SuggestedFacts,ApprovedKnowledge}Page.tsx` (refreshed)
- `supabase/functions/bb-ingest/index.ts` (structured branches + sharpened prompt)
- `docs/business-brain-architecture.md` (Slice 2 sections)

## Still out of scope

ASC integration, retrieval/search, URL crawl execution, live assist, transcript ingestion,
vertical skins, auto-merge/auto-approve.

## Business Brain Phase 2 — ASC Advisory Integration ✅ Shipped

- Bridge selectors (`src/lib/business-brain/selectors.ts`) wired to real `bb_facts` reads + per-step suggestion builders for Steps 3/4/6/7.
- `useBusinessBrainSuggestions` hook + `BbSuggestionTray` component, mounted via a new "Knowledge" tab in `AscSidePanel`.
- `AscWizardPage.applyBbIntent` maps Use clicks → existing ASC actions (`ADD_CALLER_REASON`, `UPDATE_CALLER_REASON`, `ADD_NOTIFICATION_EDIT`, `SET_DESTINATION`). No new reducer actions.
- Step 8 enrichment deferred per scope guards (no clean mapping).
- 4 telemetry events added; flag/QueryClient/Auth missing → silent no-op.
- 21 new tests passing (selectors, tray, reducer invariants, boundary, fork read-only).

## Business Brain Phase 3 — Retrieval & Internal Search (shipped)

Approved scope:
- Additive embedding columns on `bb_facts` + `bb_source_chunks` (vector(1536), HNSW); `bb_search_queries` log.
- `bb-embed` edge function: post-ingest/approve enqueue + admin backfill (Lovable AI `openai/text-embedding-3-small`).
- `bb-search` edge function: fact-primary, chunk-as-evidence, orphan fallback only when no fact covers the query.
- Read-only bridge: `searchApprovedKnowledge`, `triggerBbBackfill`, `BbSearchCard`.
- `/w/:wid/brain/search` page; reusable `BbSourceCard`.
- Privacy-safe telemetry (sanitizer-enforced allowlist; no raw query/snippet text).
- Tests: selectors view-model, source card render+interactions, telemetry sanitizer, ASC↔retrieval boundary.

Out of scope for Phase 3: ASC changes, live assist, transcript ingest, auto-learning, contradiction detection, URL crawl execution, cross-workspace search, ranking learned from feedback.
