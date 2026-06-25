CREATE POLICY "tenants readable by workspace members"
ON public.tenants FOR SELECT
USING (
  workspace_id IS NOT NULL
  AND is_workspace_member(auth.uid(), workspace_id)
);