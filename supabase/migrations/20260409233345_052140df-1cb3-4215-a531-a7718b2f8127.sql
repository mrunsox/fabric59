
-- 1. Add columns to existing webhook_subscriptions table
ALTER TABLE public.legal_connect_webhook_subscriptions
  ADD COLUMN IF NOT EXISTS health_status text NOT NULL DEFAULT 'healthy',
  ADD COLUMN IF NOT EXISTS disabled_reason text;

-- 2. Webhook renewal log
CREATE TABLE public.legal_connect_webhook_renewal_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id uuid NOT NULL REFERENCES public.legal_connect_webhook_subscriptions(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  action text NOT NULL,
  previous_expires_at timestamptz,
  new_expires_at timestamptz,
  success boolean NOT NULL DEFAULT true,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.legal_connect_webhook_renewal_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view renewal logs"
  ON public.legal_connect_webhook_renewal_log FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can insert renewal logs"
  ON public.legal_connect_webhook_renewal_log FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE INDEX idx_renewal_log_subscription ON public.legal_connect_webhook_renewal_log(subscription_id);
CREATE INDEX idx_renewal_log_org ON public.legal_connect_webhook_renewal_log(organization_id);

-- 3. Test runs
CREATE TABLE public.legal_connect_test_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  test_type text NOT NULL,
  test_category text NOT NULL,
  test_config jsonb NOT NULL DEFAULT '{}',
  expected_output jsonb,
  actual_output jsonb,
  status text NOT NULL DEFAULT 'pending',
  correlation_id text,
  error_message text,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.legal_connect_test_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view test runs"
  ON public.legal_connect_test_runs FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can insert test runs"
  ON public.legal_connect_test_runs FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can update test runs"
  ON public.legal_connect_test_runs FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE INDEX idx_test_runs_org ON public.legal_connect_test_runs(organization_id);
CREATE INDEX idx_test_runs_client ON public.legal_connect_test_runs(client_id);

-- 4. Test plans
CREATE TABLE public.legal_connect_test_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_name text NOT NULL,
  test_cases jsonb NOT NULL DEFAULT '[]',
  generated_by text NOT NULL DEFAULT 'manual',
  provider text,
  campaign_types text[],
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.legal_connect_test_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage test plans"
  ON public.legal_connect_test_plans FOR ALL TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())))
  WITH CHECK (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE INDEX idx_test_plans_org ON public.legal_connect_test_plans(organization_id);

-- 5. Examples library
CREATE TABLE public.legal_connect_examples (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider text NOT NULL,
  category text NOT NULL,
  scenario_key text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  raw_payload jsonb NOT NULL DEFAULT '{}',
  normalized_event jsonb NOT NULL DEFAULT '{}',
  policy_decision jsonb NOT NULL DEFAULT '{}',
  sync_jobs_emitted jsonb NOT NULL DEFAULT '[]',
  review_triggers jsonb NOT NULL DEFAULT '[]',
  capability_check jsonb,
  five9_input jsonb,
  tags text[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.legal_connect_examples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view examples"
  ON public.legal_connect_examples FOR SELECT TO authenticated
  USING (true);

CREATE INDEX idx_examples_provider ON public.legal_connect_examples(provider);
CREATE INDEX idx_examples_category ON public.legal_connect_examples(category);

-- 6. Prompt templates
CREATE TABLE public.legal_connect_prompt_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  prompt_key text NOT NULL,
  role text NOT NULL DEFAULT 'admin',
  category text NOT NULL,
  title text NOT NULL,
  description text,
  system_prompt text NOT NULL,
  input_schema jsonb NOT NULL DEFAULT '{}',
  output_schema jsonb NOT NULL DEFAULT '{}',
  enabled boolean NOT NULL DEFAULT true,
  provider_notes jsonb,
  campaign_type_overrides jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.legal_connect_prompt_templates ENABLE ROW LEVEL SECURITY;

-- Global templates (org_id IS NULL) readable by all authenticated users
CREATE POLICY "Global templates readable by all"
  ON public.legal_connect_prompt_templates FOR SELECT TO authenticated
  USING (organization_id IS NULL OR organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can manage their templates"
  ON public.legal_connect_prompt_templates FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can update their templates"
  ON public.legal_connect_prompt_templates FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can delete their templates"
  ON public.legal_connect_prompt_templates FOR DELETE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE INDEX idx_prompt_templates_org ON public.legal_connect_prompt_templates(organization_id);
CREATE INDEX idx_prompt_templates_key ON public.legal_connect_prompt_templates(prompt_key);
CREATE INDEX idx_prompt_templates_category ON public.legal_connect_prompt_templates(category);

-- Timestamp trigger for prompt templates
CREATE TRIGGER update_prompt_templates_updated_at
  BEFORE UPDATE ON public.legal_connect_prompt_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
