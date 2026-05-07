-- Phase 5 Slice 3: per-tenant rate limits + alerts surface

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS max_jobs_per_minute integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS max_jobs_per_hour integer NOT NULL DEFAULT 1000;

CREATE INDEX IF NOT EXISTS idx_lc_sync_jobs_client_created
  ON public.legal_connect_sync_jobs (client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lc_sync_jobs_org_created
  ON public.legal_connect_sync_jobs (organization_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.legal_connect_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  alert_kind text NOT NULL,
  severity text NOT NULL DEFAULT 'warning' CHECK (severity IN ('info','warning','critical')),
  title text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','resolved')),
  acknowledged_at timestamptz,
  acknowledged_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lc_alerts_client_status ON public.legal_connect_alerts (client_id, status);
CREATE INDEX IF NOT EXISTS idx_lc_alerts_org_status ON public.legal_connect_alerts (organization_id, status, created_at DESC);

ALTER TABLE public.legal_connect_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view alerts"
  ON public.legal_connect_alerts FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Org admins can manage alerts"
  ON public.legal_connect_alerts FOR ALL
  USING (is_org_owner_or_admin(auth.uid(), organization_id))
  WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));

CREATE POLICY "Platform admins can manage all alerts"
  ON public.legal_connect_alerts FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Master admin can manage all alerts"
  ON public.legal_connect_alerts FOR ALL
  USING (is_master_admin(auth.uid()))
  WITH CHECK (is_master_admin(auth.uid()));

CREATE TRIGGER update_lc_alerts_updated_at
  BEFORE UPDATE ON public.legal_connect_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();