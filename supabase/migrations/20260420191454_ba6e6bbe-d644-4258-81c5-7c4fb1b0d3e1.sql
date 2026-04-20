
-- ──────────────────────────────────────────────────────────────────
-- Phase 1: Connection table additions
-- ──────────────────────────────────────────────────────────────────

-- Allow smokeball as a provider
ALTER TABLE public.legal_connect_connections
  DROP CONSTRAINT IF EXISTS legal_connect_connections_provider_check;

ALTER TABLE public.legal_connect_connections
  ADD CONSTRAINT legal_connect_connections_provider_check
  CHECK (provider = ANY (ARRAY['clio'::text, 'mycase'::text, 'smokeball'::text, 'lawmatics'::text, 'litify'::text, 'cosmolex'::text, 'practicepanther'::text, 'five9'::text]));

-- Add auth_state_meta column for OAuth state tracking (PKCE verifiers, nonces, etc.)
ALTER TABLE public.legal_connect_connections
  ADD COLUMN IF NOT EXISTS auth_state_meta jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ──────────────────────────────────────────────────────────────────
-- Phase 1: Seed smokeball capability matrix + missing clio/mycase rows
-- ──────────────────────────────────────────────────────────────────

INSERT INTO public.legal_connect_provider_capabilities (provider, capability_key, capability_name, supported, support_mode, notes)
VALUES
  -- Smokeball
  ('smokeball', 'auth_connect',     'OAuth Connect',        true,  'native',      'OAuth 2.0 Authorization Code with region-aware base URL (AU/US/UK)'),
  ('smokeball', 'token_refresh',    'Token Refresh',        true,  'native',      'Automatic refresh via stored refresh_token'),
  ('smokeball', 'deauth_callback',  'Deauthorization Callback', false, 'unsupported', 'Smokeball does not push deauth callbacks'),
  ('smokeball', 'contact_sync',     'Contact Sync',         true,  'native',      'Read/write contacts with deterministic dedup'),
  ('smokeball', 'matter_sync',      'Matter Sync',          true,  'native',      'Read/write matters; tied to contact'),
  ('smokeball', 'lead_sync',        'Lead Sync',            true,  'native',      'Intake-first: leads can promote to matters'),
  ('smokeball', 'task_sync',        'Task Sync',            true,  'native',      'Tasks attach to matter or lead'),
  ('smokeball', 'note_sync',        'Note Sync',            true,  'native',      'Notes attach to matter, lead, or contact'),
  ('smokeball', 'activity_sync',    'Activity Sync',        false, 'manual_only', 'No native activity object; use notes instead'),
  ('smokeball', 'webhook_receive',  'Webhook Receive',      true,  'native',      'HMAC-verified webhooks for leads/matters/contacts'),
  ('smokeball', 'webhook_renewal',  'Webhook Renewal',      false, 'unsupported', 'Subscriptions persistent — no expiry'),
  ('smokeball', 'reverse_sync',     'Reverse Sync',         true,  'conditional', 'Provider → Fabric59 via webhooks where enabled'),
  ('smokeball', 'test_simulation',  'Test Simulation',      true,  'native',      'Sandbox mode supported per region'),
  -- Clio backfill
  ('clio', 'token_refresh',    'Token Refresh',            true,  'native',      'Refresh token grant; auto-renewal cron every 30 min'),
  ('clio', 'deauth_callback',  'Deauthorization Callback', true,  'native',      'Clio pushes deauth notification; connection marked revoked'),
  ('clio', 'lead_sync',        'Lead Sync',                false, 'unsupported', 'Clio has no lead object; use intakes via Clio Grow if connected separately'),
  ('clio', 'activity_sync',    'Activity Sync',            true,  'native',      'Clio activities/communications supported'),
  ('clio', 'webhook_renewal',  'Webhook Renewal',          true,  'native',      'Clio webhooks expire after 31 days; renewed every 6h'),
  ('clio', 'reverse_sync',     'Reverse Sync',             true,  'native',      'Provider → Fabric59 via webhooks'),
  ('clio', 'test_simulation',  'Test Simulation',          true,  'native',      'Sandbox via separate Clio test account'),
  -- MyCase backfill
  ('mycase', 'token_refresh',    'Token Refresh',            true,  'conditional', 'API-key auth has no expiry; OAuth flow refreshes when used'),
  ('mycase', 'deauth_callback',  'Deauthorization Callback', false, 'unsupported', 'MyCase does not push deauth notifications'),
  ('mycase', 'lead_sync',        'Lead Sync',                false, 'unsupported', 'MyCase has no native lead object'),
  ('mycase', 'activity_sync',    'Activity Sync',            true,  'conditional', 'Available where MyCase Open API access includes activities'),
  ('mycase', 'webhook_receive',  'Webhook Receive',          true,  'conditional', 'Webhooks must be enabled per tenant by MyCase'),
  ('mycase', 'webhook_renewal',  'Webhook Renewal',          false, 'unsupported', 'MyCase webhook subscriptions are persistent'),
  ('mycase', 'reverse_sync',     'Reverse Sync',             true,  'conditional', 'Webhook-based when enabled; polling fallback otherwise'),
  ('mycase', 'test_simulation',  'Test Simulation',          true,  'native',      'Sandbox tenant available on request')
