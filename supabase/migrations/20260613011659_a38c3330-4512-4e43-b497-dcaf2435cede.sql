
-- 1) Tenants: restrict broad member SELECT (rows contain credentials)
DROP POLICY IF EXISTS "Org members can view own org tenants" ON public.tenants;
-- existing "Org owners and admins can manage tenants" (ALL) covers admin SELECT
-- "Ops team can view all tenants" and "Master admin can manage all tenants" remain

-- 2) Escalation sinks: restrict member SELECT (rows contain hmac_secret)
DROP POLICY IF EXISTS "Org members view escalation sinks" ON public.legal_connect_escalation_sinks;
-- "Org admins manage escalation sinks" (ALL) already covers admin reads

-- 3) Five9 event log: forbid NULL org reads to all
DROP POLICY IF EXISTS "Org members can view own five9 events" ON public.five9_event_log;
CREATE POLICY "Org members can view own five9 events"
  ON public.five9_event_log
  FOR SELECT
  USING (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id));

-- 4) Audit logs: ensure inserter can read own rows; require org on insert
DROP POLICY IF EXISTS "Org members can view audit logs" ON public.audit_logs;
CREATE POLICY "Org members can view audit logs"
  ON public.audit_logs
  FOR SELECT
  USING (
    public.is_master_admin(auth.uid())
    OR user_id = auth.uid()
    OR (organization_id IS NOT NULL AND organization_id IN (SELECT public.get_user_org_ids(auth.uid())))
  );

DROP POLICY IF EXISTS "Org members can insert audit logs" ON public.audit_logs;
CREATE POLICY "Org members can insert audit logs"
  ON public.audit_logs
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND organization_id IS NOT NULL
    AND public.is_org_member(auth.uid(), organization_id)
  );

-- 5) Remove tenants from realtime publication (rows contain credentials)
ALTER PUBLICATION supabase_realtime DROP TABLE public.tenants;
