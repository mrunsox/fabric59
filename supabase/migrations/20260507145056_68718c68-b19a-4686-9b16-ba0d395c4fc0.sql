
-- Phase 9: digest schedules
CREATE TABLE IF NOT EXISTS public.legal_connect_digest_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cohort text NOT NULL DEFAULT 'ops' CHECK (cohort IN ('all','design_partners','ops')),
  cadence text NOT NULL DEFAULT 'weekly' CHECK (cadence IN ('weekly','daily')),
  hour_utc smallint NOT NULL DEFAULT 14 CHECK (hour_utc BETWEEN 0 AND 23),
  weekday smallint NOT NULL DEFAULT 1 CHECK (weekday BETWEEN 0 AND 6),
  enabled boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, cohort, cadence)
);
CREATE INDEX IF NOT EXISTS idx_lc_digest_sched_org ON public.legal_connect_digest_schedules(organization_id);
CREATE INDEX IF NOT EXISTS idx_lc_digest_sched_due ON public.legal_connect_digest_schedules(next_run_at) WHERE enabled;

ALTER TABLE public.legal_connect_digest_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org admins manage digest schedules"
  ON public.legal_connect_digest_schedules
  FOR ALL TO authenticated
  USING (is_org_owner_or_admin(auth.uid(), organization_id) OR is_master_admin(auth.uid()) OR is_ops_member(auth.uid()))
  WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id) OR is_master_admin(auth.uid()) OR is_ops_member(auth.uid()));
CREATE POLICY "Org members view digest schedules"
  ON public.legal_connect_digest_schedules
  FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id) OR is_master_admin(auth.uid()) OR is_ops_member(auth.uid()));

CREATE TRIGGER trg_lc_digest_sched_updated
  BEFORE UPDATE ON public.legal_connect_digest_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Escalation sinks
CREATE TABLE IF NOT EXISTS public.legal_connect_escalation_sinks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('slack','webhook')),
  target text NOT NULL,
  hmac_secret text,
  severity_threshold text NOT NULL DEFAULT 'critical' CHECK (severity_threshold IN ('warn','critical')),
  enabled boolean NOT NULL DEFAULT true,
  last_fired_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lc_esc_sinks_org ON public.legal_connect_escalation_sinks(organization_id);

ALTER TABLE public.legal_connect_escalation_sinks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org admins manage escalation sinks"
  ON public.legal_connect_escalation_sinks
  FOR ALL TO authenticated
  USING (is_org_owner_or_admin(auth.uid(), organization_id) OR is_master_admin(auth.uid()) OR is_ops_member(auth.uid()))
  WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id) OR is_master_admin(auth.uid()) OR is_ops_member(auth.uid()));
CREATE POLICY "Org members view escalation sinks"
  ON public.legal_connect_escalation_sinks
  FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id) OR is_master_admin(auth.uid()) OR is_ops_member(auth.uid()));

CREATE TRIGGER trg_lc_esc_sinks_updated
  BEFORE UPDATE ON public.legal_connect_escalation_sinks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Escalation events log
CREATE TABLE IF NOT EXISTS public.legal_connect_escalation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sink_id uuid REFERENCES public.legal_connect_escalation_sinks(id) ON DELETE SET NULL,
  trigger_kind text NOT NULL,
  severity text NOT NULL,
  payload jsonb NOT NULL,
  delivery_status text NOT NULL DEFAULT 'pending',
  delivery_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lc_esc_events_org ON public.legal_connect_escalation_events(organization_id, created_at DESC);

ALTER TABLE public.legal_connect_escalation_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members view escalation events"
  ON public.legal_connect_escalation_events
  FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id) OR is_master_admin(auth.uid()) OR is_ops_member(auth.uid()));

-- Augment digest_runs with rendered HTML + error, where present
ALTER TABLE public.legal_connect_digest_runs
  ADD COLUMN IF NOT EXISTS last_html text,
  ADD COLUMN IF NOT EXISTS delivery_error text;
