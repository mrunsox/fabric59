CREATE TABLE public.campaign_blueprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  departments jsonb DEFAULT '[]'::jsonb,
  agent_scripts jsonb DEFAULT '[]'::jsonb,
  agent_guide text DEFAULT '',
  dispositions jsonb DEFAULT '[]'::jsonb,
  ivr_flow jsonb DEFAULT '{}'::jsonb,
  phone_numbers jsonb DEFAULT '[]'::jsonb,
  connectors jsonb DEFAULT '[]'::jsonb,
  notes text,
  tags text[] DEFAULT '{}',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_blueprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view blueprints"
  ON public.campaign_blueprints FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Org owners and admins can manage blueprints"
  ON public.campaign_blueprints FOR ALL TO authenticated
  USING (is_org_owner_or_admin(auth.uid(), organization_id))
  WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));

CREATE POLICY "Platform admins can manage all blueprints"
  ON public.campaign_blueprints FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Master admin can manage all blueprints"
  ON public.campaign_blueprints FOR ALL TO authenticated
  USING (is_master_admin(auth.uid()))
  WITH CHECK (is_master_admin(auth.uid()));

CREATE TRIGGER update_campaign_blueprints_updated_at
  BEFORE UPDATE ON public.campaign_blueprints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();