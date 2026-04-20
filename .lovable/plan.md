

# Fabric59 Backend Dashboard Refactor — Two-Tier Shell, Readiness Engine, AI Guidance, Campaign Builder

The current admin shell is a single overloaded vertical rail (38+ items in 6 collapsible groups), table-first content, no contextual sub-nav, no readiness signals, and no in-product Five9 docs surface. This plan replaces that with a modern enterprise control center built around real jobs-to-be-done.

## What the user will see

### 1. New two-tier navigation shell

**Global vertical rail (collapsed by default to icon strip, ~64px)** — 11 top-level destinations only, no nested groups, no scroll on standard viewports:

```text
┌──┬─────────────────────────────────────────────────┐
│⌂ │ Five9 → Campaigns                               │ ← breadcrumb + page title
│👥│ ┌─────────────────────────────────────────────┐ │
│☎ │ │ Overview | Domains | Campaign Builder |     │ │ ← horizontal sub-nav
│⚖ │ │ Campaigns | Variables | Dispositions |      │ │   (sticky, owns local IA)
│📣│ │ Routing | Health | Docs                     │ │
│🤖│ ├─────────────────────────────────────────────┤ │
│⚡│ │                                             │ │
│🧪│ │   Page content (cards, larger spacing,      │ │
│📊│ │   stronger H1/H2, fewer borders)            │ │
│📚│ │                                             │ │
│⚙ │ └─────────────────────────────────────────────┘ │
└──┴─────────────────────────────────────────────────┘
   Overview · Clients · Five9 · Legal Connect · Campaigns ·
   Agents · Automations · Testing · Monitoring · Docs · Settings
```

Rail items expand to text label on hover/pinned state (user preference persisted). Each section owns its own horizontal sub-nav — no item appears in both navs.

### 2. Redesigned Overview / Client dashboard

Replaces the current "Recent agents / Recent clients" tables. New blocks:

- **Setup Progress** — readiness checklist for the active client (Five9 connected · Campaign exists · Variables · Dispositions · Provider connected · Mapping complete · Test passed · Ready to receive calls). Each row clickable to its setup screen.
- **AI Guidance** — "Top 3 next actions" computed from readiness state with one-click jumps and blocker explanations.
- **System Health** — webhook health, event health, sync failures, agent availability (compact metric strip).
- **Live Operations** — active campaigns, recent calls, open review items.
- **Quick Actions** — Create campaign · Connect provider · Run readiness test · Open docs · Start simulation.

### 3. Five9 Campaign Builder (new guided flow)

`/admin/five9/campaign-builder` and `/admin/five9/campaign-builder/:draftId` — six-step wizard with persistent draft (`campaign_builder_drafts` table). Each step has its own validation, AI panel, and Docs panel:

1. **Basics** — name, type, domain, queue/profile, client, provider target
2. **Call Variable Group** — create/choose group, define variables (label, type, default, required)
3. **Campaign Profile** — pick which variables agents see/edit (preview of agent worksheet)
4. **Dispositions** — create/choose, map to action chains
5. **Routing** — campaign→client→provider, screen-pop, callback, review fallback
6. **Readiness Test** — checklist + simulation run; status: Draft · Configured · Testing · Ready

Final state writes to `five9_campaign_routes`, `five9_call_variable_groups`, `legal_connect_disposition_mappings` (already in schema).

### 4. AI Guidance panel (right rail, context-aware)

Toggleable side rail (not just floating button). Reads URL + readiness state and generates next-step guidance via `assistant-chat` edge function with new `context` payload (current page, client, campaign, readiness signals). Produces:

- Current state summary
- Top 3 recommended actions (each is a clickable CTA)
- Blocker explanations
- Links to relevant Five9 docs

### 5. Five9 Docs panel (right rail, context-aware)

Drawer next to the AI panel. Curated mapping of route → Five9 doc topics seeded into `five9_docs_index` (title, summary, official URL, "why this matters", checklist items). Topics covered: campaigns, campaign profiles, call variable groups, call variables, dispositions, IVR scripts, web connector. Each card: AI summary · Why it matters · Checklist · Open official doc.

### 6. Readiness engine

