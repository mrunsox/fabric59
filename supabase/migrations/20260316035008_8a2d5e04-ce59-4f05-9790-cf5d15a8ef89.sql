-- Create script_templates table
CREATE TABLE public.script_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  category text NOT NULL DEFAULT 'general',
  is_built_in boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.script_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view script_templates"
  ON public.script_templates FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Org owners and admins can manage script_templates"
  ON public.script_templates FOR ALL TO authenticated
  USING (is_org_owner_or_admin(auth.uid(), organization_id))
  WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));

CREATE POLICY "Platform admins can manage all script_templates"
  ON public.script_templates FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Master admin can manage all script_templates"
  ON public.script_templates FOR ALL TO authenticated
  USING (is_master_admin(auth.uid()))
  WITH CHECK (is_master_admin(auth.uid()));

-- Create script_node_links table
CREATE TABLE public.script_node_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id uuid NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
  node_id text NOT NULL,
  url text NOT NULL,
  label text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.script_node_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view script_node_links"
  ON public.script_node_links FOR SELECT TO authenticated
  USING (script_id IN (
    SELECT id FROM public.scripts
    WHERE organization_id IN (SELECT get_user_org_ids(auth.uid()))
  ));

CREATE POLICY "Org owners and admins can manage script_node_links"
  ON public.script_node_links FOR ALL TO authenticated
  USING (script_id IN (
    SELECT id FROM public.scripts
    WHERE is_org_owner_or_admin(auth.uid(), organization_id)
  ))
  WITH CHECK (script_id IN (
    SELECT id FROM public.scripts
    WHERE is_org_owner_or_admin(auth.uid(), organization_id)
  ));

CREATE POLICY "Platform admins can manage all script_node_links"
  ON public.script_node_links FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Master admin can manage all script_node_links"
  ON public.script_node_links FOR ALL TO authenticated
  USING (is_master_admin(auth.uid()))
  WITH CHECK (is_master_admin(auth.uid()));