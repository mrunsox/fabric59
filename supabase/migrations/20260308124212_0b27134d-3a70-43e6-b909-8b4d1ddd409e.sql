
-- Create partners table
CREATE TABLE public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  integration_configs jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, slug)
);

-- Enable RLS
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- RLS policies matching org-scoped pattern
CREATE POLICY "Master admin can manage all partners"
  ON public.partners FOR ALL
  TO authenticated
  USING (is_master_admin(auth.uid()))
  WITH CHECK (is_master_admin(auth.uid()));

CREATE POLICY "Platform admins can manage all partners"
  ON public.partners FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Org owners and admins can manage partners"
  ON public.partners FOR ALL
  TO authenticated
  USING (is_org_owner_or_admin(auth.uid(), organization_id))
  WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));

CREATE POLICY "Org members can view partners"
  ON public.partners FOR SELECT
  TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

-- Updated_at trigger for partners
CREATE TRIGGER update_partners_updated_at
  BEFORE UPDATE ON public.partners
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add partner_id to tenants
ALTER TABLE public.tenants ADD COLUMN partner_id uuid REFERENCES public.partners(id);

-- Add integration_configs to organizations
ALTER TABLE public.organizations ADD COLUMN integration_configs jsonb DEFAULT '{}'::jsonb;

-- Seed a "Direct" partner for each existing organization
INSERT INTO public.partners (organization_id, name, slug, status)
SELECT id, name || ' (Direct)', 'direct', 'active' FROM public.organizations;

-- Link existing tenants to their org's direct partner
UPDATE public.tenants t
SET partner_id = p.id
FROM public.partners p
WHERE p.organization_id = t.organization_id
  AND p.slug = 'direct';
