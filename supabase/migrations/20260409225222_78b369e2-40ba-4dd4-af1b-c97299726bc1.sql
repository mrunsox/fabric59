
-- ============================================================
-- LEGAL CONNECT MODULE — DATABASE FOUNDATION
-- ============================================================

-- 1. legal_connect_connections
CREATE TABLE public.legal_connect_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('clio','mycase','lawmatics','litify','cosmolex','practicepanther','five9')),
  connection_name text,
  status text NOT NULL DEFAULT 'not_connected' CHECK (status IN ('not_connected','connected','expired','error','revoked','testing')),
  auth_type text,
  provider_account_id text,
  provider_region text,
  base_url text,
  scopes jsonb DEFAULT '[]'::jsonb,
  encrypted_access_token text,
  encrypted_refresh_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  deauth_callback_enabled boolean DEFAULT false,
  last_connected_at timestamptz,
  last_refreshed_at timestamptz,
  last_error_at timestamptz,
  last_error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lc_connections_client_provider ON public.legal_connect_connections(client_id, provider);
CREATE INDEX idx_lc_connections_status ON public.legal_connect_connections(status);
CREATE INDEX idx_lc_connections_token_expiry ON public.legal_connect_connections(access_token_expires_at);
ALTER TABLE public.legal_connect_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view connections" ON public.legal_connect_connections FOR SELECT USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "Org owners/admins can manage connections" ON public.legal_connect_connections FOR ALL USING (is_org_owner_or_admin(auth.uid(), organization_id)) WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));
CREATE POLICY "Platform admins can manage all connections" ON public.legal_connect_connections FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Master admin can manage all connections" ON public.legal_connect_connections FOR ALL USING (is_master_admin(auth.uid())) WITH CHECK (is_master_admin(auth.uid()));

CREATE TRIGGER update_lc_connections_updated_at BEFORE UPDATE ON public.legal_connect_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. legal_connect_provider_capabilities
CREATE TABLE public.legal_connect_provider_capabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  capability_key text NOT NULL,
  capability_name text NOT NULL,
  supported boolean NOT NULL DEFAULT true,
  support_mode text NOT NULL DEFAULT 'native' CHECK (support_mode IN ('native','conditional','manual_only','unsupported')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, capability_key)
);
ALTER TABLE public.legal_connect_provider_capabilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view provider capabilities" ON public.legal_connect_provider_capabilities FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Platform admins can manage provider capabilities" ON public.legal_connect_provider_capabilities FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Master admin can manage all provider capabilities" ON public.legal_connect_provider_capabilities FOR ALL USING (is_master_admin(auth.uid())) WITH CHECK (is_master_admin(auth.uid()));

CREATE TRIGGER update_lc_provider_caps_updated_at BEFORE UPDATE ON public.legal_connect_provider_capabilities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. legal_connect_client_capabilities
CREATE TABLE public.legal_connect_client_capabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider text NOT NULL,
  capability_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  mode text NOT NULL DEFAULT 'auto' CHECK (mode IN ('auto','manual_review','disabled')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, provider, capability_key)
);
ALTER TABLE public.legal_connect_client_capabilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view client capabilities" ON public.legal_connect_client_capabilities FOR SELECT USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "Org owners/admins can manage client capabilities" ON public.legal_connect_client_capabilities FOR ALL USING (is_org_owner_or_admin(auth.uid(), organization_id)) WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));
CREATE POLICY "Platform admins can manage all client capabilities" ON public.legal_connect_client_capabilities FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Master admin can manage all client capabilities" ON public.legal_connect_client_capabilities FOR ALL USING (is_master_admin(auth.uid())) WITH CHECK (is_master_admin(auth.uid()));

CREATE TRIGGER update_lc_client_caps_updated_at BEFORE UPDATE ON public.legal_connect_client_capabilities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. legal_connect_campaigns
CREATE TABLE public.legal_connect_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider_connection_id uuid REFERENCES public.legal_connect_connections(id) ON DELETE SET NULL,
  five9_campaign_name text,
  five9_campaign_id text,
  dnis text,
  queue_name text,
  agent_group text,
  campaign_type text NOT NULL DEFAULT 'inbound_intake' CHECK (campaign_type IN ('inbound_intake','inbound_support','callbacks','consult_booking','overflow','after_hours','vip')),
  active boolean NOT NULL DEFAULT true,
  script_template_key text,
  lookup_on_call_start boolean NOT NULL DEFAULT true,
  submit_on_disposition boolean NOT NULL DEFAULT true,
  submit_on_acw_complete boolean NOT NULL DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lc_campaigns_client_name ON public.legal_connect_campaigns(client_id, five9_campaign_name);
