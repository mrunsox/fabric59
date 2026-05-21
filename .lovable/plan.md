## Fix RLS chicken-and-egg blocking onboarding workspace creation

### Bug
Onboarding step "Land workspace" inserts into `public.workspaces` and fails with:
> new row violates row-level security policy for table "workspaces"

The only write policy on `workspaces` is `FOR ALL` with check `has_workspace_role_min(auth.uid(), id, 'admin')`. On INSERT the row doesn't exist yet, so the user can't possibly have a role in it — every insert is blocked, even for org owners bootstrapping their first workspace.

### Fix
Split the single `FOR ALL` policy into per-command policies so INSERT is governed by **org-level** authority while UPDATE/DELETE stay gated by **workspace-level** authority.

Migration:
1. `DROP POLICY "workspaces managed by workspace or org admins" ON public.workspaces;`
2. `CREATE POLICY "workspaces insertable by org owners/admins" ON public.workspaces FOR INSERT TO authenticated WITH CHECK ( public.is_master_admin(auth.uid()) OR public.is_org_owner_or_admin(auth.uid(), organization_id) );`
3. `CREATE POLICY "workspaces updatable by workspace or org admins" ON public.workspaces FOR UPDATE TO authenticated USING ( public.is_master_admin(auth.uid()) OR public.has_workspace_role_min(auth.uid(), id, 'admin') OR public.is_org_owner_or_admin(auth.uid(), organization_id) ) WITH CHECK ( public.is_master_admin(auth.uid()) OR public.has_workspace_role_min(auth.uid(), id, 'admin') OR public.is_org_owner_or_admin(auth.uid(), organization_id) );`
4. `CREATE POLICY "workspaces deletable by org owners/admins" ON public.workspaces FOR DELETE TO authenticated USING ( public.is_master_admin(auth.uid()) OR public.is_org_owner_or_admin(auth.uid(), organization_id) );`

Existing SELECT policy stays untouched.

No app code changes needed — the onboarding `supabase.from("workspaces").insert(...)` already sends `organization_id` + `name`, which now satisfies the new check.

### Verification
After migration, retry onboarding: org create → operating profile → skip Five9 → land workspace should insert successfully and redirect to `/w/:id/campaigns`.

### Out of scope
No changes to UI, helpers, or other tables.