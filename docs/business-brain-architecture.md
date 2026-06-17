# Business Brain — Phase 1 Architecture

Status: **Phase 1 / Slice 2 — Richer ingestion & fact quality shipped.**

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

## CSV / Team Directory Ingestion (Slice 2)

The Knowledge Bin → **Team CSV** tab accepts a `.csv` team directory and
runs a **deterministic** extraction pipeline (no AI) so the resulting
suggestions are predictable, fast, and free.

Flow:
1. Client parses the CSV with `papaparse` and shows a **column mapper**.
   Headers are auto-mapped to canonical fields (`name`, `role`,
   `department`, `phone`, `extension`, `email`, `label`, `notes`, `ignore`)
   via `autoMapHeaders`.
2. The reviewer can override any mapping or set columns to `ignore`.
3. The original file is stored in the `business-brain-sources` bucket for
   provenance.
4. `useBbIngestCsv` invokes `bb-ingest` with
   `{ mode: "structured_directory", rows }`. The edge function bypasses AI
   and inserts deterministic extractions via `rowsToExtractions`.

Deterministic rules (`src/lib/business-brain/csvParser.ts`, mirrored in the
edge function):

| Entity | Emit when |
| ------ | --------- |
| `department` | row has a non-empty `department` (deduped, case-insensitive). |
| `staff` | row's `name` looks like a person (rejects business labels like "Billing Line"). |
| `phone` | row has a phone number with ≥7 digits (deduped on digits). |
| `destination_contact` | **Strict.** Only when the row is NOT a named person AND `label` matches a known business-contact pattern (billing, after-hours, emergency, maintenance, fax, main line, reception, on-call, hotline, etc.). |

A row that blends person + label data is classified as `staff` (+ `phone`)
and never as `destination_contact`. This is asserted by
`bbCsvIngest.test.ts` (`mixed-row regression`).

## Improved FAQ Ingest (Slice 2)

The Paste FAQ tab pre-parses Q/A pairs client-side with `parseFaqText`,
which handles three formats:
- `Q:` / `A:` markers (any of `:`, `.`, `)`, `-` after the letter)
- Numbered lists (`1. Question?\nAnswer…`)
- Blank-line-separated `Question?\nAnswer` paragraphs

When **≥2 pairs** are detected, the edge function skips AI and inserts
`faq` extractions deterministically at confidence 0.9. Otherwise it falls
back to the AI extractor on the raw text so prose-form FAQs still ingest.

The AI extractor may also emit an explicit `service` association on a `faq`,
but only when the source clearly names a reusable service (e.g. "first
consultation"). Loose contextual implication is forbidden by prompt.

## Entity-quality hardening (Slice 2)

- **phone.number**: validator requires ≥7 digits; canonical key strips
  non-digits.
- **hours.weekly**: optional best-effort weekday map. The free-form
  `schedule` text is always preserved; `weekly` is populated only when
  parsing is confident (`hoursParser.parseWeekly`).
- **policy.body**: capped at 500 characters. Long policies must be split.
- **intake_requirement.fields**: transformed to deduped, lowercased list.
- **faq.service**: optional, conservative only.

## Review UX (Slice 2)

Suggested Facts:
- Filters: entity type, source, confidence band (high ≥80%, medium 50–79%,
  low <50%).
- Merge dialog supports a **search box** that finds approved facts of the
  same entity type by `display_name` or `canonical_key`. Key-collision
  candidates are still surfaced automatically and labeled.

Approved Knowledge:
- Free-text search across `display_name` and `canonical_key`.
- Last-reviewed date range filter (7 / 30 / 90 days).
- Per-row source count + latest import date.
- "Snippets" drawer (Sheet) shows every `source_refs[]` entry with its
  source title, import date, and snippet text.

## Merge & duplicate rules

1. Approval **creates a new fact** unless the reviewer explicitly chose a
   merge target in the UI.
2. The server rejects duplicate `canonical_key` with HTTP 409 and returns
   `existingFactId` so the UI can surface the merge dialog.
3. Merge preserves all prior `source_refs` and appends new ones,
   deduplicated on `(source_id, extraction_id, snippet)`.
4. Approved extractions are immutable — re-approve is forbidden.

## Source freshness / versioning

`bb_sources` carries `version`, `prior_source_id`, `content_hash`, and
`status`. The Knowledge Bin renders all four. Re-ingesting the same content
(same hash) is a no-op. Stale-detection logic on `bb_facts` is deferred to
Phase 5.

## Telemetry

Events live in `platform_events` with `source = "business-brain"`:

- `bb_source_added`, `bb_source_processed`, `bb_source_failed`
- `bb_extraction_completed`
- `bb_fact_approved`, `bb_fact_rejected`, `bb_fact_merged`, `bb_fact_edited`

Failures swallow silently and never block UX.

## Out of scope for Slice 2

- ASC integration of any kind. The bridge boundary stays read-only.
- URL crawl execution.
- Retrieval / search / embeddings.
- Live call assist.
- Transcript ingestion.
- Auto-merge or auto-approve heuristics.
- Vertical-specific schemas.

These are reserved for later phases tracked in `.lovable/plan.md`.