ON CONFLICT (provider, capability_key) DO UPDATE
  SET supported = EXCLUDED.supported,
      support_mode = EXCLUDED.support_mode,
      capability_name = EXCLUDED.capability_name,
      notes = EXCLUDED.notes,
      updated_at = now();

-- ──────────────────────────────────────────────────────────────────
-- Phase 5: Five9 call variable groups + variables
-- ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.five9_call_variable_groups (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  campaign_id     uuid REFERENCES public.legal_connect_campaigns(id) ON DELETE SET NULL,
  group_name      text NOT NULL,
  display_label   text,
  description     text,
  display_order   integer NOT NULL DEFAULT 100,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, group_name)
);

ALTER TABLE public.five9_call_variable_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master admin full access on call var groups"
  ON public.five9_call_variable_groups FOR ALL
  USING (is_master_admin(auth.uid()))
  WITH CHECK (is_master_admin(auth.uid()));

CREATE POLICY "Org members can view own call var groups"
  ON public.five9_call_variable_groups FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org owners/admins can manage call var groups"
  ON public.five9_call_variable_groups FOR ALL
  USING (is_org_owner_or_admin(auth.uid(), organization_id))
  WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));

CREATE TRIGGER update_five9_call_variable_groups_updated_at
  BEFORE UPDATE ON public.five9_call_variable_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_f9_var_groups_client ON public.five9_call_variable_groups (client_id);

-- ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.five9_call_variables (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id           uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  group_id            uuid REFERENCES public.five9_call_variable_groups(id) ON DELETE SET NULL,
  campaign_id         uuid REFERENCES public.legal_connect_campaigns(id) ON DELETE SET NULL,
  internal_name       text NOT NULL,
  display_label       text NOT NULL,
  data_type           text NOT NULL DEFAULT 'string',
  required            boolean NOT NULL DEFAULT false,
  default_value       text,
  validation_rules    jsonb NOT NULL DEFAULT '{}'::jsonb,
  enum_values         jsonb NOT NULL DEFAULT '[]'::jsonb,
  fabric59_field_path text,
  description         text,
  display_order       integer NOT NULL DEFAULT 100,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, internal_name),
  CHECK (data_type IN ('string','number','boolean','date','datetime','enum','phone','email'))
);

ALTER TABLE public.five9_call_variables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master admin full access on call vars"
  ON public.five9_call_variables FOR ALL
  USING (is_master_admin(auth.uid()))
  WITH CHECK (is_master_admin(auth.uid()));

CREATE POLICY "Org members can view own call vars"
  ON public.five9_call_variables FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org owners/admins can manage call vars"
  ON public.five9_call_variables FOR ALL
  USING (is_org_owner_or_admin(auth.uid(), organization_id))
  WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));

CREATE TRIGGER update_five9_call_variables_updated_at
  BEFORE UPDATE ON public.five9_call_variables
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_f9_vars_client ON public.five9_call_variables (client_id);
CREATE INDEX idx_f9_vars_group ON public.five9_call_variables (group_id);

