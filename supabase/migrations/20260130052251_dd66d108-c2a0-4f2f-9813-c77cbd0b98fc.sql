-- Create field_mappings table for visual mapping configurations
CREATE TABLE public.field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  five9_domain_id UUID NOT NULL REFERENCES five9_domains(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  source_type TEXT NOT NULL DEFAULT 'five9',
  destination_type TEXT NOT NULL,
  mappings JSONB NOT NULL DEFAULT '[]',
  transformations JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add index for common queries
CREATE INDEX idx_field_mappings_domain ON public.field_mappings(five9_domain_id);
CREATE INDEX idx_field_mappings_tenant ON public.field_mappings(tenant_id);
CREATE INDEX idx_field_mappings_active ON public.field_mappings(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.field_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Master admin can manage all field mappings"
ON public.field_mappings FOR ALL
USING (is_master_admin(auth.uid()))
WITH CHECK (is_master_admin(auth.uid()));

CREATE POLICY "Platform admins can manage all field mappings"
ON public.field_mappings FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Org owners and admins can manage field mappings"
ON public.field_mappings FOR ALL
USING (
  five9_domain_id IN (
    SELECT id FROM five9_domains 
    WHERE is_org_owner_or_admin(auth.uid(), organization_id)
  )
)
WITH CHECK (
  five9_domain_id IN (
    SELECT id FROM five9_domains 
    WHERE is_org_owner_or_admin(auth.uid(), organization_id)
  )
);

CREATE POLICY "Org members can view field mappings"
ON public.field_mappings FOR SELECT
USING (
  five9_domain_id IN (
    SELECT id FROM five9_domains 
    WHERE organization_id IN (SELECT get_user_org_ids(auth.uid()))
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_field_mappings_updated_at
BEFORE UPDATE ON public.field_mappings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();