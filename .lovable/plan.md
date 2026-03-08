

# Tenant Overview + Client Overview Pages

## Current State

- **Clients list** (`TenantsPage.tsx`) shows all tenants with stats, search, edit modal, and integration badges
- **CRM Integration Wizard** (`CrmIntegrationWizard.tsx`) lives inside the TenantForm modal with Five9/Clio/MyCase cards
- **Existing hooks**: `useTenants`, `useTenant(id)`, `useApiLogs({ tenantId })`, `useApiLogStats`
- **Routing**: all admin routes under `/admin` in `AdminLayout`
- No dedicated per-client detail page exists; everything is done via the edit modal
- The app uses "Client" terminology (not "Tenant") in the UI per architecture memory

## What We Will Build

### 1. Client Overview Page (`/admin/clients/:id`)

A full-page "control center" for a single client, replacing the need to use the modal for most tasks. Sections:

**Header**: Client name, CRM type badge, status badge, edit/delete actions

**Stats Row** (4 cards): API calls (24h), errors (24h), CRM connection status, active field mappings count

**Three-column layout (on desktop)**:

**Left column — Connection & CRM**:
- Primary CRM connection card (reuses CrmIntegrationWizard's Clio/MyCase cards — extracted as standalone)
- Five9 webhook setup card (extracted from CrmIntegrationWizard)
- Webhook destinations card (Zapier/Make/n8n/etc. from tenant fields)

**Center column — Behavior & Mappings**:
- Call logging behavior card with profile dropdown + override toggles (extracted from CrmIntegrationWizard)
- Field mappings card showing active mapping name + "Open Mapping Builder" link
- Workflow automations card with event toggles (intake_created, call_ended, contact_updated)

**Right column — Activity & Debugging**:
- Recent API logs table (last 10, filtered to this client) with "View All" link to `/admin/logs?tenant=:id`
- Quick actions: "Open Test Console", "Open API Logs"

Data source: `useTenant(id)` for the client, `useApiLogs({ tenantId: id, limit: 10 })` for recent logs, `useFieldMappings` filtered by tenant.

### 2. Refactored CRM Integration Components

Extract the CrmIntegrationWizard's 3 cards into reusable sub-components so they work both in the TenantForm modal AND the new Client Overview page:

- `Five9WebhookCard` — webhook URL, tenant ID, secret generator
- `CrmConnectionCard` — Clio/MyCase toggle, connect button, profile dropdown, rule overrides
- These components accept `configs` + `onChange` props (same interface as now)

`CrmIntegrationWizard.tsx` becomes a thin wrapper that renders these cards inside a Collapsible.

### 3. Route + Navigation Updates

- Add route: `/admin/clients/:id` → `ClientOverviewPage`
- In `TenantsPage.tsx`, make row clicks navigate to `/admin/clients/:id` instead of opening the edit modal
- Keep the edit pencil icon to open the modal for quick edits
- Add breadcrumb: Admin → Clients → [Client Name]

### 4. Types & Hook

Create `src/types/integrations.ts` with typed `IntegrationConfigs`, `ClioIntegrationConfig`, `MyCaseIntegrationConfig`, `Five9OutboundConfig`, and `Five9ToCrmRules` (move from crm-profiles.ts).

Create `src/hooks/useClientIntegrationConfigs.ts`:
- Wraps `useTenant(id)` to extract and type `integration_configs`
- Provides `saveConfigs(next)` that calls `useUpdateTenant` under the hood
- Exposes typed `clioRules`, `mycaseRules`, `isClioConnected`, `isMyCaseConnected`

### 5. No Tenant Overview Page (yet)

The prompt asks for both, but the current architecture treats the org as the tenant. The existing `UserDashboardPage` at `/admin/dashboard` already serves as the tenant-level overview with agent/client/domain stats. Rather than building a separate TenantOverviewPage that duplicates it, we enhance the existing dashboard with:
- A "Five9 Domains" summary card (count + statuses)
- A "Global Integrations" card showing connected system badges
- A "Recent Errors" card with count + link to logs

This keeps the "one-page" design philosophy and avoids creating a redundant view.

## File Changes

| File | Change |
|---|---|
| `src/types/integrations.ts` | New — typed IntegrationConfigs interfaces |
| `src/hooks/useClientIntegrationConfigs.ts` | New — typed config accessor + save helper |
| `src/components/tenants/Five9WebhookCard.tsx` | New — extracted from CrmIntegrationWizard |
| `src/components/tenants/CrmConnectionCard.tsx` | New — extracted Clio/MyCase card |
| `src/components/tenants/CrmIntegrationWizard.tsx` | Refactor to use extracted sub-components |
| `src/pages/admin/ClientOverviewPage.tsx` | New — full client detail page |
| `src/App.tsx` | Add `/admin/clients/:id` route |
| `src/pages/admin/TenantsPage.tsx` | Row click → navigate to client overview |
| `src/components/layout/AdminLayout.tsx` | No sidebar change needed (Clients link stays) |
| `src/pages/admin/UserDashboardPage.tsx` | Add domains summary + global integrations + errors cards |
| `src/data/buildMap.ts` | Add tracking items |

