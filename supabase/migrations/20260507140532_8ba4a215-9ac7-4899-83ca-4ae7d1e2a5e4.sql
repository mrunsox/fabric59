
CREATE TABLE public.legal_connect_ga_checklist_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  item_id text NOT NULL,
  status text NOT NULL DEFAULT 'todo',
  note text,
  updated_by uuid,
  updated_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, item_id)
);

CREATE INDEX idx_lc_ga_checklist_tenant ON public.legal_connect_ga_checklist_state(tenant_id);
CREATE INDEX idx_lc_ga_checklist_org ON public.legal_connect_ga_checklist_state(organization_id);

ALTER TABLE public.legal_connect_ga_checklist_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view GA checklist state"
  ON public.legal_connect_ga_checklist_state FOR SELECT
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Org admins can manage GA checklist state"
  ON public.legal_connect_ga_checklist_state FOR ALL
  USING (
    public.is_org_owner_or_admin(auth.uid(), organization_id)
    OR public.is_ops_member(auth.uid())
    OR public.is_master_admin(auth.uid())
  )
  WITH CHECK (
    public.is_org_owner_or_admin(auth.uid(), organization_id)
    OR public.is_ops_member(auth.uid())
    OR public.is_master_admin(auth.uid())
  );

CREATE TRIGGER set_lc_ga_checklist_updated_at
  BEFORE UPDATE ON public.legal_connect_ga_checklist_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
