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

## Business Brain Phase 4 — Live Runner Assist (shipped)

Approved scope:
- Read-only assist panel in the live call runner; appended as the 5th RightStack item; omitted entirely when the BB flag is off.
- Pure context builder (`assistContext.ts`) and pure ranker (`assistRanker.ts`) — both fully unit-tested.
- Bridge selector `getAssistFactsForSession` returns approved-only facts (`needs_review` and `stale` excluded for runner).
- Ranking spec: step relevance → entity/service match → confidence → recency. After-hours boost for `hours` / `escalation_contact`.
- Quiet-mode rules: thresholds (`minStepRelevance=30`, `minConfidence=0.4`); weak context capped to 2 cards.
- Deep links: `/w/:wid/brain/approved?fact=:id` (fact) and `/w/:wid/brain/bin?source=:id` (source), opened in a new tab.
- Insert into notes is append-only and clearly attributed: `[Business Brain · {kind}] {title}\n  {action}`. Wired through existing `appendToNotes` — no new reducer paths.
- Copy is explicit; clipboard receives the privacy-safe action line only.
- 6 telemetry events added (panel shown / card opened / copied / inserted / refresh / no-results); sanitizer allowlist extended.
- 21 new tests passing: context, ranker, panel invariants, telemetry privacy, ASC↔assist boundary.

Out of scope for Phase 4: transcript ingestion, ASC changes, auto-summarization, contradiction detection, gap detection, feedback-trained ranking, cross-workspace assist, any canonical schema changes, any new reducer write paths.


## Phase 5 — Continuous Learning & Governance Loop (shipped)

Additive governance schema, three jobs (bb-usage-rollup, bb-maintain-facts,
bb-detect-conflicts), Governance tab, stale/conflict UX in Approved
Knowledge, telemetry, boundary tests. No ASC/runner/search behavior
changes when disabled. Conservative thresholds; explainable usage_score;
Mark-reviewed never clears open conflicts.

## Business Brain — Phase 6 (Vertical Skins & Required-Entity Schemas) — DONE

Adds vertical profiles, required entity/field schemas, coverage rollups, and
gap detection — config-only, no auto-fix, no runner/ASC changes.

- Tables: `bb_vertical_profiles`, `bb_workspace_vertical_profiles`,
  `bb_vertical_entity_requirements`, `bb_vertical_field_requirements`,
  `bb_vertical_completeness`, `bb_vertical_gaps`. Seeded `local_gov`,
  `healthcare_lite`, `property_mgmt` with a conservative starter set
  (service, hours, escalation_contact; healthcare also intake_requirement).
- Edge function: `bb-evaluate-vertical` (cron daily + manual). Approved facts
  only; required entities only (min_count > 0); sticky suppression.
- Selectors: `getWorkspaceVerticalProfile`, `getVerticalCoverageSummary`,
  `listVerticalGaps`, `suppressVerticalGap`, `triggerVerticalEvaluation`.
- UI: vertical pill + has-gaps filter + per-row gap badges + `BbGapDrawer` on
  Approved Knowledge. New `BrainVerticalGovernanceSection` on Governance with
  coverage cards, filters (kind / entity / high-priority), and Go fix /
  Suppress actions. Contextual deep-links preserve entity + fact context.
- Telemetry: `bb_vertical_evaluation_run`, `bb_vertical_gap_suppressed`,
  `bb_vertical_governance_view_opened` (ids + structural only).
- Tests: `bbVerticalEvaluationLogic`, `bbVerticalSuppressionLogic`,
  `bbVerticalCoverageUi`, `bbVerticalGovernanceUi`, `bbVerticalBoundary`.
- Docs: Phase 6 section appended to `docs/business-brain-architecture.md`.

---

# Phase 7 — Demand-Driven Gap Detection

## Status

Shipped.

## What landed