CREATE INDEX idx_lc_campaigns_client_dnis ON public.legal_connect_campaigns(client_id, dnis);
ALTER TABLE public.legal_connect_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view campaigns" ON public.legal_connect_campaigns FOR SELECT USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "Org owners/admins can manage campaigns" ON public.legal_connect_campaigns FOR ALL USING (is_org_owner_or_admin(auth.uid(), organization_id)) WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));
CREATE POLICY "Platform admins can manage all campaigns" ON public.legal_connect_campaigns FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Master admin can manage all campaigns" ON public.legal_connect_campaigns FOR ALL USING (is_master_admin(auth.uid())) WITH CHECK (is_master_admin(auth.uid()));

CREATE TRIGGER update_lc_campaigns_updated_at BEFORE UPDATE ON public.legal_connect_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. legal_connect_disposition_mappings
CREATE TABLE public.legal_connect_disposition_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.legal_connect_campaigns(id) ON DELETE CASCADE,
  disposition_code text NOT NULL,
  disposition_label text,
  action_profile_key text,
  create_contact boolean NOT NULL DEFAULT false,
  update_contact boolean NOT NULL DEFAULT true,
  create_matter boolean NOT NULL DEFAULT false,
  attach_to_existing_matter boolean NOT NULL DEFAULT true,
  create_note boolean NOT NULL DEFAULT true,
  create_task boolean NOT NULL DEFAULT false,
  create_callback boolean NOT NULL DEFAULT false,
  create_activity boolean NOT NULL DEFAULT false,
  create_time_entry boolean NOT NULL DEFAULT false,
  mark_consult_booked boolean NOT NULL DEFAULT false,
  send_to_manual_review boolean NOT NULL DEFAULT false,
  require_call_notes boolean NOT NULL DEFAULT false,
  require_followup_date boolean NOT NULL DEFAULT false,
  crm_status_target text,
  priority integer NOT NULL DEFAULT 100,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.legal_connect_disposition_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view disposition mappings" ON public.legal_connect_disposition_mappings FOR SELECT USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "Org owners/admins can manage disposition mappings" ON public.legal_connect_disposition_mappings FOR ALL USING (is_org_owner_or_admin(auth.uid(), organization_id)) WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));
CREATE POLICY "Platform admins can manage all disposition mappings" ON public.legal_connect_disposition_mappings FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Master admin can manage all disposition mappings" ON public.legal_connect_disposition_mappings FOR ALL USING (is_master_admin(auth.uid())) WITH CHECK (is_master_admin(auth.uid()));

CREATE TRIGGER update_lc_dispo_mappings_updated_at BEFORE UPDATE ON public.legal_connect_disposition_mappings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. legal_connect_call_variable_mappings
CREATE TABLE public.legal_connect_call_variable_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.legal_connect_campaigns(id) ON DELETE CASCADE,
  variable_name text NOT NULL,
  variable_label text,
  variable_type text,
  source_location text NOT NULL DEFAULT 'five9_call_variable' CHECK (source_location IN ('five9_call_variable','five9_disposition_field','five9_connector_param','derived')),
  canonical_field text,
  target_entity text,
  provider_field_path text,
  pass_through_mode text NOT NULL DEFAULT 'allow' CHECK (pass_through_mode IN ('allow','block','review','hash','redact')),
  required boolean NOT NULL DEFAULT false,
  sensitive boolean NOT NULL DEFAULT false,
  transform_rule text,
  default_value text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.legal_connect_call_variable_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view call variable mappings" ON public.legal_connect_call_variable_mappings FOR SELECT USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "Org owners/admins can manage call variable mappings" ON public.legal_connect_call_variable_mappings FOR ALL USING (is_org_owner_or_admin(auth.uid(), organization_id)) WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));
CREATE POLICY "Platform admins can manage all call variable mappings" ON public.legal_connect_call_variable_mappings FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Master admin can manage all call variable mappings" ON public.legal_connect_call_variable_mappings FOR ALL USING (is_master_admin(auth.uid())) WITH CHECK (is_master_admin(auth.uid()));

