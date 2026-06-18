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

## Phase 2 — ASC Advisory Integration

Read-only bridge from approved Business Brain facts into the ASC wizard.

### Surface
- **Bridge module**: `src/lib/business-brain/selectors.ts` — `listApprovedFacts`, `getFactSourceRefs`, and per-step builders (`buildCallerReasonSuggestions`, `buildIntakeRequirementSuggestions`, `buildEscalationSuggestions`, `buildDestinationSuggestions`).
- **Hook**: `useBusinessBrainSuggestions({ workspaceId, step, ascDraftId, isReadOnly, ... })` returns `{ enabled, isLoading, isError, suggestions }`. Defensively no-ops when QueryClient or AuthProvider is absent.
- **UI**: `BbSuggestionTray` rendered inside the ASC side panel's new "Knowledge" tab.

### Step mapping (per scope guards)
| Step | Body | Entities | Action dispatched |
|------|------|----------|-------------------|
| 3 | Caller types | `faq`, `service` | `ADD_CALLER_REASON` |
| 4 | Handling | `intake_requirement` | `UPDATE_CALLER_REASON` (appends to first reason's `requiredCapture`; hidden if no caller reasons) |
| 6 | Notifications | `hours`, `escalation_contact` | `ADD_NOTIFICATION_EDIT` |
| 7 | Destination | `phone`, `destination_contact` | `SET_DESTINATION` (deep_link) |

Step 8 metadata enrichment was deferred: no existing ASC action accepts opaque citation metadata, and per scope guards there is no clipboard fallback.

### Ranking & cap
Suggestions are ranked by (1) static per-(step,entity) relevance, (2) `confidence_at_review`, (3) `last_reviewed_at`. Capped at 5 cards per step.

### Telemetry (added to `platform_events`)
- `bb_asc_suggestions_loaded` { ascDraftId, step, count }
- `bb_asc_suggestion_used` { ascDraftId, step, factId, entityType }
- `bb_asc_suggestion_dismissed` { ascDraftId, step, factId, entityType }
- `bb_asc_suggestion_hidden_forked` { ascDraftId, step }

### Invariants
- ASC code imports only `@/lib/business-brain/selectors`; `BbSuggestionTray` and `useBusinessBrainSuggestions` are explicit bridge consumers permitted to import telemetry/flagResolver (allowlisted in `bbBridgeBoundary.test.ts`).
- No new ASC reducer action types were added.
- Post-fork drafts (`selectIsReadOnly`) suppress the tray and emit `bb_asc_suggestion_hidden_forked` once.
- `Use` is the only mutation path; render and dismiss never dispatch.
- When the feature flag is off, the hook is disabled and no telemetry fires.

### Out of scope (deferred)
Step 8 citations, retrieval/embeddings, URL crawl execution, live assist, transcript ingest, gap/contradiction detection, vertical skins, auto-apply, canonical writes.

## Phase 3 — Retrieval & Internal Search

Operator-facing semantic + structured retrieval over approved knowledge,
surfaced inside `/w/:wid/brain/search`. ASC is unchanged in this phase;
there is no live-call assist, no transcript ingest, no auto-learning, and no
ranking learned from feedback.

### Surface
- **DB**: `bb_facts.embedding`, `bb_source_chunks.embedding` (both `vector(1536)`, HNSW cosine), `bb_facts.search_text`, and `bb_search_queries` (privacy-safe operator log).
- **RPCs** (security definer, workspace-scoped via arg): `bb_search_facts`, `bb_search_chunks`.
- **Edge functions**: `bb-embed` (post-ingest + post-approve enqueue, admin-gated `mode: "backfill"`), `bb-search` (query the brain).
- **Bridge**: `searchApprovedKnowledge`, `triggerBbBackfill`, `BbSearchCard` view-models in `selectors.ts`.
- **UI**: `BrainSearchPage` + reusable `BbSourceCard` (`src/components/business-brain/`).

### Ranking
Approved facts are the primary ranking spine; orphan chunks appear only
when no approved fact covers the answer and are de-prioritized by a 0.9
multiplier. Default corpus is `verification_state = 'approved'`;
`includeNeedsReview` is an explicit reviewer/admin opt-in.

### Embeddings
Model: `openai/text-embedding-3-small` (1536 dims) via the Lovable AI
Gateway `/v1/embeddings` endpoint. Each row stores `embedding_model` so
future model migrations can re-embed safely. `bb-ingest` and
`bb-approve-fact` fire a best-effort `enqueue` call to `bb-embed` after
write; failures never block ingest/approval. The Search tab exposes a
"Reindex search" button (org owners/admins or master_admin) that runs a
time-budgeted `backfill` for workspaces with unembedded rows.

### Telemetry (added to `platform_events`)
- `bb_search_query_submitted` { workspaceId, queryLength, filterCount, resultCount, factCount, chunkCount, latencyMs }
- `bb_search_result_opened` { workspaceId, hitKind, rank, factId?, entityType? }
- `bb_search_result_marked` { workspaceId, hitKind, rank, useful, factId?, entityType? }
- `bb_search_reindex_started` { workspaceId, embedTarget }
- `bb_embed_run_completed` { workspaceId, embedTarget, embedded, failed, outcome }

Privacy invariant (enforced by the telemetry sanitizer allowlist and a
regression test): never log raw query text, snippet text, source titles,
or fact payloads. Only structural metadata and interaction signals.

### Invariants
- ASC code must not import `searchApprovedKnowledge`, `triggerBbBackfill`,
  `BbSourceCard`, or `BrainSearchPage` (enforced by
  `bbSearchAscBoundary.test.ts`).
- `BbSourceCard` never mutates governed facts; interactions are local
  (mark useful/not-useful → telemetry only) and do not affect ranking.
- Search is workspace-scoped at every layer (edge function validates
  `has_workspace_role_min(agent)`; RPCs filter by `workspace_id`).
- "Mark useful" feedback is observational in Phase 3 and is NOT fed back
  into ranking. Learned ranking is deferred.

### Out of scope (deferred)
ASC changes, live assist, transcript ingest, auto-learning, contradiction
detection, URL crawl execution, cross-workspace search, ranking learned
from feedback.

---

## Phase 4 — Live Runner Assist

Adds a read-only assist panel to the live call runner that surfaces 0–5
ranked approved-knowledge cards based on the active session context.
Strictly additive: when the BB flag is off, the runner behaves identically
to before; no panel, no network calls, no telemetry.

### Surface
- `useBusinessBrainAssist(meta, session, flow, clientId?)` — runner hook
- `BbAssistPanel` — RightStack item in `LiveCallRunnerPage`
- `assistContext` (pure) — derives `{ stepKind, serviceHints, destinationHints, afterHours, hasContext }`
- `assistRanker` (pure) — scores facts; emits `BbAssistCard[]`
- `getAssistFactsForSession` — bridge selector returning approved facts only

### Ranking spec (approved scope)
1. **Step relevance** — per `(stepKind, entityType)` table; after-hours
   boost lifts `hours` / `escalation_contact` regardless of step.
2. **Entity / service match** — substring match against `serviceHints` /
   `destinationHints` taken from session values.
3. **Confidence** — `confidence_at_review` (default 0.9 when null).
4. **Recency** — `last_reviewed_at`.

### Quiet-mode rules
- `minStepRelevance = 30`, `minConfidence = 0.4`, hard cap = 5.
- Weak context (no step + no hints + not after-hours) → cap = 2.
- Empty state is normal and expected; the panel shows a deep link to
  Business Brain instead.

### Interaction contract (read-only)
- Mounting the panel never mutates ASC, canonical, or runner state.
- **Insert into notes** — APPEND-only, formatted as
  `[Business Brain · {kind}] {title}\n  {action}` so it's clearly
  attributable to assist. Wired through the runner's existing
  `appendToNotes` helper; no new reducer paths.
- **Copy** — writes the privacy-safe action line to the clipboard.
- **Open** — deep links to the fact (`/w/:wid/brain/approved?fact=:id`)
  or source (`/w/:wid/brain/bin?source=:id`) detail view in a new tab.

### Telemetry (added to `platform_events`)
- `bb_assist_panel_shown` { workspaceId, campaignId, stepKind, cardCount }
- `bb_assist_card_opened` { ...stepKind, cardKind, entityType, factId }
- `bb_assist_card_copied` { ...stepKind, cardKind, entityType, factId }
- `bb_assist_card_inserted` { ...stepKind, cardKind, entityType, factId }
- `bb_assist_refresh_triggered` { workspaceId, campaignId, stepKind }
- `bb_assist_no_results` { workspaceId, campaignId, stepKind, reason }

**Privacy invariant** (enforced by sanitizer allowlist + regression):
never log copied text, inserted text, snippets, source titles, fact
payloads, or note content. Structural metadata and ids only.

### Invariants
- ASC must not import any assist surface — enforced by
  `bbAssistBoundary.test.ts`.
- The panel renders nothing when `enabled === false`.
- Insert is append-only and clearly attributed — enforced by
  `bbAssistPanel.test.tsx`.
- Ranker excludes `needs_review` and `stale` facts; runner assist is
  approved-only.

### Out of scope (deferred)
Transcript ingestion, auto-summarization, contradiction detection, gap
detection, feedback-trained ranking, cross-workspace assist, any
canonical schema changes, any new reducer write paths.
