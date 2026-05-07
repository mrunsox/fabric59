
-- ============== Retention policies ==============
CREATE TABLE public.legal_connect_retention_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category text NOT NULL,
  retention_days integer NOT NULL CHECK (retention_days BETWEEN 1 AND 3650),
  action text NOT NULL DEFAULT 'delete' CHECK (action IN ('delete','redact','archive')),
  notes text,
  updated_by uuid,
  updated_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, category)
);
CREATE INDEX idx_lc_retention_org ON public.legal_connect_retention_policies(organization_id);

ALTER TABLE public.legal_connect_retention_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org admins manage retention policies"
  ON public.legal_connect_retention_policies FOR ALL TO authenticated
  USING (is_org_owner_or_admin(auth.uid(), organization_id) OR is_master_admin(auth.uid()) OR is_ops_member(auth.uid()))
  WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id) OR is_master_admin(auth.uid()) OR is_ops_member(auth.uid()));
CREATE POLICY "Org members view retention policies"
  ON public.legal_connect_retention_policies FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id) OR is_master_admin(auth.uid()) OR is_ops_member(auth.uid()));

CREATE TRIGGER trg_lc_retention_updated
  BEFORE UPDATE ON public.legal_connect_retention_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== Secret rotations ==============
CREATE TABLE public.legal_connect_secret_rotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  secret_kind text NOT NULL CHECK (secret_kind IN ('cron_secret','sink_hmac','webhook_signing','provider_credential','other')),
  secret_ref text,
  rotated_by uuid,
  rotated_by_name text,
  source text NOT NULL DEFAULT 'app' CHECK (source IN ('app','cron','system','api')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lc_secret_rot_org ON public.legal_connect_secret_rotations(organization_id, created_at DESC);

ALTER TABLE public.legal_connect_secret_rotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ops manage secret rotations"
  ON public.legal_connect_secret_rotations FOR ALL TO authenticated
  USING (is_master_admin(auth.uid()) OR is_ops_member(auth.uid()) OR is_org_owner_or_admin(auth.uid(), organization_id))
  WITH CHECK (is_master_admin(auth.uid()) OR is_ops_member(auth.uid()) OR is_org_owner_or_admin(auth.uid(), organization_id));

-- ============== Webhook callback failures ==============
CREATE TABLE public.legal_connect_webhook_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  reason text NOT NULL,
  ip_address text,
  user_agent text,
  payload_excerpt text,
  signature_present boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lc_webhook_fail_org ON public.legal_connect_webhook_failures(organization_id, created_at DESC);
CREATE INDEX idx_lc_webhook_fail_created ON public.legal_connect_webhook_failures(created_at DESC);

ALTER TABLE public.legal_connect_webhook_failures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ops view webhook failures"
  ON public.legal_connect_webhook_failures FOR SELECT TO authenticated
  USING (is_master_admin(auth.uid()) OR is_ops_member(auth.uid()) OR (organization_id IS NOT NULL AND is_org_owner_or_admin(auth.uid(), organization_id)));
-- Inserts via service role only (no insert policy for authenticated users)

-- ============== Audit log enrichment ==============
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS organization_id uuid,
  ADD COLUMN IF NOT EXISTS tenant_id uuid,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'app';

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created ON public.audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created ON public.audit_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- Tenant-aware audit overview view
CREATE OR REPLACE VIEW public.legal_connect_audit_overview
WITH (security_invoker=true) AS
SELECT
  a.id,
  a.created_at,
  a.action,
  a.entity_type,
  a.entity_id,
  a.organization_id,
  a.tenant_id,
  a.user_id,
  a.source,
  a.details,
  p.display_name AS actor_name,
  p.email AS actor_email,
  t.name AS tenant_name
FROM public.audit_logs a
LEFT JOIN public.profiles p ON p.id = a.user_id
LEFT JOIN public.tenants t ON t.id = a.tenant_id
WHERE a.action LIKE 'lc.%' OR a.entity_type LIKE 'legal_connect%';

-- ============== Cleanup function ==============
CREATE OR REPLACE FUNCTION public.legal_connect_cleanup_retention(_org_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pol record;
  cutoff timestamptz;
  cnt integer;
  result jsonb := '{}'::jsonb;
  per_cat jsonb;
BEGIN
  FOR pol IN
    SELECT * FROM legal_connect_retention_policies
    WHERE _org_id IS NULL OR organization_id = _org_id
  LOOP
    cutoff := now() - make_interval(days => pol.retention_days);
    cnt := 0;
    per_cat := jsonb_build_object('category', pol.category, 'cutoff', cutoff, 'action', pol.action);

    IF pol.category = 'digest_runs' THEN
      IF pol.action = 'redact' THEN
        UPDATE legal_connect_digest_runs
          SET last_html = NULL, delivery_error = NULL
          WHERE organization_id = pol.organization_id AND created_at < cutoff
            AND (last_html IS NOT NULL OR delivery_error IS NOT NULL);
        GET DIAGNOSTICS cnt = ROW_COUNT;
      ELSE
        DELETE FROM legal_connect_digest_runs
          WHERE organization_id = pol.organization_id AND created_at < cutoff;
        GET DIAGNOSTICS cnt = ROW_COUNT;
      END IF;

    ELSIF pol.category = 'escalation_events' THEN
      DELETE FROM legal_connect_escalation_events
        WHERE organization_id = pol.organization_id AND created_at < cutoff;
      GET DIAGNOSTICS cnt = ROW_COUNT;

    ELSIF pol.category = 'ack_tokens' THEN
      DELETE FROM legal_connect_ack_tokens
        WHERE organization_id = pol.organization_id
          AND (expires_at < now() OR created_at < cutoff);
      GET DIAGNOSTICS cnt = ROW_COUNT;

    ELSIF pol.category = 'webhook_failures' THEN
      DELETE FROM legal_connect_webhook_failures
        WHERE (organization_id = pol.organization_id OR organization_id IS NULL)
          AND created_at < cutoff;
      GET DIAGNOSTICS cnt = ROW_COUNT;

    ELSIF pol.category = 'sync_jobs' THEN
      DELETE FROM legal_connect_sync_jobs
        WHERE organization_id = pol.organization_id
          AND status IN ('succeeded','failed')
          AND created_at < cutoff;
      GET DIAGNOSTICS cnt = ROW_COUNT;

    ELSIF pol.category = 'event_log' THEN
      DELETE FROM legal_connect_event_log
        WHERE organization_id = pol.organization_id AND created_at < cutoff;
      GET DIAGNOSTICS cnt = ROW_COUNT;

    ELSIF pol.category = 'alerts' THEN
      DELETE FROM legal_connect_alerts
        WHERE organization_id = pol.organization_id
          AND status IN ('resolved','acknowledged')
          AND created_at < cutoff;
      GET DIAGNOSTICS cnt = ROW_COUNT;

    ELSIF pol.category = 'feedback_entries' THEN
      DELETE FROM legal_connect_feedback_entries
        WHERE organization_id = pol.organization_id
          AND status IN ('shipped','rejected','resolved')
          AND created_at < cutoff;
      GET DIAGNOSTICS cnt = ROW_COUNT;

    ELSIF pol.category = 'issue_reviews' THEN
      DELETE FROM legal_connect_issue_reviews
        WHERE organization_id = pol.organization_id
          AND status = 'resolved'
          AND updated_at < cutoff;
      GET DIAGNOSTICS cnt = ROW_COUNT;

    ELSIF pol.category = 'audit_logs' THEN
      DELETE FROM audit_logs
        WHERE organization_id = pol.organization_id AND created_at < cutoff;
      GET DIAGNOSTICS cnt = ROW_COUNT;
    END IF;

    per_cat := per_cat || jsonb_build_object('rows', cnt);
    result := result || jsonb_build_object(pol.category || ':' || pol.organization_id::text, per_cat);
  END LOOP;

  -- Always delete already-expired ack tokens regardless of policy
  DELETE FROM legal_connect_ack_tokens WHERE expires_at < now() - INTERVAL '1 day';

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.legal_connect_cleanup_retention(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.legal_connect_cleanup_retention(uuid) TO authenticated, service_role;