CREATE TRIGGER update_lc_cv_mappings_updated_at BEFORE UPDATE ON public.legal_connect_call_variable_mappings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. legal_connect_field_policies
CREATE TABLE public.legal_connect_field_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider text NOT NULL,
  entity_name text NOT NULL,
  canonical_field text,
  direction text NOT NULL CHECK (direction IN ('five9_to_crm','crm_to_fabric','bidirectional')),
  mode text NOT NULL DEFAULT 'allow' CHECK (mode IN ('allow','block','manual_review','read_only','redact','hash')),
  sensitivity_level text NOT NULL DEFAULT 'normal' CHECK (sensitivity_level IN ('normal','confidential','privileged','regulated')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.legal_connect_field_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view field policies" ON public.legal_connect_field_policies FOR SELECT USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "Org owners/admins can manage field policies" ON public.legal_connect_field_policies FOR ALL USING (is_org_owner_or_admin(auth.uid(), organization_id)) WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));
CREATE POLICY "Platform admins can manage all field policies" ON public.legal_connect_field_policies FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Master admin can manage all field policies" ON public.legal_connect_field_policies FOR ALL USING (is_master_admin(auth.uid())) WITH CHECK (is_master_admin(auth.uid()));

CREATE TRIGGER update_lc_field_policies_updated_at BEFORE UPDATE ON public.legal_connect_field_policies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. legal_connect_policy_profiles
CREATE TABLE public.legal_connect_policy_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  allow_contact_create boolean NOT NULL DEFAULT true,
  allow_contact_update boolean NOT NULL DEFAULT true,
  allow_matter_create boolean NOT NULL DEFAULT false,
  allow_matter_update boolean NOT NULL DEFAULT true,
  allow_task_create boolean NOT NULL DEFAULT true,
  allow_note_create boolean NOT NULL DEFAULT true,
  allow_activity_create boolean NOT NULL DEFAULT false,
  allow_time_entry_create boolean NOT NULL DEFAULT false,
  allow_callback_create boolean NOT NULL DEFAULT true,
  allow_sensitive_field_sync boolean NOT NULL DEFAULT false,
  ambiguous_match_mode text NOT NULL DEFAULT 'manual_review' CHECK (ambiguous_match_mode IN ('manual_review','strict_block','permissive_best_match')),
  duplicate_prevention_mode text NOT NULL DEFAULT 'balanced' CHECK (duplicate_prevention_mode IN ('strict','balanced','permissive')),
  unknown_caller_mode text NOT NULL DEFAULT 'manual_review' CHECK (unknown_caller_mode IN ('create_contact_only','manual_review','block')),
  unmatched_matter_mode text NOT NULL DEFAULT 'manual_review' CHECK (unmatched_matter_mode IN ('attach_contact_only','manual_review','create_matter_if_mapped')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.legal_connect_policy_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view policy profiles" ON public.legal_connect_policy_profiles FOR SELECT USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "Org owners/admins can manage policy profiles" ON public.legal_connect_policy_profiles FOR ALL USING (is_org_owner_or_admin(auth.uid(), organization_id)) WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));
CREATE POLICY "Platform admins can manage all policy profiles" ON public.legal_connect_policy_profiles FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Master admin can manage all policy profiles" ON public.legal_connect_policy_profiles FOR ALL USING (is_master_admin(auth.uid())) WITH CHECK (is_master_admin(auth.uid()));

CREATE TRIGGER update_lc_policy_profiles_updated_at BEFORE UPDATE ON public.legal_connect_policy_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. legal_connect_contacts
CREATE TABLE public.legal_connect_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  full_name text,
  first_name text,
  last_name text,
  email text,
  phone_e164 text,
  alt_phone_e164 text,
  organization_name text,
  status text DEFAULT 'active',
  source_provider text,
  source_updated_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lc_contacts_phone ON public.legal_connect_contacts(client_id, phone_e164);
CREATE INDEX idx_lc_contacts_email ON public.legal_connect_contacts(client_id, email);
CREATE INDEX idx_lc_contacts_name ON public.legal_connect_contacts(client_id, full_name);
ALTER TABLE public.legal_connect_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view contacts" ON public.legal_connect_contacts FOR SELECT USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "Org owners/admins can manage contacts" ON public.legal_connect_contacts FOR ALL USING (is_org_owner_or_admin(auth.uid(), organization_id)) WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));
CREATE POLICY "Platform admins can manage all contacts" ON public.legal_connect_contacts FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Master admin can manage all contacts" ON public.legal_connect_contacts FOR ALL USING (is_master_admin(auth.uid())) WITH CHECK (is_master_admin(auth.uid()));

CREATE TRIGGER update_lc_contacts_updated_at BEFORE UPDATE ON public.legal_connect_contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. legal_connect_matters
CREATE TABLE public.legal_connect_matters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  matter_name text,
  matter_number text,
  status text DEFAULT 'open',
  practice_area text,
  primary_contact_id uuid REFERENCES public.legal_connect_contacts(id) ON DELETE SET NULL,
  source_provider text,
  source_updated_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.legal_connect_matters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view matters" ON public.legal_connect_matters FOR SELECT USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "Org owners/admins can manage matters" ON public.legal_connect_matters FOR ALL USING (is_org_owner_or_admin(auth.uid(), organization_id)) WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));
CREATE POLICY "Platform admins can manage all matters" ON public.legal_connect_matters FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Master admin can manage all matters" ON public.legal_connect_matters FOR ALL USING (is_master_admin(auth.uid())) WITH CHECK (is_master_admin(auth.uid()));

CREATE TRIGGER update_lc_matters_updated_at BEFORE UPDATE ON public.legal_connect_matters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. legal_connect_tasks
CREATE TABLE public.legal_connect_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_at timestamptz,
  status text DEFAULT 'pending',
  assigned_to text,
  related_contact_id uuid REFERENCES public.legal_connect_contacts(id) ON DELETE SET NULL,
  related_matter_id uuid REFERENCES public.legal_connect_matters(id) ON DELETE SET NULL,
  source_provider text,
  source_updated_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.legal_connect_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view tasks" ON public.legal_connect_tasks FOR SELECT USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "Org owners/admins can manage tasks" ON public.legal_connect_tasks FOR ALL USING (is_org_owner_or_admin(auth.uid(), organization_id)) WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));
CREATE POLICY "Platform admins can manage all tasks" ON public.legal_connect_tasks FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Master admin can manage all tasks" ON public.legal_connect_tasks FOR ALL USING (is_master_admin(auth.uid())) WITH CHECK (is_master_admin(auth.uid()));

CREATE TRIGGER update_lc_tasks_updated_at BEFORE UPDATE ON public.legal_connect_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 12. legal_connect_notes
CREATE TABLE public.legal_connect_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  body text,
  note_type text,
  related_contact_id uuid REFERENCES public.legal_connect_contacts(id) ON DELETE SET NULL,
  related_matter_id uuid REFERENCES public.legal_connect_matters(id) ON DELETE SET NULL,
  call_id text,
  disposition_code text,
  source_provider text,
  source_updated_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.legal_connect_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view notes" ON public.legal_connect_notes FOR SELECT USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "Org owners/admins can manage notes" ON public.legal_connect_notes FOR ALL USING (is_org_owner_or_admin(auth.uid(), organization_id)) WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));
CREATE POLICY "Platform admins can manage all notes" ON public.legal_connect_notes FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Master admin can manage all notes" ON public.legal_connect_notes FOR ALL USING (is_master_admin(auth.uid())) WITH CHECK (is_master_admin(auth.uid()));

CREATE TRIGGER update_lc_notes_updated_at BEFORE UPDATE ON public.legal_connect_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 13. legal_connect_entity_links
CREATE TABLE public.legal_connect_entity_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider text NOT NULL,
  entity_type text NOT NULL,
  canonical_entity_id uuid NOT NULL,
  provider_entity_id text NOT NULL,
  provider_parent_entity_id text,
  sync_hash text,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, provider, entity_type, provider_entity_id)
);
ALTER TABLE public.legal_connect_entity_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view entity links" ON public.legal_connect_entity_links FOR SELECT USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "Org owners/admins can manage entity links" ON public.legal_connect_entity_links FOR ALL USING (is_org_owner_or_admin(auth.uid(), organization_id)) WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));
CREATE POLICY "Platform admins can manage all entity links" ON public.legal_connect_entity_links FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Master admin can manage all entity links" ON public.legal_connect_entity_links FOR ALL USING (is_master_admin(auth.uid())) WITH CHECK (is_master_admin(auth.uid()));

