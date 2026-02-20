
-- ============================================================
-- Agent Lifecycle Management Module — 4 new tables
-- ============================================================

-- agents table
CREATE TABLE IF NOT EXISTS public.agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  role text NOT NULL,
  extension text,
  slack_channel text,
  google_user_id text,
  slack_user_id text,
  five9_user_id text,
  five9_username text,
  status text NOT NULL DEFAULT 'active',
  provisioned_by uuid,
  provisioned_at timestamptz NOT NULL DEFAULT now(),
  deprovisioned_by uuid,
  deprovisioned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view agents"
  ON public.agents FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert agents"
  ON public.agents FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_master_admin(auth.uid()));

CREATE POLICY "Admins can update agents"
  ON public.agents FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_master_admin(auth.uid()));

CREATE POLICY "Admins can delete agents"
  ON public.agents FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_master_admin(auth.uid()));

CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- scheduled_jobs table
CREATE TABLE IF NOT EXISTS public.scheduled_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  job_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  scheduled_for timestamptz NOT NULL,
  initiated_by uuid,
  cancelled_by uuid,
  cancelled_at timestamptz,
  config jsonb,
  result jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view scheduled jobs"
  ON public.scheduled_jobs FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert scheduled jobs"
  ON public.scheduled_jobs FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_master_admin(auth.uid()));

CREATE POLICY "Admins can update scheduled jobs"
  ON public.scheduled_jobs FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_master_admin(auth.uid()));

CREATE POLICY "Admins can delete scheduled jobs"
  ON public.scheduled_jobs FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_master_admin(auth.uid()));

CREATE TRIGGER update_scheduled_jobs_updated_at
  BEFORE UPDATE ON public.scheduled_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  details jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Master admin can manage all audit logs"
  ON public.audit_logs FOR ALL
  USING (is_master_admin(auth.uid()))
  WITH CHECK (is_master_admin(auth.uid()));

-- app_config table
CREATE TABLE IF NOT EXISTS public.app_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  description text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read config"
  ON public.app_config FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert config"
  ON public.app_config FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_master_admin(auth.uid()));

CREATE POLICY "Admins can update config"
  ON public.app_config FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_master_admin(auth.uid()));

CREATE TRIGGER update_app_config_updated_at
  BEFORE UPDATE ON public.app_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default email domain config
INSERT INTO public.app_config (key, value, description)
VALUES ('email_domain', 'yourcompany.com', 'Email domain used for provisioning new agents')
ON CONFLICT (key) DO NOTHING;
