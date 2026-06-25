## Goal

Mirror the Knowledge Base / Dispositions pattern on the Integrations page so each campaign has its own isolated set of integration connections, while preserving a "Workspace-wide" bucket for shared connections.

## 1. Database migration

Extend `integration_connections`:
- Add `campaign_id uuid NULL REFERENCES public.campaigns(id) ON DELETE CASCADE`
  - `NULL` = workspace-wide (current behavior preserved for existing rows)
  - non-null = scoped to one campaign
- Add index on `(workspace_id, campaign_id)`
- Keep all existing RLS policies (workspace/org scoping already covers it)

No backfill needed — existing rows stay workspace-wide (`campaign_id = NULL`).

## 2. Hook changes (`useWorkspaceIntegrations.ts`)

- Add `campaign_id: string | null` to the `IntegrationConnection` type
- `useCreateIntegrationConnection`: accept optional `campaign_id` and persist it
- `useUpdateIntegrationConnection`: allow patching `campaign_id` (re-scope a connection)
- Reads unchanged — they already return all workspace connections; the page groups client-side

## 3. Page rewrite (`WorkspaceIntegrationsPage.tsx`)

Adopt the same `selection: undefined | null | string` pattern used in KB and Dispositions:

**Index view** (default):
- "Available Providers" block stays at top
- Replace the flat `Connections` list with a card grid:
  - One "Workspace-wide" card (campaign_id = null)
  - One card per campaign from `useWorkspaceCampaigns()`
  - Each card shows: icon, name, connection count, provider badges (first few), last updated
  - New campaigns auto-appear (no manual creation needed — driven by campaigns list)

**Drill-in view** (selection set):
- Back button → returns to grid
- Header: "Workspace-wide integrations" or `<campaign name> integrations`
- Filtered list of connections for that scope (existing connection row UI reused)
- "+ New connection" button opens the existing provider picker; when drilled into a campaign, the new connection is created with that `campaign_id` (locked, shown as "Attaching to: <campaign>")
- Existing connection rows get a small "Move to…" action to re-scope between Workspace-wide / any campaign

`WorkspaceIntegrationDetailPage.tsx` (per-connection page) is unchanged aside from displaying the campaign scope label in its header.

## 4. Out of scope

- Edge function / adapter logic changes (writeback orchestrator, legal-crm-adapter, five9-main) — they continue reading the connection by id; campaign scoping is enforced at the UI/selection layer for now
- Per-campaign credential overrides (still one credential set per connection row)
- Auto-creating a connection per campaign for every provider — campaigns start empty and the user attaches what they need

## Technical notes

- Files touched: `supabase/migrations/<new>.sql`, `src/integrations/supabase/types.ts` (auto), `src/hooks/useWorkspaceIntegrations.ts`, `src/pages/workspace/WorkspaceIntegrationsPage.tsx`, minor label tweak in `WorkspaceIntegrationDetailPage.tsx`
- Reuses `useWorkspaceCampaigns()` already wired in KB/Dispositions
- No grants needed (altering existing table)