CREATE TRIGGER update_lc_entity_links_updated_at BEFORE UPDATE ON public.legal_connect_entity_links FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 14. legal_connect_webhook_subscriptions
CREATE TABLE public.legal_connect_webhook_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider text NOT NULL,
  connection_id uuid REFERENCES public.legal_connect_connections(id) ON DELETE CASCADE,
  remote_webhook_id text,
  model_name text,
  events text[],
  callback_url text,
  secret_reference text,
  verification_status text,
  subscribed_at timestamptz,
  expires_at timestamptz,
  renew_after timestamptz,
  last_delivery_at timestamptz,
  last_failure_at timestamptz,
  failure_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','renewing','failed','revoked')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.legal_connect_webhook_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view webhook subscriptions" ON public.legal_connect_webhook_subscriptions FOR SELECT USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "Org owners/admins can manage webhook subscriptions" ON public.legal_connect_webhook_subscriptions FOR ALL USING (is_org_owner_or_admin(auth.uid(), organization_id)) WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));
CREATE POLICY "Platform admins can manage all webhook subscriptions" ON public.legal_connect_webhook_subscriptions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Master admin can manage all webhook subscriptions" ON public.legal_connect_webhook_subscriptions FOR ALL USING (is_master_admin(auth.uid())) WITH CHECK (is_master_admin(auth.uid()));