New `src/lib/readiness/` module + view `v_campaign_readiness` (and `v_client_readiness`). Pure compute, no new tables — derives from existing rows:

- `five9_domains` (connected?)
- `five9_campaign_routes` (exists, has `connection_id`, has `call_variable_group_id`?)
- `five9_call_variable_groups` + `_call_variables` (configured, required marked?)
- `legal_connect_disposition_mappings` (configured?)
- `legal_connect_connections` (active for provider_target?)
- `five9_event_log` (any successful test?)

Output: `{ status: 'not_started' | 'in_progress' | 'blocked' | 'test_ready' | 'ready', signals: {...}, blockers: [...], next_action: {...} }`. Drives dashboard cards, AI guidance, banners, quick actions.

## Technical breakdown

### Files

**New (~14):**
- `src/components/layout/AdminShell.tsx` — replaces `AdminLayout`, two-tier shell with collapsible icon rail
- `src/components/layout/SectionTabs.tsx` — sticky horizontal sub-nav driven by route config
- `src/config/navigation.ts` — single source: global sections + per-section sub-nav definitions
- `src/components/dashboard/ReadinessChecklist.tsx`
- `src/components/dashboard/AIGuidanceCard.tsx`
- `src/components/dashboard/QuickActionsGrid.tsx`
- `src/components/dashboard/SystemHealthStrip.tsx`
- `src/components/assistant/GuidancePanel.tsx` — right-rail context-aware AI (reuses streaming logic from `AssistantButton`)
- `src/components/docs/Five9DocsPanel.tsx` — right-rail docs drawer
- `src/lib/readiness/computeCampaignReadiness.ts`
- `src/lib/readiness/computeClientReadiness.ts`
- `src/data/five9DocsIndex.ts` — curated topic→doc map (no scraping; static curated)
- `src/pages/admin/CampaignBuilderPage.tsx` — six-step wizard shell
- `src/components/campaign-builder/{StepBasics,StepVariables,StepProfile,StepDispositions,StepRouting,StepReadiness}.tsx`

**Edited (~6):**
- `src/App.tsx` — swap `AdminLayout` for `AdminShell`; add `/admin/five9/campaign-builder` routes
- `src/pages/admin/UserDashboardPage.tsx` — new block layout (readiness · AI · health · ops · actions); keep "recent" data as one collapsed accordion
- `src/pages/admin/ClientOverviewPage.tsx` — same redesign scoped to one client
- `src/components/assistant/AssistantButton.tsx` — keep floating button, but it now opens `GuidancePanel` in side-rail mode when a context exists
- `supabase/functions/assistant-chat/index.ts` — accept optional `context` (page, clientId, campaignId, readinessSignals) and prepend a context block to the system prompt
- `src/integrations/supabase/types.ts` — auto-regenerated after migration

**1 migration:**
- `campaign_builder_drafts` table (id, user_id, client_id, current_step, payload jsonb, status, timestamps; RLS scoped to user + org)
- View `v_campaign_readiness` (campaign_route_id → signal columns + computed status)
- View `v_client_readiness` (client_id → aggregate signals)
- No changes to existing tables

### Navigation map (final IA)

```text
Global rail              Section sub-nav
─────────────────────────────────────────────────────────────
Overview              →  Dashboard · Activity · AI Guidance
Clients               →  All Clients · Partners · Onboarding
Five9                 →  Overview · Domains · Campaign Builder ·
                         Campaigns · Variables · Dispositions ·
                         Routing · Health · Docs
Legal Connect         →  Overview · Connections · Webhooks ·
                         Mappings · Policies · Testing · Health
Campaigns             →  Active · Drafts · Blueprints · Archive
Agents                →  Roster · Provisioning · Supervisor · QA
Automations           →  Post-Call · Email Templates · ANI Block ·
                         Callback Queue · Abandon Rate
Testing               →  Test Console · Simulations · Replay · Failures
Monitoring            →  API Logs · Webhooks · Sync Jobs · Notifications
Docs                  →  Five9 Concepts · Knowledge Base · Build Outline
Settings              →  Workspace · Billing · Integrations · Design System
```

