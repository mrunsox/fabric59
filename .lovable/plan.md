

# Fabric59 IA Completion — Hub Pages, Operational Dashboards, Builder Split

The two-tier shell, readiness engine, AI Guidance, Docs panel, dashboard cards, and a working Campaign Builder already exist. This plan fills the **specific page gaps** in the IA spec so the navigation no longer points to placeholders and every section has a purpose-built landing page.

## What the user will see

### 1. Section overview hubs (3 new pages)

Each top-level section (Five9, Legal Connect, Campaigns) gets a dedicated **Overview** page so the sub-nav's first tab is meaningful instead of redirecting.

- **`/admin/five9`** — Five9 hub: domain count + health, campaign count by readiness state, variables/dispositions counts, AI guidance card, "Create campaign" + "Connect domain" CTAs.
- **`/admin/legal-connect/overview`** — provider connection grid (Clio · MyCase · Smokeball with connected/pending/missing badges), webhook health, recent sync failures, AI guidance.
- **`/admin/campaigns/overview`** — operational board: active routes, drafts in progress, ready vs blocked split, recent events strip.

### 2. Campaigns operational sub-pages (3 new pages)

Replace the placeholder routes in `Campaigns` sub-nav with real pages:

- **Drafts** (`/admin/campaigns/drafts`) — list of `campaign_builder_drafts` for this org with "Resume" button → `/admin/five9/campaign-builder/:draftId`. Shows current step, last touched, owner.
- **Readiness** (`/admin/campaigns/readiness`) — board view of every `v_campaign_readiness` row grouped by status (Not started · In progress · Blocked · Test ready · Ready). Each card → campaign overlay.
- **Event Log** (`/admin/campaigns/event-log`) — filtered `five9_event_log` table with status pills, campaign filter, time-range filter (reuses existing `EventLogViewer` if available; otherwise a compact table).

### 3. Testing & Monitoring area landings (2 new pages)

- **`/admin/testing`** — landing for Testing area with cards linking to: Test Console (existing), Simulations (link to campaign overlay sim tab), Replay (existing), Failures (filtered event log).
- **`/admin/monitoring`** — landing with cards: API Logs, Webhooks (filtered logs), Sync Jobs, Alerts (link to Notifications), Review Queue.

These avoid empty 404s when users click the section icon before picking a sub-tab.

### 4. Unified Docs Hub (1 new page)

- **`/admin/docs`** — replaces the bare KB redirect. Shows `Five9DocsPanel` content inline (all topics, search), tabs for Five9 · Legal Integrations · Setup Guides · Knowledge Base, plus a card linking to the Build Outline.

### 5. Campaign Builder split (refactor 1 file → 7 files)

`CampaignBuilderPage.tsx` currently has all 6 steps inline. Split per spec:

- `src/components/campaign-builder/StepBasics.tsx`
- `src/components/campaign-builder/StepVariables.tsx`
- `src/components/campaign-builder/StepProfile.tsx`
- `src/components/campaign-builder/StepDispositions.tsx`
- `src/components/campaign-builder/StepRouting.tsx`
- `src/components/campaign-builder/StepReadiness.tsx`
- `CampaignBuilderPage.tsx` becomes a thin shell that renders the active step component and owns draft persistence

Each step file accepts `{ payload, updatePayload }` and is independently editable.

### 6. Navigation cleanup

`src/config/navigation.ts` updated so every sub-nav `href` resolves to a real route (Five9 Overview, Campaigns Overview, Drafts, Readiness, Event Log, Testing landing, Monitoring landing, Docs hub, Legal Connect Overview).

## Files

**New (12):**
- `src/pages/admin/Five9OverviewPage.tsx`
- `src/pages/admin/LegalConnectOverviewPage.tsx`
- `src/pages/admin/CampaignsOverviewPage.tsx`
- `src/pages/admin/CampaignDraftsPage.tsx`
- `src/pages/admin/CampaignReadinessBoardPage.tsx`
- `src/pages/admin/CampaignEventLogPage.tsx`
- `src/pages/admin/TestingHubPage.tsx`
- `src/pages/admin/MonitoringHubPage.tsx`
- `src/pages/admin/DocsHubPage.tsx`
- `src/components/campaign-builder/StepBasics.tsx` + 5 sibling step files

**Edited (3):**
- `src/App.tsx` — register the 9 new routes
- `src/config/navigation.ts` — re-target sub-nav hrefs to real routes
- `src/pages/admin/CampaignBuilderPage.tsx` — replace inline steps with imports of the 6 step components (preserve draft logic, stepper, header)

**No DB changes, no edge function changes, no new components in `dashboard/`** — every new page composes existing primitives (`ReadinessChecklist`, `AIGuidanceCard`, `SystemHealthStrip`, `QuickActionsGrid`, `Five9DocsPanel`, `GuidancePanel`, `Card`, `Badge`, etc.) plus existing data hooks.

## Technical notes

- All hub pages query existing tables: `five9_domains`, `five9_campaign_routes`, `legal_connect_connections`, `legal_connect_disposition_mappings`, `five9_event_log`, `campaign_builder_drafts`, plus the `v_campaign_readiness` / `v_client_readiness` views.
- Drafts page reads `campaign_builder_drafts` filtered by `organization_id`; "Resume" navigates with `draftId`.
- Readiness board reads `v_campaign_readiness` and groups in JS by `status` field.
- Event log page reuses the existing event log query patterns from `CampaignHealthPanel` / `ApiLogsPage`.
- Builder split is mechanical — copy each step's JSX into its own file; the shell still owns `payload`, `stepIdx`, `saveDraft`, `finish`.
- Section icons in `navigation.ts` already include Megaphone (Campaigns), FlaskConical (Testing), Activity (Monitoring), BookOpen (Docs) — no new icons needed.

## Out of scope (honest)

- Building dedicated `Variables` and `Dispositions` admin pages from scratch (existing `DispositionsPage` is reused; variables remain managed inside the Campaign Builder + per-campaign overlay panel — adding a global variables manager is a larger feature for a follow-up)
- Dedicated `Routing` standalone page (routing is configured per-campaign inside the campaign overlay; spec's "Routing" sub-tab will redirect to the Campaign Builder Step 5 / overlay)
- New AI Guidance variants (`AIGuidanceDrawer`, `NextBestActionsCard`, etc.) — the existing `GuidancePanel` + `AIGuidanceCard` cover the same surface; renaming/duplicating them would add components without new behavior
- Extracting `ContextDocsPanel` as a separate component — `Five9DocsPanel` already does this and is route-aware
- A separate Five9 Health page (`/admin/five9/health`) — folded into the Five9 Overview hub

## Acceptance

- Every entry in every section sub-nav resolves to a real, purposeful page
- `/admin/five9`, `/admin/legal-connect/overview`, `/admin/campaigns/overview` lead with status + AI guidance + CTAs, not empty tables
- `/admin/campaigns/drafts` lists in-progress drafts and resumes them in the builder
- `/admin/campaigns/readiness` shows campaigns grouped by readiness status
- `/admin/testing` and `/admin/monitoring` are real landing hubs, not redirects
- `/admin/docs` shows the unified docs hub with all Five9 topics inline
- `CampaignBuilderPage` renders correctly after the split with no behavior change