CREATE TRIGGER update_lc_webhook_subs_updated_at BEFORE UPDATE ON public.legal_connect_webhook_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 15. legal_connect_event_log (immutable)
CREATE TABLE public.legal_connect_event_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider text,
  direction text NOT NULL CHECK (direction IN ('inbound','outbound','internal')),
  source_type text NOT NULL CHECK (source_type IN ('five9','clio','mycase','fabric')),
  source_event_type text,
  event_key text,
  correlation_id text,
  call_id text,
  campaign_id uuid,
  payload jsonb,
  normalized_payload jsonb,
  processing_status text NOT NULL DEFAULT 'received' CHECK (processing_status IN ('received','queued','processed','failed','ignored','review')),
  failure_reason text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lc_event_log_correlation ON public.legal_connect_event_log(client_id, correlation_id);
CREATE INDEX idx_lc_event_log_call ON public.legal_connect_event_log(call_id);
CREATE INDEX idx_lc_event_log_status ON public.legal_connect_event_log(processing_status);
CREATE INDEX idx_lc_event_log_received ON public.legal_connect_event_log(received_at DESC);
ALTER TABLE public.legal_connect_event_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view event log" ON public.legal_connect_event_log FOR SELECT USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "Org members can insert event log" ON public.legal_connect_event_log FOR INSERT WITH CHECK (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "Platform admins can manage all event log" ON public.legal_connect_event_log FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Master admin can manage all event log" ON public.legal_connect_event_log FOR ALL USING (is_master_admin(auth.uid())) WITH CHECK (is_master_admin(auth.uid()));

