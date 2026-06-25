## Add Edit / Delete to Campaign Detail

Add an actions menu to the campaign detail header (`WorkspaceCampaignDetailPage.tsx`) so users can rename/update or delete the current campaign.

### UI

In the header action row (next to "Library / Open agent cockpit / Open flow builder"), add a kebab `DropdownMenu` with:
- **Edit campaign** — opens a dialog
- **Delete campaign** — opens a confirm dialog (destructive)

### Edit dialog (`EditCampaignDialog.tsx`, new)
Fields: `name` (required), `status` (Select: draft / active / paused / archived). Saves via `UPDATE campaigns SET name, status, updated_at WHERE id` scoped to workspace.

### Delete dialog (`DeleteCampaignDialog.tsx`, new)
`AlertDialog` confirming permanent deletion. On confirm, `DELETE FROM campaigns WHERE id`. On success, navigate back to `/w/:workspaceId/campaigns` and toast.

### Hook (`useWorkspaceCampaignMutations.ts`, new)
Two mutations: `updateCampaign({ id, name, status })` and `deleteCampaign(id)`. Both invalidate `["workspace-campaign", id]` and `["workspace-campaigns", workspaceId]`.

### Scope
- Only frontend + simple Supabase update/delete (existing RLS on `campaigns` already covers org members).
- No schema changes, no edge functions.
- Does not touch related guides/forms/sources (DB cascade or set-null already handles them per existing FKs).

### Files
- new: `src/components/workspace/campaigns/EditCampaignDialog.tsx`
- new: `src/components/workspace/campaigns/DeleteCampaignDialog.tsx`
- new: `src/hooks/useWorkspaceCampaignMutations.ts`
- edit: `src/pages/workspace/WorkspaceCampaignDetailPage.tsx` (add dropdown + dialog state)
