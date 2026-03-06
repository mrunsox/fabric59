
-- Web Callbacks table
CREATE TABLE public.web_callbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id),
  five9_domain_id uuid REFERENCES public.five9_domains(id),
  contact_name text,
  contact_phone text NOT NULL,
  contact_email text,
  source_channel text DEFAULT 'web_widget',
  source_url text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  reason text NOT NULL DEFAULT 'sales',
  mode text NOT NULL DEFAULT 'human',
  queue text NOT NULL DEFAULT '24H-WEB-SALES',
  callback_type text NOT NULL DEFAULT 'instant',
  callback_time timestamptz,
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'pending',
  five9_call_id text,
  call_disposition text,
  call_duration_seconds integer,
  recording_url text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.web_callbacks ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Master admin can manage all web_callbacks" ON public.web_callbacks FOR ALL TO authenticated
  USING (is_master_admin(auth.uid())) WITH CHECK (is_master_admin(auth.uid()));

CREATE POLICY "Platform admins can manage all web_callbacks" ON public.web_callbacks FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Org owners and admins can manage web_callbacks" ON public.web_callbacks FOR ALL TO authenticated
  USING (is_org_owner_or_admin(auth.uid(), organization_id)) WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));

CREATE POLICY "Org members can view web_callbacks" ON public.web_callbacks FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

-- updated_at trigger
CREATE TRIGGER update_web_callbacks_updated_at BEFORE UPDATE ON public.web_callbacks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Callback Routing Configs table
CREATE TABLE public.callback_routing_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id),
  five9_domain_id uuid REFERENCES public.five9_domains(id),
  queue_name text NOT NULL,
  five9_campaign_id text,
  five9_list_name text,
  mode text NOT NULL DEFAULT 'human',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, queue_name)
);

ALTER TABLE public.callback_routing_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master admin can manage all callback_routing_configs" ON public.callback_routing_configs FOR ALL TO authenticated
  USING (is_master_admin(auth.uid())) WITH CHECK (is_master_admin(auth.uid()));

CREATE POLICY "Platform admins can manage all callback_routing_configs" ON public.callback_routing_configs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Org owners and admins can manage callback_routing_configs" ON public.callback_routing_configs FOR ALL TO authenticated
  USING (is_org_owner_or_admin(auth.uid(), organization_id)) WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));

CREATE POLICY "Org members can view callback_routing_configs" ON public.callback_routing_configs FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE TRIGGER update_callback_routing_configs_updated_at BEFORE UPDATE ON public.callback_routing_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