-- 16. legal_connect_sync_jobs
CREATE TABLE public.legal_connect_sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider text NOT NULL,
  job_type text NOT NULL,
  direction text,
  priority integer NOT NULL DEFAULT 100,
  idempotency_key text UNIQUE,
  correlation_id text,
  source_event_log_id uuid REFERENCES public.legal_connect_event_log(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','succeeded','failed','retrying','dead_letter','review')),
  attempt_count integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 10,
  next_attempt_at timestamptz,
  last_attempt_at timestamptz,
  succeeded_at timestamptz,
  failed_at timestamptz,
  failure_reason text,
  input_payload jsonb,
  output_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lc_sync_jobs_status ON public.legal_connect_sync_jobs(status, next_attempt_at);
ALTER TABLE public.legal_connect_sync_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view sync jobs" ON public.legal_connect_sync_jobs FOR SELECT USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "Org members can insert sync jobs" ON public.legal_connect_sync_jobs FOR INSERT WITH CHECK (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "Org owners/admins can manage sync jobs" ON public.legal_connect_sync_jobs FOR ALL USING (is_org_owner_or_admin(auth.uid(), organization_id)) WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));
CREATE POLICY "Platform admins can manage all sync jobs" ON public.legal_connect_sync_jobs FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Master admin can manage all sync jobs" ON public.legal_connect_sync_jobs FOR ALL USING (is_master_admin(auth.uid())) WITH CHECK (is_master_admin(auth.uid()));

CREATE TRIGGER update_lc_sync_jobs_updated_at BEFORE UPDATE ON public.legal_connect_sync_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 17. legal_connect_conflicts
CREATE TABLE public.legal_connect_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider text,
  conflict_type text NOT NULL CHECK (conflict_type IN ('duplicate_contact','duplicate_matter','ambiguous_match','blocked_field','unsupported_action','token_error','webhook_error','mapping_error')),
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  related_event_log_id uuid REFERENCES public.legal_connect_event_log(id) ON DELETE SET NULL,
  related_sync_job_id uuid REFERENCES public.legal_connect_sync_jobs(id) ON DELETE SET NULL,
  canonical_entity_type text,
  canonical_entity_id uuid,
  suggested_resolution text,
  resolution_status text NOT NULL DEFAULT 'open' CHECK (resolution_status IN ('open','in_review','resolved','dismissed')),
  assigned_to uuid,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
ALTER TABLE public.legal_connect_conflicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view conflicts" ON public.legal_connect_conflicts FOR SELECT USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "Org owners/admins can manage conflicts" ON public.legal_connect_conflicts FOR ALL USING (is_org_owner_or_admin(auth.uid(), organization_id)) WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));
CREATE POLICY "Platform admins can manage all conflicts" ON public.legal_connect_conflicts FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Master admin can manage all conflicts" ON public.legal_connect_conflicts FOR ALL USING (is_master_admin(auth.uid())) WITH CHECK (is_master_admin(auth.uid()));

CREATE TRIGGER update_lc_conflicts_updated_at BEFORE UPDATE ON public.legal_connect_conflicts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 18. legal_connect_review_queue
CREATE TABLE public.legal_connect_review_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider text,
  review_type text NOT NULL,
  title text NOT NULL,
  description text,
  event_log_id uuid REFERENCES public.legal_connect_event_log(id) ON DELETE SET NULL,
  sync_job_id uuid REFERENCES public.legal_connect_sync_jobs(id) ON DELETE SET NULL,
  recommended_action text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','applied')),
  action_payload jsonb,
  created_by uuid,
  acted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  acted_at timestamptz
);
ALTER TABLE public.legal_connect_review_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view review queue" ON public.legal_connect_review_queue FOR SELECT USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "Org owners/admins can manage review queue" ON public.legal_connect_review_queue FOR ALL USING (is_org_owner_or_admin(auth.uid(), organization_id)) WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));
CREATE POLICY "Platform admins can manage all review queue" ON public.legal_connect_review_queue FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Master admin can manage all review queue" ON public.legal_connect_review_queue FOR ALL USING (is_master_admin(auth.uid())) WITH CHECK (is_master_admin(auth.uid()));

CREATE TRIGGER update_lc_review_queue_updated_at BEFORE UPDATE ON public.legal_connect_review_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 19. legal_connect_ai_sessions
CREATE TABLE public.legal_connect_ai_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  session_type text NOT NULL CHECK (session_type IN ('setup','test_plan','pass_through_explainer','mapping_recommendation','campaign_setup')),
  input_context jsonb,
  output_markdown text,
  output_json jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.legal_connect_ai_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view AI sessions" ON public.legal_connect_ai_sessions FOR SELECT USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "Org members can insert AI sessions" ON public.legal_connect_ai_sessions FOR INSERT WITH CHECK (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "Platform admins can manage all AI sessions" ON public.legal_connect_ai_sessions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Master admin can manage all AI sessions" ON public.legal_connect_ai_sessions FOR ALL USING (is_master_admin(auth.uid())) WITH CHECK (is_master_admin(auth.uid()));

-- 20. legal_connect_ai_checklists
CREATE TABLE public.legal_connect_ai_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  checklist_type text NOT NULL CHECK (checklist_type IN ('five9_campaign','clio_setup','mycase_setup','go_live','testing')),
  title text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ready','completed')),
  checklist_items jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.legal_connect_ai_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view AI checklists" ON public.legal_connect_ai_checklists FOR SELECT USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "Org owners/admins can manage AI checklists" ON public.legal_connect_ai_checklists FOR ALL USING (is_org_owner_or_admin(auth.uid(), organization_id)) WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));