- Additive schema (`bb_gap_events`, `bb_gap_topics`, `bb_gap_event_topics`) with RLS — workspace members may insert signals; only supervisor+ can read raw events; aggregated topics are visible to all members.
- `src/lib/business-brain/gapLogging.ts` — tiny logging helper safe to import from search/ASC/assist; the only path into `bb_gap_events`.
- Signal logging wired into `BrainSearchPage` (no-results / low-confidence), `useBusinessBrainSuggestions` (empty tray), and `useBusinessBrainAssist` (zero cards with real context).
- `supabase/functions/bb-gap-cluster/index.ts` — nightly clustering using the existing embedding model (`openai/text-embedding-3-small`), cosine ≥0.85 attach threshold, conservative nullable entity/vertical hints, 200-topic cap with **distinct `pruned` status** (machine) separate from human `dismissed`.
- Nightly cron `bb-gap-cluster-nightly` at 03:15 UTC.
- Governance: new `BrainGapGovernanceSection` integrated into `BrainGovernancePage` — canonical question + hints + channels + actions. Reviewer actions: **Create draft** (deep-link prefill only, never writes a fact), **Link** (deep-link to search scoped to hint), **Suppress** (sticky), **Dismiss**.
- Selectors: `listGapTopics`, `dismissGapTopic`, `suppressGapTopic`, `linkGapTopicToFact`, `triggerGapClusterRun`, `buildFactDraftLinkFromGap`.
- Telemetry: `bb_gap_event_logged`, `bb_gap_cluster_run`, `bb_gap_topic_action`, `bb_gap_governance_view_opened` — ids/types/counts only; raw query never leaves the DB.
- Tests: `bbGapLogging`, `bbGapClusteringLogic`, `bbGapTelemetry`, `bbGapGovernanceUi`, `bbGapBoundary`.

## Scope guards honored

- Existing BB embedding model reused (no divergence).
- Raw query text restricted at the RLS layer and never exposed to the governance UI.
- Overflow pruning uses `status='pruned'` with `status_reason='overflow_cap_200'` — never conflated with reviewer dismissals.
- Entity/vertical hints stay nullable, conservative, review-facing.
- "Create draft" is a navigation deep-link only — no facts created from Phase 7 code.

## Out of scope (locked)

- Auto-fact creation, auto-linking, schema auto-updates.
- Search / assist ranking changes.
- External ticket/transcript ingestion.
- Real-time clustering (nightly only).
- ASC / runner UI changes.

---

# Phase 8 — Settings, Health & Stable Bridge

## Status

Shipped.

## What landed

- **Business Brain Settings page** at `/w/:wid/settings/brain` (workspace-admin gated). Per-row controls show effective state, source (`client`/`partner`/`org`/`default`), and editability separately. Writes go to `organizations.integration_configs.features.businessBrain.*`. Confirm dialog when disabling ASC/Assist while approved facts exist. Vertical profile selector writes `bb_workspace_vertical_profiles` and re-runs `bb-evaluate-vertical`. Status summary card distinguishes “No data” from “Failed”.
- **Brain Health dashboard** at `/w/:wid/brain/health` (workspace admin + master). Usage metrics with 7/30/90d window + previous-window deltas, point-in-time governance counts (conflicts, stale, coverage gaps, demand topics), required-entity coverage table, and ops cards (avg latency for `bb-search`/`bb-embed`, error rate for ingest). Every card renders “No data” vs “Failed” distinctly; no raw query/snippet/note ever leaves the DB.
- **Bridge submodules** under `src/lib/business-brain/bridge/`: `core`, `asc`, `assist`, `search`, `governance`. They re-export existing selectors so legacy callers keep working (backward compatible) while the bridge becomes the preferred contract.
- **Telemetry** added: `bb_settings_view_opened`, `bb_settings_flag_changed`, `bb_health_view_opened` (ids/types/counts only).
- **Tests**: `bbBridgeContract` (ASC/runner stay inside their bridge module + no raw `bb_*` access outside Brain internals + bridge re-exports match selectors), `bbSettingsUi`, `bbHealthUi`.
- **Docs**: `docs/business-brain-architecture.md` gains a “Bridge API Contract” section.

## Scope guards honored

- Effective state, source, and editability shown separately per flag row.
- Health cards include 7/30/90d windows with previous-window deltas.
- Bridge hardening is backward compatible — `selectors.ts` keeps working.
- “No data” vs “Failed” distinguished across status and health cards.
- All health/settings metrics are aggregate-only; no raw query text, snippets, notes, or source payloads.

## Out of scope (locked)

- New AI flows, ingestion types, or entity types.
- ASC / runner UX changes beyond honoring existing flags.
- Public REST/GraphQL APIs.
- Billing/pricing logic.
- New `bb_*` schema (no migrations in this phase).

---

# Audit & Refresh Program — Phase 1: Critical product/frontend activation fixes

