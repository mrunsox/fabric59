
-- Create failure classification enum type
CREATE TYPE public.failure_classification_type AS ENUM (
  'invalid_signature',
  'expired_subscription',
  'renewal_failed',
  'provider_unavailable',
  'token_refresh_failed',
  'unsupported_action',
  'payload_validation_failed',
  'duplicate_event',
  'rate_limited',
  'transient_network_error',
  'downstream_write_failed',
  'internal_processing_error',
  'dead_lettered'
);

-- Create failure classifications table
CREATE TABLE public.legal_connect_failure_classifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sync_job_id UUID REFERENCES public.legal_connect_sync_jobs(id) ON DELETE SET NULL,
  event_log_id UUID REFERENCES public.legal_connect_event_log(id) ON DELETE SET NULL,
  classification failure_classification_type NOT NULL,
  is_retryable BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.legal_connect_failure_classifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view failure classifications"
  ON public.legal_connect_failure_classifications FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Org owners/admins can manage failure classifications"
  ON public.legal_connect_failure_classifications FOR ALL TO authenticated
  USING (is_org_owner_or_admin(auth.uid(), organization_id))
  WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));

CREATE POLICY "Master admin can manage all failure classifications"
  ON public.legal_connect_failure_classifications FOR ALL TO authenticated
  USING (is_master_admin(auth.uid()))
  WITH CHECK (is_master_admin(auth.uid()));

CREATE POLICY "Platform admins can manage all failure classifications"
  ON public.legal_connect_failure_classifications FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_failure_classifications_org_client ON public.legal_connect_failure_classifications(organization_id, client_id);
CREATE INDEX idx_failure_classifications_sync_job ON public.legal_connect_failure_classifications(sync_job_id);
CREATE INDEX idx_failure_classifications_classification ON public.legal_connect_failure_classifications(classification);

-- Add columns to legal_connect_sync_jobs
ALTER TABLE public.legal_connect_sync_jobs
  ADD COLUMN IF NOT EXISTS failure_classification TEXT,
  ADD COLUMN IF NOT EXISTS is_replay BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS replay_source_id UUID REFERENCES public.legal_connect_sync_jobs(id) ON DELETE SET NULL;

CREATE INDEX idx_sync_jobs_failure_classification ON public.legal_connect_sync_jobs(failure_classification);
CREATE INDEX idx_sync_jobs_replay ON public.legal_connect_sync_jobs(is_replay) WHERE is_replay = true;

-- Add outage_mode to tenant configs
ALTER TABLE public.legal_connect_tenant_configs
  ADD COLUMN IF NOT EXISTS outage_mode BOOLEAN NOT NULL DEFAULT false;

-- Add signature_valid and raw_headers to event log
ALTER TABLE public.legal_connect_event_log
  ADD COLUMN IF NOT EXISTS signature_valid BOOLEAN,
  ADD COLUMN IF NOT EXISTS raw_headers JSONB;