CREATE POLICY "Platform admins can manage all AI checklists" ON public.legal_connect_ai_checklists FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Master admin can manage all AI checklists" ON public.legal_connect_ai_checklists FOR ALL USING (is_master_admin(auth.uid())) WITH CHECK (is_master_admin(auth.uid()));

CREATE TRIGGER update_lc_ai_checklists_updated_at BEFORE UPDATE ON public.legal_connect_ai_checklists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SEED: Provider Capabilities for Clio and MyCase
-- ============================================================
INSERT INTO public.legal_connect_provider_capabilities (provider, capability_key, capability_name, supported, support_mode, notes) VALUES
  ('clio', 'contacts.read', 'Read Contacts', true, 'native', 'Full contact read via API'),
  ('clio', 'contacts.create', 'Create Contacts', true, 'native', NULL),
  ('clio', 'contacts.update', 'Update Contacts', true, 'native', NULL),
  ('clio', 'matters.read', 'Read Matters', true, 'native', NULL),
  ('clio', 'matters.create', 'Create Matters', true, 'native', NULL),
  ('clio', 'matters.update', 'Update Matters', true, 'native', NULL),
  ('clio', 'tasks.read', 'Read Tasks', true, 'native', NULL),
  ('clio', 'tasks.create', 'Create Tasks', true, 'native', NULL),
  ('clio', 'tasks.update', 'Update Tasks', true, 'native', NULL),
  ('clio', 'notes.create', 'Create Notes', true, 'native', 'Via Communications endpoint'),
  ('clio', 'communications.create', 'Create Communications', true, 'native', NULL),
  ('clio', 'activities.create', 'Create Activities', true, 'native', NULL),
  ('clio', 'time_entries.create', 'Create Time Entries', true, 'native', NULL),
  ('clio', 'webhooks.receive', 'Receive Webhooks', true, 'native', 'Webhooks expire after 3 days unless renewed'),
  ('clio', 'webhooks.subscribe', 'Subscribe Webhooks', true, 'native', 'Must renew before expiry, max 31 days'),
  ('clio', 'auth.oauth', 'OAuth 2.0 Auth', true, 'native', NULL),
  ('clio', 'auth.refresh', 'Token Refresh', true, 'native', NULL),
  ('clio', 'deauth.callback', 'Deauthorization Callback', true, 'native', NULL),
  ('mycase', 'contacts.read', 'Read Contacts', true, 'conditional', 'Depends on API program access'),
  ('mycase', 'contacts.create', 'Create Contacts', true, 'conditional', 'Depends on API program access'),
  ('mycase', 'contacts.update', 'Update Contacts', true, 'conditional', NULL),
  ('mycase', 'matters.read', 'Read Cases', true, 'conditional', 'Cases in MyCase terminology'),
  ('mycase', 'matters.create', 'Create Cases', true, 'conditional', NULL),
  ('mycase', 'matters.update', 'Update Cases', true, 'conditional', NULL),
  ('mycase', 'tasks.read', 'Read Tasks', true, 'conditional', NULL),
  ('mycase', 'tasks.create', 'Create Tasks', true, 'conditional', NULL),
  ('mycase', 'tasks.update', 'Update Tasks', false, 'manual_only', 'Limited update support'),
  ('mycase', 'notes.create', 'Create Notes', true, 'conditional', NULL),
  ('mycase', 'communications.create', 'Create Communications', false, 'unsupported', 'Not available in MyCase API'),
  ('mycase', 'activities.create', 'Create Activities', false, 'unsupported', 'Not available in MyCase API'),
  ('mycase', 'time_entries.create', 'Create Time Entries', false, 'unsupported', NULL),
  ('mycase', 'webhooks.receive', 'Receive Webhooks', true, 'conditional', 'May require enablement'),
  ('mycase', 'webhooks.subscribe', 'Subscribe Webhooks', false, 'manual_only', 'Manual webhook config required'),
  ('mycase', 'auth.oauth', 'OAuth Auth', false, 'unsupported', 'Uses API key auth'),
  ('mycase', 'auth.refresh', 'Token Refresh', false, 'unsupported', 'API key does not expire'),
  ('mycase', 'deauth.callback', 'Deauthorization Callback', false, 'unsupported', NULL);