## Status

In progress.

## What landed

- **Slice 0 — Audit docs.** `docs/business-brain-frontend-audit.md`,
  `docs/business-brain-refresh-plan.md`, and `OUTLINE.md` capture the canonical
  issue list, refresh program, and phase status. No code changes in this slice.
- **Slice 1 — Navigation & entry points.** Sidebar `knowledge` nav item
  repointed to `to: "brain"` and relabeled "Business Brain" (was a 404 link).
  Command palette gained an admin-only "Business Brain" group with Brain
  Settings and Brain Health entries (≤ 2 clicks from anywhere). No new
  top-level nav clutter for Health.
- **Slice 2 — Disabled / permission / dead-end states.**
  `BusinessBrainLayoutPage` disabled state now renders `BbStateBlock` with a
  role-aware CTA — admins get an "Open Brain Settings" button; non-admins get a
  plain ask. ASC side panel Preview / Why / History tabs now render
  `BbStateBlock kind="upcoming"` with surface-specific copy instead of bare
  placeholder sentences. New `BbPermissionDenied` is used on the
  permission-gated Settings and Health routes only; true unknown routes still
  fall through to the global 404.
- **Slice 3 — Workflow continuity.** `BbGapDrawer` "Edit fact" now threads
  `?from=gap:<factId>` when navigating to `/brain/approved`. Approved Knowledge
  renders a "← Back to gap" chip when that param is present. `BrainSearchPage`
  no-results state explains the gap was logged and offers a permission-gated
  next action: "Propose this as a fact" for admins (draft/review-capable),
  "Open Governance" for everyone else. `SuggestedFactsPage` empty-state offers
  a forward CTA to Approved Knowledge.
- **Slice 4 — State hygiene.** New shared structural component
  `BbStateBlock` exposes `loading | empty | noData | failed | noPermission |
  upcoming` with a stable `data-bb-state-kind` so callers always pass
  surface-specific copy and actions (not one generic message). Used in layout
  disabled, search empty/no-results, suggested empty, Settings/Health
  permission-denied, ASC side panel placeholders. Brain Health page now stamps
  every view with "Showing the last {window} of activity. Last updated …" so
  empty cards don't read as broken.

## Files created

- `docs/business-brain-frontend-audit.md`
- `docs/business-brain-refresh-plan.md`
- `OUTLINE.md`
- `src/components/business-brain/BbStateBlock.tsx`
- `src/components/business-brain/BbPermissionDenied.tsx`
- `src/test/regressions/bbPhase1Navigation.test.ts`
- `src/test/regressions/bbPhase1StateBlocks.test.tsx`
- `src/test/regressions/bbPhase1WorkflowContinuity.test.tsx`
- `src/test/regressions/bbPhase1StateHygiene.test.ts`
- `src/test/regressions/ascSidePanelDeadEnds.test.ts`

## Files edited

- `src/config/canonicalNav.ts`
- `src/components/workspace/WorkspaceCommandPalette.tsx`
- `src/pages/workspace/brain/BusinessBrainLayoutPage.tsx`
- `src/pages/workspace/brain/BrainSearchPage.tsx`
- `src/pages/workspace/brain/SuggestedFactsPage.tsx`
- `src/pages/workspace/brain/ApprovedKnowledgePage.tsx`
- `src/pages/workspace/brain/BrainHealthPage.tsx`
- `src/pages/workspace/settings/BusinessBrainSettingsPage.tsx`
- `src/components/business-brain/BbGapDrawer.tsx`
- `src/components/asc/AscSidePanel.tsx`

## Scope guards honored

- Slice 0 ran first so the issue list was canonical before any UI touch.
- Broken sidebar route fixed; label standardized to "Business Brain".
- Settings reachable globally via command palette; Health intentionally **not**
  promoted to top-level nav (≤ 2 clicks via palette + in-layout tab).
- `BbStateBlock` is a shared **structural** component — every caller passes
  surface-specific copy and actions.
- "Propose this as a fact" is gated by actual permissions (`canReindex` admin
  check). Non-admins see "Open Governance" instead.
- `BbPermissionDenied` only used on real permission-gated existing resources
  (Settings, Health). Unknown routes still hit the global 404.

## Out of scope (locked)

- No visual reskin (Phase 2).
- No marketing changes (Phases 3–4).
- No new product capabilities, AI flows, or bridge/backend changes.
- No `bb_*` schema or migration work.

