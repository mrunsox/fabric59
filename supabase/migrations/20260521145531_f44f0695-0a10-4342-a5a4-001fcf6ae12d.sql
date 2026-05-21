DROP POLICY IF EXISTS "workspaces managed by workspace or org admins" ON public.workspaces;

CREATE POLICY "workspaces insertable by org owners/admins"
ON public.workspaces
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_master_admin(auth.uid())
  OR public.is_org_owner_or_admin(auth.uid(), organization_id)
);

CREATE POLICY "workspaces updatable by workspace or org admins"
ON public.workspaces
FOR UPDATE
TO authenticated
USING (
  public.is_master_admin(auth.uid())
  OR public.is_org_owner_or_admin(auth.uid(), organization_id)
  OR public.has_workspace_role_min(auth.uid(), id, 'admin'::workspace_role)
)
WITH CHECK (
  public.is_master_admin(auth.uid())
  OR public.is_org_owner_or_admin(auth.uid(), organization_id)
  OR public.has_workspace_role_min(auth.uid(), id, 'admin'::workspace_role)
);

CREATE POLICY "workspaces deletable by org owners/admins"
ON public.workspaces
FOR DELETE
TO authenticated
USING (
  public.is_master_admin(auth.uid())
  OR public.is_org_owner_or_admin(auth.uid(), organization_id)
);