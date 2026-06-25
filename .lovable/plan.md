## Goal

Restructure the Integrations page so connections are fully campaign-isolated. Remove the workspace-wide "New connection" entry point from the index; instead, the index shows only campaign cards (auto-created per campaign), and connections can only be added from inside a campaign card.

## Changes

### 1. `WorkspaceIntegrationsPage.tsx` — index view
- Remove the top-right **+ New connection** button from the index view.
- Keep the **Available Providers** reference block at the top (read-only catalog).
- Replace the Connections list with a **campaign card grid only**:
  - One card per campaign from `useWorkspaceCampaigns()`.
  - Each card shows: campaign name, connection count, provider icon stack, last-updated.
  - Empty state on each card: "No integrations yet — click to add."
- Drop the "Workspace-wide" card. Any existing connections with `campaign_id = NULL` are surfaced in a small **Unassigned** card at the bottom (so nothing is lost), with a "Move to campaign…" action only — no new connections can be created there.
- New campaigns automatically appear as cards (already true via `useWorkspaceCampaigns` query).

### 2. `WorkspaceIntegrationsPage.tsx` — drill-in view (per campaign)
- Header: back button, campaign name, **+ New connection** button (scoped + locked to this campaign).
- Body:
  - **Add integrations** section: provider picker grid (Clio, MyCase, Five9, Make, Zapier, Slack, …) — clicking a provider opens the new-connection dialog pre-filled with `campaign_id = <this campaign>` and `provider = <picked>`.
  - **Connections** list: only connections where `campaign_id = <this campaign>`.
- Remove the "Move to…" re-scope control from inside a campaign card (campaign scope is fixed there). Re-scoping stays available only on the Unassigned card.

### 3. Hook layer (`useWorkspaceIntegrations.ts`)
- No schema change. `campaign_id` column already exists.
- `useCreateIntegrationConnection`: require `campaign_id` from callers in the drill-in flow (no default to NULL from the UI anymore). Hook signature unchanged; enforcement is at the page level.
- Optional: add a `useConnectionsByCampaign(campaignId)` selector for cleaner per-card counts (derived client-side, no new query).

### 4. Out of scope
- No edge function changes.
- No changes to `WorkspaceIntegrationDetailPage.tsx` beyond showing the campaign scope label (already covered).
- No auto-provisioning of empty connection rows per provider per campaign — cards stay empty until the user adds one.
- No migration; existing workspace-wide rows remain reachable via the Unassigned card.

## Files

- `src/pages/workspace/WorkspaceIntegrationsPage.tsx` — index + drill-in rewrite
- `src/hooks/useWorkspaceIntegrations.ts` — minor (optional selector)