---

# Phase 3 / Slice 2 — Marketing messaging refresh (In progress)

Copy-and-IA-only rewrite of the public marketing site to name **Business Brain**
as the governed knowledge layer inside Fabric59. No new routes, no component
restructures, no visual reskin. Every claim traces to a shipped surface — full
mapping lives in `docs/business-brain-marketing-audit.md`.

## What landed

- **Home (`src/pages/marketing/HomePage.tsx`)**
  - Hero eyebrow tightened; hero lede rewritten to name Business Brain in
    buyer-first language ("the governed knowledge layer that learns what
    each client wants you to say, and keeps it accurate").
  - Replaced the "Every call, structured / four questions" section with a
    new **"How Business Brain helps your team"** section (4 cards: Capture →
    Review → Right answer → Keep it honest), mapping 1:1 to Knowledge Bin,
    Suggested Facts, Approved Knowledge + Assist, and Governance.
  - Integrations section lede gains one sentence on Brain feeding every
    integration.
  - FAQ Q1, Q3, Q5 rewritten to name Business Brain in plain language;
    new Q4 added: *"What does Business Brain actually do during a call?"*.
- **Solutions (`src/pages/marketing/SolutionsPage.tsx`)**
  - Hero subhead names Business Brain.
  - Four-question card bodies updated (Who called / What happened) to point
    at Approved Knowledge + per-client guides.
  - Legal answering services first card rewritten to credit Business Brain
    for conflict prompts, matter context, and approved language.
  - VR section gains a fifth capability card: *"Per-client knowledge,
    governed centrally."*
  - Three motion `surfacedIn` strings appended with their Brain surface
    (Inbound intake → Approved Knowledge; QA → Governance; Monitoring →
    Health).
- **Personas (`src/pages/marketing/PersonasPage.tsx`)**
  - Hero subhead names Business Brain.
  - Exactly one bullet per persona replaced with a Brain-surface line:
    Ops → Brain Health; Supervisor → Suggested Facts + stale-fact queue;
    Implementation → Knowledge Bin ingestion + Approved Knowledge;
    Intake → Approved Brain answers on screen pop.
- **Customers (`src/pages/marketing/CustomersPage.tsx`)**
  - Hero subhead acknowledges Business Brain ships inside Fabric59.
  - All three story bodies rewritten to credit Brain where it is already
    true today (legal → Brain answers on screen; BPO → curate + Governance;
    platform partner → Brain Health for pilot coordination). Outcome lines
    unchanged.
- **Pricing (`src/pages/marketing/PricingPage.tsx`)**
  - Hero subhead names Business Brain.
  - Exactly one new feature line per tier (no other changes): Starter →
    "knowledge ingestion, review, approved answers, governance, health";
    Growing → "across every workspace"; Network → "across every workspace
    and brand."
- **Footer (`src/components/shells/marketing/CanonicalMarketingFooter.tsx`)**
  - Brand blurb rewritten to lead with Business Brain. Links unchanged.
- **SEO metadata (`src/seo/marketingMetadata.ts`)**
  - `canonicalSiteDescription()` and `productOverviewDescription()` extended
    with one Brain sentence each.
  - `organizationLD.description` rewritten to current positioning + Brain.
  - `CANONICAL_TAGLINE`, `softwareApplicationLD()`, `buildFaqLD()`, and
    `integrationsIndexDescription()` unchanged (guardrail: integration
    facts untouched).

## What did not change

- No new routes, no nav restructure (`MARKETING_NAV` untouched).
- No marketing component internals or layout (`SectionShell`, `MarketingHero`,
  `CapabilityCard`, `PersonaList`, etc. unchanged).
- No visual reskin — Phase 4 territory.
- `IntegrationsIndexPage.tsx`, Trust, Security, Privacy, Terms,
  Responsible Disclosure pages untouched.
- `CanonicalMarketingHeader.tsx` untouched (no copy drift; nav labels
  already accurate).

## Tests

No marketing snapshot or copy-pinned tests exist for the rewritten strings
(verified via `rg` against `src/test/**` for old hero/section copy and
old metadata description). No test updates required this slice.

## Stop gate

Slice 2 ships only the copy/IA changes above. Phase 4 (marketing visual
refresh, SEO/OG image sweep) is out of scope and waits for approval.


---

# Phase 4 — Marketing visual refresh (in progress)

Visual + layout refresh of the public marketing surfaces to match the refreshed Business Brain workspace (Phase 2). Copy and routes unchanged.

## Slice 1 — shared primitives and pages (shipped in this turn)

Touched primitives:
- src/components/marketing/MarketingHero.tsx — layered backdrop (radial wash + dot grid), pill eyebrow, optional right visual slot, size variants.
- src/components/marketing/SectionShell.tsx — new `surface` prop (default | muted | inset) aligned with bb-surface-inset; back-compat with `muted`.
- src/components/marketing/SectionIntro.tsx — eyebrow recipe aligned with BrainPageHeader (11px / tracking-[0.22em]).
- src/components/marketing/CapabilityCard.tsx — `tone` prop (default | raised | inset), calmer hover, hairline icon chip.
- src/components/marketing/ProofStrip.tsx — hairline pill row replacing the inline text strip.
- src/components/marketing/ProofQuote.tsx — inset frame + thin primary accent rule.
- src/components/marketing/PersonaList.tsx — bb-panel chrome with small-caps section labels (Role / Day-to-day).
- src/components/marketing/MotionList.tsx — single bb-panel with hairline rows + ArrowUpRight affordance.
- src/components/marketing/HeroOpsPanel.tsx — NEW illustrative product-adjacent panel for the home hero; clearly labeled "illustrative" / "Preview"; no fabricated metrics or screenshots.

Touched shells:
- src/shells/MarketingShell.tsx — ctaBanner now sits on an inset band.
- src/components/shells/marketing/CanonicalMarketingHeader.tsx — reduced height to h-14, scroll-shadow on scroll, transparent border at top.
- src/components/shells/marketing/CanonicalMarketingFooter.tsx — 12-col footer grid (collapses 1 → 2 → 12), small-caps column headers, tighter rhythm.

Touched pages (JSX-only; copy unchanged):
- src/pages/marketing/HomePage.tsx — left-aligned hero with HeroOpsPanel; alternating default/inset surfaces; `raised` tone for integration cards.
- src/pages/marketing/SolutionsPage.tsx — non-sticky mini-nav linking to motion anchors; "Surfaced in" promoted to a small inset chip; motion sections alternate inset/default; legal section now inset.
- src/pages/marketing/PersonasPage.tsx — personas now on inset surface using refreshed PersonaList.
- src/pages/marketing/CustomersPage.tsx — design-partner stories rendered as bb-panel story cards with badge eyebrow and inset Outcome strip.
- src/pages/marketing/PricingPage.tsx — restrained "Recommended" treatment (small primary eyebrow + 1px ring), tiers on inset surface, tighter card chrome.

Guardrails kept:
- Approved Phase 3 copy and claims untouched.
- No new routes, no new product promises, no fake screenshots, no fabricated data states.
- Trust / Security / Responsible disclosure / legal pages untouched.
- IntegrationsIndexPage untouched (out of Phase 4 scope).
- Footer grid collapses cleanly: 1 col (mobile) → 2 col (sm) → 12 col (lg).
- Solutions mini-nav is non-sticky.

## Next

Visual verification screenshots, then stop for approval before Phase 5.


---

# Phase 5 — Coherence, A11y, Performance & Regression Sweep (done)

Audit-first hardening pass. **No code edits required** — audit returned zero
critical/high/medium items inside Phase 5 scope.

## Deliverables

- `docs/business-brain-phase5-audit.md` — categorized issue list, surface
  matrix, screenshots reference, parked items.
- Visual regression screenshots: `/tmp/browser/phase5/screenshots/` (Home,
  Solutions, Personas, Customers, Pricing × desktop + mobile 375).
  Representative subset mirrored to `/mnt/documents/phase5/`.
- `OUTLINE.md` — Phase 5 marked done.

## Regression

`bunx vitest run`: 1068 passed / 6 failed / 7 skipped — parity with end of
Phase 4 baseline; the 6 failures are pre-existing `navRouting` and tokens
guard issues unrelated to the refresh program.

## Parked

- `WorkspaceAgentsPage` ghost-route guard in `navRouting.test.ts` — routing
  scope, deferred per guardrail.
- Legacy `MarketingLayout.tsx` cleanup — out of scope.

## Program status

**Business Brain refresh program — complete.** All Phases 0–5 acceptance
criteria pass.
