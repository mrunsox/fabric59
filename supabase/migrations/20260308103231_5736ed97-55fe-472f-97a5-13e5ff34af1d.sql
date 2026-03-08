
-- oauth_tokens table
CREATE TABLE public.oauth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'clio',
  access_token_encrypted text,
  refresh_token_encrypted text,
  expires_at timestamp with time zone,
  scopes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.oauth_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master admin can manage all oauth_tokens" ON public.oauth_tokens FOR ALL USING (is_master_admin(auth.uid())) WITH CHECK (is_master_admin(auth.uid()));
CREATE POLICY "Platform admins can manage all oauth_tokens" ON public.oauth_tokens FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Org owners and admins can manage oauth_tokens" ON public.oauth_tokens FOR ALL USING (is_org_owner_or_admin(auth.uid(), organization_id)) WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));
CREATE POLICY "Org members can view oauth_tokens" ON public.oauth_tokens FOR SELECT USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

-- clio_mappings table
CREATE TABLE public.clio_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  phone text NOT NULL,
  contact_id text,
  matter_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, phone)
);

ALTER TABLE public.clio_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master admin can manage all clio_mappings" ON public.clio_mappings FOR ALL USING (is_master_admin(auth.uid())) WITH CHECK (is_master_admin(auth.uid()));
CREATE POLICY "Platform admins can manage all clio_mappings" ON public.clio_mappings FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Org owners and admins can manage clio_mappings" ON public.clio_mappings FOR ALL USING (is_org_owner_or_admin(auth.uid(), organization_id)) WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));
CREATE POLICY "Org members can view clio_mappings" ON public.clio_mappings FOR SELECT USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

-- mycase_mappings table
CREATE TABLE public.mycase_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  phone text NOT NULL,
  contact_id text,
  case_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, phone)
);

ALTER TABLE public.mycase_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master admin can manage all mycase_mappings" ON public.mycase_mappings FOR ALL USING (is_master_admin(auth.uid())) WITH CHECK (is_master_admin(auth.uid()));
CREATE POLICY "Platform admins can manage all mycase_mappings" ON public.mycase_mappings FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Org owners and admins can manage mycase_mappings" ON public.mycase_mappings FOR ALL USING (is_org_owner_or_admin(auth.uid(), organization_id)) WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));
CREATE POLICY "Org members can view mycase_mappings" ON public.mycase_mappings FOR SELECT USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

-- updated_at triggers
CREATE TRIGGER update_oauth_tokens_updated_at BEFORE UPDATE ON public.oauth_tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clio_mappings_updated_at BEFORE UPDATE ON public.clio_mappings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mycase_mappings_updated_at BEFORE UPDATE ON public.mycase_mappings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