-- ──────────────────────────────────────────────────────────────────
-- Phase 5: Five9 event log (canonical normalized event audit)
-- ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.five9_event_log (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  resolved_client_id   uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  resolved_provider    text,
  five9_domain         text,
  campaign_name        text,
  dnis                 text,
  ani                  text,
  event_type           text NOT NULL,
  raw_payload          jsonb NOT NULL DEFAULT '{}'::jsonb,
  normalized_payload   jsonb NOT NULL DEFAULT '{}'::jsonb,
  mapped_actions       jsonb NOT NULL DEFAULT '[]'::jsonb,
  sync_jobs_created    uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  correlation_id       text NOT NULL,
  status               text NOT NULL DEFAULT 'received',
  error                text,
  processing_time_ms   integer,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CHECK (event_type IN ('interaction_started','lookup_requested','interaction_updated','disposition_submitted','callback_requested','post_call_sync','test','replay')),
  CHECK (status IN ('received','normalized','routed','mapped','queued','completed','failed','review_queued'))
);

ALTER TABLE public.five9_event_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master admin full access on five9 event log"
  ON public.five9_event_log FOR ALL
  USING (is_master_admin(auth.uid()))
  WITH CHECK (is_master_admin(auth.uid()));

CREATE POLICY "Org members can view own five9 events"
  ON public.five9_event_log FOR SELECT
  USING (organization_id IS NULL OR is_org_member(auth.uid(), organization_id));

CREATE POLICY "Service role inserts five9 events"
  ON public.five9_event_log FOR INSERT
  WITH CHECK (true);

CREATE TRIGGER update_five9_event_log_updated_at
  BEFORE UPDATE ON public.five9_event_log
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_f9_event_log_correlation ON public.five9_event_log (correlation_id);
CREATE INDEX idx_f9_event_log_client ON public.five9_event_log (resolved_client_id);
CREATE INDEX idx_f9_event_log_status ON public.five9_event_log (status, created_at DESC);
CREATE INDEX idx_f9_event_log_created ON public.five9_event_log (created_at DESC);

-- ──────────────────────────────────────────────────────────────────
-- Phase 5: Five9 campaign routes
-- ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.five9_campaign_routes (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id             uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  five9_domain                text NOT NULL,
  campaign_name               text,
  dnis                        text,
  queue_id                    text,
  client_id                   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider_target             text,
  default_disposition_policy  text NOT NULL DEFAULT 'review',
  notes                       text,
  is_active                   boolean NOT NULL DEFAULT true,
  priority                    integer NOT NULL DEFAULT 100,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  CHECK (provider_target IS NULL OR provider_target IN ('clio','mycase','smokeball')),
  CHECK (default_disposition_policy IN ('review','auto_create','log_only','attach_only'))
);

ALTER TABLE public.five9_campaign_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master admin full access on five9 routes"
  ON public.five9_campaign_routes FOR ALL
  USING (is_master_admin(auth.uid()))
  WITH CHECK (is_master_admin(auth.uid()));

CREATE POLICY "Org members can view own five9 routes"
  ON public.five9_campaign_routes FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org owners/admins manage five9 routes"
  ON public.five9_campaign_routes FOR ALL
  USING (is_org_owner_or_admin(auth.uid(), organization_id))
  WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));

CREATE TRIGGER update_five9_campaign_routes_updated_at
  BEFORE UPDATE ON public.five9_campaign_routes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_f9_routes_domain_campaign ON public.five9_campaign_routes (five9_domain, campaign_name);
CREATE INDEX idx_f9_routes_client ON public.five9_campaign_routes (client_id);

-- ──────────────────────────────────────────────────────────────────
-- Phase 5: Disposition mapping extensions
-- ──────────────────────────────────────────────────────────────────

ALTER TABLE public.legal_connect_disposition_mappings
  ADD COLUMN IF NOT EXISTS provider_target text,
  ADD COLUMN IF NOT EXISTS required_call_variables text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS is_open_disposition boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reporting_value text,
  ADD COLUMN IF NOT EXISTS unsupported_action_behavior text NOT NULL DEFAULT 'review_queue';

ALTER TABLE public.legal_connect_disposition_mappings
  DROP CONSTRAINT IF EXISTS lc_disp_mappings_provider_target_check;

ALTER TABLE public.legal_connect_disposition_mappings
  ADD CONSTRAINT lc_disp_mappings_provider_target_check
  CHECK (provider_target IS NULL OR provider_target IN ('clio','mycase','smokeball'));

ALTER TABLE public.legal_connect_disposition_mappings
  DROP CONSTRAINT IF EXISTS lc_disp_mappings_unsupported_behavior_check;

ALTER TABLE public.legal_connect_disposition_mappings
  ADD CONSTRAINT lc_disp_mappings_unsupported_behavior_check
  CHECK (unsupported_action_behavior IN ('review_queue','drop','log_only'));
