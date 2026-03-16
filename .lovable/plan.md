

# Fabric59 Deep Logic & UX Upgrade — Phased Build

## Current State Assessment

Most pages are **already database-backed** from prior merges. What's missing is the **cross-entity wiring** and **contextual depth** described in the spec:

- **TenantsPage**: Works, has partner column, but no partner filter dropdown
- **PartnersPage**: Works, basic CRUD, no branding fields in create/edit
- **PartnerOverviewPage**: Has clients table + integration defaults, but no Billing tab, no Reports tab, no branding config
- **ClientOverviewPage**: Has CRM + webhooks + API logs, but no Scripts tab, no Billing tab, no partner reassignment
- **ReportsPage**: Wired to Five9 call logs, but no partner/client filter dropdowns
- **BillingPage**: Wired to invoices/rates/uploads, fully functional
- **SupervisorPage**: Has Overview + Scripts & Routing + Goals tabs, all wired
- **AgentDashboardPage**: Has tasks + sessions + training + goals, all wired
- **ScriptEditorPage**: CRUD for scripts, works
- **ScriptRoutingPage**: DNIS/campaign mapping CRUD, works

## What Actually Needs Building

### Phase 1: Partner/Client Filtering on List Pages

**TenantsPage** — Add partner filter dropdown above the table:
- "All Partners", "Direct (no partner)", then each partner name
- Filter `filteredTenants` by `partner_id`

**ReportsPage** — Add partner + client filter dropdowns:
- Partner dropdown filters which clients appear in client dropdown
- Pass filters to `useCallLogs` or filter client-side

### Phase 2: Partner Create/Edit with Branding

**PartnersPage** create dialog — Expand from name+slug to include:
- Step 2: Branding fields (logo URL, primary color, from email domain)
- These map to existing `partners` table columns that need to be added

**Database migration**: Add branding columns to `partners`:
- `brand_logo_url text`, `brand_primary_color text`, `brand_from_email text`, `portal_domain text`

### Phase 3: PartnerOverviewPage Tabs

Add tabs to PartnerOverviewPage (currently flat):
- **Overview** (current content: stats + integration defaults + branding config)
- **Clients** (current clients table, moved into tab)
- **Reports** — Embed ReportsPage filters pre-locked to this partner
- **Billing** — Show invoices where `partner_id = current`, summary cards

### Phase 4: ClientOverviewPage Tabs

Restructure into tabs:
- **Overview** (current header + stats + quick actions)
- **Legal Connect** (current CRM connection cards + webhook card)
- **Five9 & Scripts** — Show `campaign_scripts` for this tenant, with add/edit inline
- **Reports** — Link to reports filtered by this client
- **Billing** — Read-only invoices + line items for this client

### Phase 5: Branding Inheritance Preview

Add a small "Effective Branding Preview" card on ClientOverviewPage Overview tab:
- Shows: logo, primary color, from name
- Computed: if `partner_id` → use partner branding merged with client overrides, else use org branding
- Visual: small card with logo chip + color swatch + "From: name@domain"

### Phase 6: Agent Portal Shell

Route `/agent` already exists as AgentDashboardPage. Enhance:
- Add "Current Call" card with empty state "Waiting for call from Five9"
- Add KB articles sidebar (already has training, add KB query)

### Phase 7: Report Templates (New)

New table `report_templates`:
- `id`, `organization_id`, `name`, `report_type` (call_log/agent), `field_config` (JSONB), `filter_config` (JSONB)
- `created_by`, `created_at`, `updated_at`

New tab on ReportsPage: "Templates" — CRUD for report templates with field selection UI.

---

## Implementation Priority

Given scope, I recommend implementing **Phases 1-4** first (filtering + tabs on existing pages), as these deliver the most UX value with minimal new tables. Phases 5-7 can follow.

## File Changes (Phases 1-4)

| File | Change |
|---|---|
| Migration SQL | Add branding columns to `partners`; create `report_templates` table |
| `src/pages/admin/TenantsPage.tsx` | Add partner filter dropdown |
| `src/pages/admin/ReportsPage.tsx` | Add partner + client filter dropdowns |
| `src/pages/admin/PartnersPage.tsx` | Expand create dialog with branding fields |
| `src/pages/admin/PartnerOverviewPage.tsx` | Restructure into tabbed layout (Overview, Clients, Reports, Billing) |
| `src/pages/admin/ClientOverviewPage.tsx` | Restructure into tabbed layout (Overview, Legal Connect, Five9 & Scripts, Reports, Billing) |
| `src/hooks/usePartners.ts` | Update create/update mutations for new branding fields |