Items currently in the sidebar that become sub-nav children (no longer top-level): Domains, Agents, Dispositions, Blueprints, Reports, Field Mappings, Scripts/ScriptFlow/Scripter, Goals, Training, Knowledge Base, Call Flow Builder, ANI Block List, Callback Queue, Abandon Rate, Identity, Data Plane, Utilities, Notifications, Feedback, Design System.

### Visual system updates (applied in shell + cards)

- Container max-width 1440px with `px-8` (current is `px-6` edge-to-edge)
- Card padding bumped from `p-6` to `p-8`; gap from `gap-4` to `gap-6`
- H1 `text-3xl tracking-tight`; H2 `text-xl`; muted body `text-sm`
- Status pills replace ad-hoc badges via existing `StatusBadge`
- Sticky section tabs use `border-b` only (no boxed tabs), active state = 2px primary underline
- Empty states get iconography + AI-suggested next action

### AI guidance — context payload

```json
{
  "page": "/admin/five9/campaign-builder/abc/dispositions",
  "clientId": "...",
  "campaignDraftId": "...",
  "readinessSignals": {
    "domain_connected": true,
    "variables_configured": true,
    "dispositions_count": 3,
    "dispositions_required": 5,
    "blockers": ["missing_disposition:Qualified Lead"]
  }
}
```

The edge function prepends this as a structured system message, then runs the existing knowledge-base RAG. No new function required.

### Five9 docs index (curated, static)

Hand-curated topic file mapping ~12 Five9 admin concepts to: official URL · 2-sentence "why this matters" · 3-5 item checklist. Surfaced contextually based on current route. (No live scraping — Five9 docs aren't a stable feed; static curated content with periodic manual refresh is more reliable and faster.)

### Readiness engine — view shape

```sql
CREATE VIEW v_campaign_readiness AS
SELECT
  r.id AS route_id, r.client_id, r.tenant_id,
  (d.id IS NOT NULL) AS domain_connected,
  (r.call_variable_group_id IS NOT NULL) AS variable_group_assigned,
  (SELECT COUNT(*) FROM five9_call_variables v WHERE v.group_id = r.call_variable_group_id) AS variable_count,
  (SELECT COUNT(*) FROM legal_connect_disposition_mappings m WHERE m.campaign_id = r.id) AS disposition_count,
  (r.connection_id IS NOT NULL) AS provider_connected,
  (SELECT COUNT(*) FROM five9_event_log e WHERE e.matched_route_id = r.id AND e.status = 'success') AS successful_event_count,
  CASE
    WHEN d.id IS NULL THEN 'blocked'
    WHEN r.call_variable_group_id IS NULL THEN 'in_progress'
    WHEN r.connection_id IS NULL THEN 'in_progress'
    WHEN (SELECT COUNT(*) FROM five9_event_log e WHERE e.matched_route_id = r.id AND e.status = 'success') = 0 THEN 'test_ready'
    ELSE 'ready'
  END AS status
FROM five9_campaign_routes r
LEFT JOIN five9_domains d ON d.id = r.five9_domain_id;
```

`security_invoker = true` so RLS on underlying tables applies.

## Out of scope (honest)

- Real-time scraping of Five9 docs site (using curated index instead)
- Replacing every existing admin page individually — this refactor changes the shell, dashboard, and adds Campaign Builder; existing pages render as-is inside the new shell with only their route categorized into the new sub-nav
- Streaming the AI guidance side-rail (uses existing non-streaming `assistant-chat` invoke for simplicity in v1; can upgrade later)
- Full React Tour for the new shell (a single "What changed" banner shown once is enough)

## Acceptance

- Vertical rail shows 11 items max, never scrolls on 1080p
- Every section route has its own sticky horizontal sub-nav
- Dashboard leads with Readiness + AI Guidance, not raw tables
- Campaign Builder takes a draft from blank to a `ready` row in `v_campaign_readiness`
- AI Guidance panel reads readiness signals and proposes next actions on every Five9 / Legal Connect screen
- Five9 Docs panel surfaces relevant topic cards based on current route
- No nav item is duplicated between global rail and horizontal sub-nav
- Existing pages (logs, agents, mappings, etc.) load inside the new shell without modification

