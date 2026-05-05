
ALTER TABLE public.flows
  ADD COLUMN IF NOT EXISTS template_type TEXT,
  ADD COLUMN IF NOT EXISTS connector_instance_id UUID,
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL;

ALTER TABLE public.deployments
  ADD COLUMN IF NOT EXISTS five9_domain_id UUID REFERENCES public.five9_domains(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS campaign_name TEXT,
  ADD COLUMN IF NOT EXISTS trigger_type TEXT,
  ADD COLUMN IF NOT EXISTS template_type TEXT,
  ADD COLUMN IF NOT EXISTS owner_scope_type TEXT NOT NULL DEFAULT 'workspace',
  ADD COLUMN IF NOT EXISTS owner_scope_id UUID;

ALTER TABLE public.deployment_runs
  ADD COLUMN IF NOT EXISTS source_event_type     TEXT,
  ADD COLUMN IF NOT EXISTS source_event_id       TEXT,
  ADD COLUMN IF NOT EXISTS connector_instance_id UUID,
  ADD COLUMN IF NOT EXISTS request_payload       JSONB,
  ADD COLUMN IF NOT EXISTS response_payload      JSONB,
  ADD COLUMN IF NOT EXISTS external_record_id    TEXT,
  ADD COLUMN IF NOT EXISTS idempotency_key       TEXT,
  ADD COLUMN IF NOT EXISTS retry_of              UUID REFERENCES public.deployment_runs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_flows_template       ON public.flows(template_type);
CREATE INDEX IF NOT EXISTS idx_flows_client         ON public.flows(client_id);
CREATE INDEX IF NOT EXISTS idx_deployments_status   ON public.deployments(status);
CREATE INDEX IF NOT EXISTS idx_deployments_client   ON public.deployments(client_id);
CREATE INDEX IF NOT EXISTS idx_deployments_domain   ON public.deployments(five9_domain_id);
CREATE INDEX IF NOT EXISTS idx_deployments_campaign ON public.deployments(campaign_name);
CREATE INDEX IF NOT EXISTS idx_deployments_template ON public.deployments(template_type);
CREATE INDEX IF NOT EXISTS idx_runs_idem            ON public.deployment_runs(deployment_id, idempotency_key);
CREATE INDEX IF NOT EXISTS idx_runs_external_record ON public.deployment_runs(external_record_id);
CREATE INDEX IF NOT EXISTS idx_runs_source_event    ON public.deployment_runs(source_event_id);
