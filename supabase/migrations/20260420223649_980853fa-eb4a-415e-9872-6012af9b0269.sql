-- 1. Campaign builder drafts table
CREATE TABLE public.campaign_builder_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  current_step integer NOT NULL DEFAULT 1,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','configured','testing','ready','archived')),
  created_route_id uuid REFERENCES public.five9_campaign_routes(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cbd_user ON public.campaign_builder_drafts(user_id);
CREATE INDEX idx_cbd_org ON public.campaign_builder_drafts(organization_id);
CREATE INDEX idx_cbd_client ON public.campaign_builder_drafts(client_id);

ALTER TABLE public.campaign_builder_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master admin full access on campaign builder drafts"
  ON public.campaign_builder_drafts
  USING (is_master_admin(auth.uid()))
  WITH CHECK (is_master_admin(auth.uid()));

CREATE POLICY "Users manage own drafts in their org"
  ON public.campaign_builder_drafts
  FOR ALL
  USING (auth.uid() = user_id AND is_org_member(auth.uid(), organization_id))
  WITH CHECK (auth.uid() = user_id AND is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins view all org drafts"
  ON public.campaign_builder_drafts
  FOR SELECT
  USING (is_org_owner_or_admin(auth.uid(), organization_id));

CREATE TRIGGER update_campaign_builder_drafts_updated_at
  BEFORE UPDATE ON public.campaign_builder_drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Campaign readiness view
CREATE VIEW public.v_campaign_readiness
WITH (security_invoker = true) AS
SELECT
  r.id AS route_id,
  r.client_id,
  r.organization_id,
  r.campaign_name,
  r.five9_domain,
  r.provider_target,
  (d.id IS NOT NULL AND d.status = 'active') AS domain_connected,
  (r.call_variable_group_id IS NOT NULL) AS variable_group_assigned,
  COALESCE((SELECT COUNT(*)::int FROM public.five9_call_variables v WHERE v.group_id = r.call_variable_group_id), 0) AS variable_count,
  COALESCE((SELECT COUNT(*)::int FROM public.five9_call_variables v WHERE v.group_id = r.call_variable_group_id AND v.required = true), 0) AS required_variable_count,
  COALESCE((SELECT COUNT(*)::int FROM public.legal_connect_disposition_mappings m WHERE m.campaign_id = r.id OR (m.client_id = r.client_id AND m.campaign_id IS NULL)), 0) AS disposition_count,
  (r.connection_id IS NOT NULL) AS provider_connected,
  COALESCE((SELECT COUNT(*)::int FROM public.five9_event_log e WHERE e.five9_domain = r.five9_domain AND e.campaign_name = r.campaign_name AND e.status IN ('completed','routed','mapped')), 0) AS successful_event_count,
  CASE
    WHEN d.id IS NULL OR d.status <> 'active' THEN 'blocked'
    WHEN r.call_variable_group_id IS NULL THEN 'in_progress'
    WHEN r.provider_target IS NOT NULL AND r.connection_id IS NULL THEN 'in_progress'
    WHEN COALESCE((SELECT COUNT(*) FROM public.legal_connect_disposition_mappings m WHERE m.campaign_id = r.id OR (m.client_id = r.client_id AND m.campaign_id IS NULL)), 0) = 0 THEN 'in_progress'
    WHEN COALESCE((SELECT COUNT(*) FROM public.five9_event_log e WHERE e.five9_domain = r.five9_domain AND e.campaign_name = r.campaign_name AND e.status IN ('completed','routed','mapped')), 0) = 0 THEN 'test_ready'
    ELSE 'ready'
  END AS status
FROM public.five9_campaign_routes r
LEFT JOIN public.five9_domains d ON d.domain = r.five9_domain AND d.organization_id = r.organization_id;

-- 3. Client readiness view (aggregate across the client's routes)
CREATE VIEW public.v_client_readiness
WITH (security_invoker = true) AS
SELECT
  t.id AS client_id,
  t.organization_id,
  EXISTS (SELECT 1 FROM public.five9_domains d WHERE d.organization_id = t.organization_id AND d.status = 'active') AS domain_connected,
  EXISTS (SELECT 1 FROM public.five9_campaign_routes r WHERE r.client_id = t.id) AS campaign_exists,
  EXISTS (SELECT 1 FROM public.five9_call_variable_groups g WHERE g.client_id = t.id) AS variable_group_exists,
  EXISTS (SELECT 1 FROM public.legal_connect_connections c WHERE c.client_id = t.id AND c.status = 'active') AS provider_connected,
  EXISTS (SELECT 1 FROM public.legal_connect_disposition_mappings m WHERE m.client_id = t.id) AS dispositions_configured,
  COALESCE((SELECT COUNT(*)::int FROM public.five9_campaign_routes r WHERE r.client_id = t.id), 0) AS route_count,
  COALESCE((SELECT COUNT(*)::int FROM public.v_campaign_readiness vr WHERE vr.client_id = t.id AND vr.status = 'ready'), 0) AS ready_route_count,
  CASE
    WHEN NOT EXISTS (SELECT 1 FROM public.five9_domains d WHERE d.organization_id = t.organization_id AND d.status = 'active') THEN 'blocked'
    WHEN NOT EXISTS (SELECT 1 FROM public.five9_campaign_routes r WHERE r.client_id = t.id) THEN 'not_started'
    WHEN COALESCE((SELECT COUNT(*) FROM public.v_campaign_readiness vr WHERE vr.client_id = t.id AND vr.status = 'ready'), 0) > 0 THEN 'ready'
    WHEN COALESCE((SELECT COUNT(*) FROM public.v_campaign_readiness vr WHERE vr.client_id = t.id AND vr.status = 'test_ready'), 0) > 0 THEN 'test_ready'
    ELSE 'in_progress'
  END AS status
FROM public.tenants t;