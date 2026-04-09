
-- 1. Create legal_connect_tenant_configs table
CREATE TABLE public.legal_connect_tenant_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sandbox_mode BOOLEAN NOT NULL DEFAULT false,
  feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  billing_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  provider_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  onboarding_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, client_id)
);

ALTER TABLE public.legal_connect_tenant_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view tenant configs"
  ON public.legal_connect_tenant_configs FOR SELECT
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Org admins can insert tenant configs"
  ON public.legal_connect_tenant_configs FOR INSERT
  WITH CHECK (public.is_org_owner_or_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update tenant configs"
  ON public.legal_connect_tenant_configs FOR UPDATE
  USING (public.is_org_owner_or_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete tenant configs"
  ON public.legal_connect_tenant_configs FOR DELETE
  USING (public.is_org_owner_or_admin(auth.uid(), organization_id));

CREATE POLICY "Master admins full access to tenant configs"
  ON public.legal_connect_tenant_configs FOR ALL
  USING (public.is_master_admin(auth.uid()));

CREATE TRIGGER update_legal_connect_tenant_configs_updated_at
  BEFORE UPDATE ON public.legal_connect_tenant_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Add is_sandbox to legal_connect_connections
ALTER TABLE public.legal_connect_connections
  ADD COLUMN IF NOT EXISTS is_sandbox BOOLEAN NOT NULL DEFAULT false;

-- 3. Indexes on client_id for all Legal Connect tables
CREATE INDEX IF NOT EXISTS idx_lc_connections_client ON public.legal_connect_connections(client_id);
CREATE INDEX IF NOT EXISTS idx_lc_campaigns_client ON public.legal_connect_campaigns(client_id);
CREATE INDEX IF NOT EXISTS idx_lc_disposition_mappings_client ON public.legal_connect_disposition_mappings(client_id);
CREATE INDEX IF NOT EXISTS idx_lc_call_variable_mappings_client ON public.legal_connect_call_variable_mappings(client_id);
CREATE INDEX IF NOT EXISTS idx_lc_field_policies_client ON public.legal_connect_field_policies(client_id);
CREATE INDEX IF NOT EXISTS idx_lc_policy_profiles_client ON public.legal_connect_policy_profiles(client_id);
CREATE INDEX IF NOT EXISTS idx_lc_contacts_client ON public.legal_connect_contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_lc_matters_client ON public.legal_connect_matters(client_id);
CREATE INDEX IF NOT EXISTS idx_lc_tasks_client ON public.legal_connect_tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_lc_notes_client ON public.legal_connect_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_lc_entity_links_client ON public.legal_connect_entity_links(client_id);
CREATE INDEX IF NOT EXISTS idx_lc_webhook_subs_client ON public.legal_connect_webhook_subscriptions(client_id);
CREATE INDEX IF NOT EXISTS idx_lc_event_log_client ON public.legal_connect_event_log(client_id);
CREATE INDEX IF NOT EXISTS idx_lc_sync_jobs_client ON public.legal_connect_sync_jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_lc_conflicts_client ON public.legal_connect_conflicts(client_id);
CREATE INDEX IF NOT EXISTS idx_lc_review_queue_client ON public.legal_connect_review_queue(client_id);
CREATE INDEX IF NOT EXISTS idx_lc_ai_sessions_client ON public.legal_connect_ai_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_lc_ai_checklists_client ON public.legal_connect_ai_checklists(client_id);
CREATE INDEX IF NOT EXISTS idx_lc_client_capabilities_client ON public.legal_connect_client_capabilities(client_id);
CREATE INDEX IF NOT EXISTS idx_lc_tenant_configs_client ON public.legal_connect_tenant_configs(client_id);

-- 4. Create a safe view that strips encrypted tokens
CREATE OR REPLACE VIEW public.legal_connect_connections_safe AS
SELECT
  id, organization_id, client_id, provider, connection_name, status,
  auth_type, provider_account_id, provider_region, base_url, scopes,
  encrypted_access_token IS NOT NULL AS has_access_token,
  encrypted_refresh_token IS NOT NULL AS has_refresh_token,
  access_token_expires_at, refresh_token_expires_at,
  deauth_callback_enabled, last_connected_at, last_refreshed_at,
  last_error_at, last_error_message, is_sandbox, metadata, created_at, updated_at
FROM public.legal_connect_connections;
