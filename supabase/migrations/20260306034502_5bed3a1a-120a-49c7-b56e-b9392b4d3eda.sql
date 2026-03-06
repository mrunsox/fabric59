
-- Identity cross-reference table
CREATE TABLE public.identity_xrefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  person_type text NOT NULL,
  internal_id uuid NOT NULL,
  external_system text NOT NULL,
  external_id text NOT NULL,
  synced_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, person_type, internal_id, external_system)
);

ALTER TABLE public.identity_xrefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master admin can manage all identity xrefs"
  ON public.identity_xrefs FOR ALL TO authenticated
  USING (is_master_admin(auth.uid()))
  WITH CHECK (is_master_admin(auth.uid()));

CREATE POLICY "Platform admins can manage all identity xrefs"
  ON public.identity_xrefs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Org members can view own identity xrefs"
  ON public.identity_xrefs FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Org owners and admins can manage identity xrefs"
  ON public.identity_xrefs FOR ALL TO authenticated
  USING (is_org_owner_or_admin(auth.uid(), organization_id))
  WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));
