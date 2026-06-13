# Superadmin workspace management

Give master admins full control over workspaces from `/admin/workspaces`: create new workspaces, rename/delete existing ones, and reassign any client (tenant) to any workspace. RLS already permits this for `master_admin`; this is a UI + hooks change only.

## What ships

### 1. `WorkspacesPage.tsx` — top-bar actions
- Add a **"New workspace"** button in the header (next to the title) that opens a dialog: pick organization (dropdown of existing orgs), enter name, optional "Set as default workspace" checkbox.
- On each workspace card, add a small **kebab menu** (⋯) in the top-right with: **Rename**, **Set as default**, **Move clients here…**, **Delete workspace**.
  - Rename → inline dialog.
  - Delete → confirm dialog showing how many clients/campaigns/forms/guides will be cascaded or orphaned (tenants are SET NULL, the rest CASCADE).
  - Set as default → flips `is_default` (clears the previous default in the same org first).

### 2. New "Move clients" dialog
- Opens from the kebab menu's **"Move clients here…"**.
- Shows a searchable list of all tenants the master admin can see (across all orgs), grouped by current workspace, with a checkbox per row.
- "Move selected" updates `tenants.workspace_id` (and `organization_id` to match the destination workspace's org) for every checked row in one batch.
- Toast confirms count moved; list refreshes.

### 3. New hooks in `src/hooks/useAdminWorkspaces.ts`
- `useCreateWorkspace()` — insert into `workspaces`; if `is_default`, first clear other defaults in that org.
- `useUpdateWorkspace()` — update name / is_default.
- `useDeleteWorkspace()` — delete row (cascades handle the rest).
- `useMoveTenantsToWorkspace()` — bulk update `tenants.workspace_id` + `organization_id`; invalidates tenant + workspace caches.
- All hooks invalidate `["admin-workspaces-orgs"]` and `["admin-workspaces-default-map"]`.

### 4. Guardrails
- All actions gated behind `is_master_admin` check via existing `useAuth`/role helpers — if a non-superadmin somehow lands here, the buttons are hidden.
- Delete blocked (with a clear message) when the workspace is the only one in its org and still has clients — must move clients first.
- Cannot move a tenant into a workspace that belongs to a different organization without confirming the org change in the dialog.

## Out of scope
- No schema changes — existing RLS already allows master admin writes on `workspaces` and `tenants`.
- No changes to org-level admin's view (`is_org_owner_or_admin` already worked, but the kebab UI only renders the superadmin-only actions when `is_master_admin` is true).
- No changes to the per-workspace deep links (Forms/Guides/Campaigns/Agent buttons stay as-is).

## Technical notes
- `workspaces_default_per_org_uq` is a partial unique index on `(organization_id) WHERE is_default`; the "set as default" mutation must run the clear + set inside a single transaction or sequence the writes (clear → set) and tolerate transient state.
- `tenants.workspace_id` is `ON DELETE SET NULL`; deleting a workspace will orphan its tenants — the delete dialog must show this count and require the admin to confirm or move them first.
- Use existing `useMasterAdminCheck`/`useAuth` plumbing — do not add a new role.
