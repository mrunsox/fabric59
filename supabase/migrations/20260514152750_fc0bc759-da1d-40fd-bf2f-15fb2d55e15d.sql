-- Rank helper: lower number = more privilege.
CREATE OR REPLACE FUNCTION public.workspace_role_rank(_role public.workspace_role)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE _role
    WHEN 'owner'      THEN 10
    WHEN 'admin'      THEN 20
    WHEN 'supervisor' THEN 30
    WHEN 'manager'    THEN 40
    WHEN 'analyst'    THEN 50
    WHEN 'agent'      THEN 60
    WHEN 'member'     THEN 70
    WHEN 'viewer'     THEN 80
  END
$$;

-- Exact role check. Org owner/admin and master admin always pass.
CREATE OR REPLACE FUNCTION public.has_workspace_role(
  _user_id uuid, _workspace_id uuid, _role public.workspace_role
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_master_admin(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = _workspace_id
        AND public.is_org_owner_or_admin(_user_id, w.organization_id)
    )
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = _workspace_id
        AND wm.user_id = _user_id
        AND wm.role = _role
    )
$$;

-- Minimum-rank check. Org owner/admin and master admin always pass.
CREATE OR REPLACE FUNCTION public.has_workspace_role_min(
  _user_id uuid, _workspace_id uuid, _min public.workspace_role
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_master_admin(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = _workspace_id
        AND public.is_org_owner_or_admin(_user_id, w.organization_id)
    )
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = _workspace_id
        AND wm.user_id = _user_id
        AND public.workspace_role_rank(wm.role) <= public.workspace_role_rank(_min)
    )
$$;

-- Tighten workspace_members write policy to also accept workspace admins.
DROP POLICY IF EXISTS "workspace_members managed by org admins" ON public.workspace_members;
CREATE POLICY "workspace_members managed by workspace or org admins"
ON public.workspace_members
FOR ALL
TO authenticated
USING (public.has_workspace_role_min(auth.uid(), workspace_id, 'admin'::public.workspace_role))
WITH CHECK (public.has_workspace_role_min(auth.uid(), workspace_id, 'admin'::public.workspace_role));

-- Tighten workspaces write policy similarly.
DROP POLICY IF EXISTS "workspaces managed by org admins" ON public.workspaces;
CREATE POLICY "workspaces managed by workspace or org admins"
ON public.workspaces
FOR ALL
TO authenticated
USING (public.has_workspace_role_min(auth.uid(), id, 'admin'::public.workspace_role))
WITH CHECK (public.has_workspace_role_min(auth.uid(), id, 'admin'::public.workspace_role));