
-- =============================================
-- Table 1: disposition_access
-- Controls which dispositions each partner org can see in reports
-- =============================================
CREATE TABLE public.disposition_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  disposition_name text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, disposition_name)
);

ALTER TABLE public.disposition_access ENABLE ROW LEVEL SECURITY;

-- Admins can manage all
CREATE POLICY "Platform admins can manage disposition access"
  ON public.disposition_access FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Master admin can manage all disposition access"
  ON public.disposition_access FOR ALL
  USING (is_master_admin(auth.uid()))
  WITH CHECK (is_master_admin(auth.uid()));

-- Org owners/admins can manage their own org's dispositions
CREATE POLICY "Org owners and admins can manage disposition access"
  ON public.disposition_access FOR ALL
  USING (is_org_owner_or_admin(auth.uid(), organization_id))
  WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));

-- Org members can view their own org's allowed dispositions
CREATE POLICY "Org members can view disposition access"
  ON public.disposition_access FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

-- =============================================
-- Table 2: call_log_cache
-- Cached call log data fetched from Five9
-- =============================================
CREATE TABLE public.call_log_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  five9_domain_id uuid,
  call_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  call_timestamp timestamptz NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_call_log_cache_org_timestamp ON public.call_log_cache (organization_id, call_timestamp DESC);
CREATE INDEX idx_call_log_cache_fetched ON public.call_log_cache (fetched_at);

ALTER TABLE public.call_log_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage call log cache"
  ON public.call_log_cache FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Master admin can manage all call log cache"
  ON public.call_log_cache FOR ALL
  USING (is_master_admin(auth.uid()))
  WITH CHECK (is_master_admin(auth.uid()));

CREATE POLICY "Org members can view own call logs"
  ON public.call_log_cache FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

-- =============================================
-- Table 3: scheduled_reports
-- Recurring report configurations linked to Five9
-- =============================================
CREATE TABLE public.scheduled_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  created_by uuid,
  frequency text NOT NULL DEFAULT 'daily',
  date_range_type text NOT NULL DEFAULT 'previous_day',
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  export_format text NOT NULL DEFAULT 'csv',
  five9_report_id text,
  status text NOT NULL DEFAULT 'active',
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage all scheduled reports"
  ON public.scheduled_reports FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Master admin can manage all scheduled reports"
  ON public.scheduled_reports FOR ALL
  USING (is_master_admin(auth.uid()))
  WITH CHECK (is_master_admin(auth.uid()));

CREATE POLICY "Org owners and admins can manage scheduled reports"
  ON public.scheduled_reports FOR ALL
  USING (is_org_owner_or_admin(auth.uid(), organization_id))
  WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));

CREATE POLICY "Org members can view scheduled reports"
  ON public.scheduled_reports FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE TRIGGER update_scheduled_reports_updated_at
  BEFORE UPDATE ON public.scheduled_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Table 4: campaign_archives
-- Snapshots of deprovisioned campaigns
-- =============================================
CREATE TABLE public.campaign_archives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  five9_domain_id uuid,
  campaign_setup_id uuid,
  campaign_name text NOT NULL,
  client_name text,
  config_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  deprovisioning_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  archived_by uuid,
  archived_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'archived',
  restore_notes text
);

CREATE INDEX idx_campaign_archives_org ON public.campaign_archives (organization_id);
CREATE INDEX idx_campaign_archives_status ON public.campaign_archives (status);

ALTER TABLE public.campaign_archives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage all campaign archives"
  ON public.campaign_archives FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Master admin can manage all campaign archives"
  ON public.campaign_archives FOR ALL
  USING (is_master_admin(auth.uid()))
  WITH CHECK (is_master_admin(auth.uid()));

CREATE POLICY "Org owners and admins can manage campaign archives"
  ON public.campaign_archives FOR ALL
  USING (is_org_owner_or_admin(auth.uid(), organization_id))
  WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));

CREATE POLICY "Org members can view campaign archives"
  ON public.campaign_archives FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
