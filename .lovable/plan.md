
## 1. Client create / edit / delete (workspace-scoped)

On the **Clients** page (`WorkspaceClientsPage.tsx`):
- Add a **"+ New client"** button in the header (replaces the Assureway seed button as the primary CTA; seed stays only when list is empty).
- "New client" opens a dialog with: name, CRM type (dropdown, default `other`), status (active/inactive). On save, inserts a `tenants` row scoped to the current `organization_id` + `workspace_id`.
- Each client card gets a kebab menu with **Edit** and **Delete**.
  - **Edit** opens the same dialog prefilled (name, CRM type, status).
  - **Delete** opens a confirm dialog. Soft-blocks if the client is linked to any campaigns ("Unlink campaigns first or archive instead"). Hard delete via `DELETE FROM tenants WHERE id = ...`. ON DELETE SET NULL on campaigns/bb_sources keeps existing rows safe.
- All three flows invalidate `["workspace-clients"]`.

New files:
- `src/components/workspace/clients/ClientFormDialog.tsx` — shared create/edit dialog
- `src/components/workspace/clients/DeleteClientDialog.tsx` — confirm + dependency check
- `src/hooks/useWorkspaceClientMutations.ts` — `useCreateClient`, `useUpdateClient`, `useDeleteClient`

RLS: existing org-admin policies on `tenants` already cover insert/update/delete; no migration needed for CRUD.

## 2. Attach workspace guide to a campaign and/or client

`guides` already has `workspace_id` and `campaign_id`. To also attach to a client, add `guides.client_id uuid references tenants(id) on delete set null` (migration).

UI:
- **Campaign detail page** (`WorkspaceCampaignDetailPage.tsx`): new "Guide" card with a Select listing workspace guides (including the canonical Workspace Guide as a virtual option). Saving updates `guides.campaign_id` for the selected guide, or — when the canonical workspace guide is picked — stamps the campaign's `metadata.workspace_guide_attached = true` and links via `guides.campaign_id` on the canonical guide row.
- **Client detail page** (`WorkspaceClientDetailPage.tsx`): same pattern for `guides.client_id`. Lists currently attached guides with an Unlink action.
- **Workspace Guide page**: after publish, show a small "Attach to…" panel with multi-select of campaigns + clients in the workspace; writes through the same hooks.

New hook: `src/hooks/useGuideAttachments.ts` — `attachGuideToCampaign`, `attachGuideToClient`, `detachGuide`.

## 3. Per-campaign knowledge library ("Library" under each campaign)

Goal: each campaign owns an isolated knowledge bin the AI can fetch from. Reuse the existing `bb_sources` / `bb_source_chunks` pipeline (already powers Business Brain RAG via `bb-embed` + `bb-search`).

### Schema
Migration adds `bb_sources.campaign_id uuid references campaigns(id) on delete cascade` + index `(workspace_id, campaign_id)`. Also extend `bb_search_chunks` RPC with optional `_campaign_id` filter (new function signature, keeping old one for backwards compat).

### UI — new route `/w/:workspaceId/campaigns/:campaignId/library`
Sub-tab inside the campaign detail shell (alongside Overview / Flow / Settings):
- **Upload zone** (reuse `BlueprintFileUpload` pattern → `parse-blueprint-doc` → create `bb_sources` row with `campaign_id` set, `kind='upload'`, then trigger `bb-embed`).
- **URL add** — single-line input that creates a `bb_sources` row with `kind='url'`.
- **Source list** — table of campaign-scoped sources with status (pending/processing/processed/failed), size, added date, and Delete action.
- **Search test box** — call `bb-search` with `campaign_id` filter to preview what the AI will retrieve.

Files:
- `src/pages/workspace/campaigns/CampaignLibraryPage.tsx`
- `src/components/campaigns/library/CampaignLibraryUploader.tsx`
- `src/components/campaigns/library/CampaignSourcesTable.tsx`
- `src/hooks/useCampaignLibrary.ts` — list/create/delete `bb_sources` filtered by `campaign_id`
- Router entry in `src/App.tsx` (or campaign sub-router) for the new tab

### AI retrieval
- Update `bb-search` edge function to accept `campaign_id` and pass it through to `bb_search_chunks`. Workspace assistant / call runner pass the active `campaign_id` when present so retrieval stays isolated to that campaign's bin (falling back to workspace-wide sources when no campaign context).

## Out of scope
- Bulk import of clients
- Cross-campaign library sharing UI (already supported by leaving `campaign_id` null)
- Reindexing existing org-wide bb_sources into campaign bins

## Migration summary
1. `ALTER TABLE guides ADD COLUMN client_id uuid REFERENCES tenants(id) ON DELETE SET NULL;` + index
2. `ALTER TABLE bb_sources ADD COLUMN campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE;` + index
3. New `bb_search_chunks(_workspace_id, _client_id, _campaign_id, _query_embedding, _source_kinds, _limit)` overload
