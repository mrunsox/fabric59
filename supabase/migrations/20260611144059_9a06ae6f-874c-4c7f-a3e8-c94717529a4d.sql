
-- 1. agents: replace cross-org SELECT with org-scoped
DROP POLICY IF EXISTS "Authenticated users can view agents" ON public.agents;
CREATE POLICY "Org members can view agents"
  ON public.agents FOR SELECT TO authenticated
  USING (
    is_master_admin(auth.uid())
    OR organization_id IN (SELECT get_user_org_ids(auth.uid()))
  );

-- 2. audit_logs: scope SELECT and INSERT to org
DROP POLICY IF EXISTS "Authenticated users can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
CREATE POLICY "Org members can view audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (
    is_master_admin(auth.uid())
    OR (organization_id IS NOT NULL
        AND organization_id IN (SELECT get_user_org_ids(auth.uid())))
  );
CREATE POLICY "Org members can insert audit logs"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (organization_id IS NULL
         OR organization_id IN (SELECT get_user_org_ids(auth.uid())))
  );

-- 3. scheduled_jobs: drop broad SELECT, keep admin-only
DROP POLICY IF EXISTS "Authenticated users can view scheduled jobs" ON public.scheduled_jobs;
CREATE POLICY "Admins can view scheduled jobs"
  ON public.scheduled_jobs FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_master_admin(auth.uid()));

-- 4. app_config: restrict SELECT to admins (was readable by all authenticated)
DROP POLICY IF EXISTS "Authenticated users can read config" ON public.app_config;
CREATE POLICY "Admins can read config"
  ON public.app_config FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_master_admin(auth.uid()));

-- 5. organization_members: remove privilege-escalation self-insert
DROP POLICY IF EXISTS "Users can create membership for themselves" ON public.organization_members;

-- 6. Set search_path on the two IMMUTABLE helper functions
ALTER FUNCTION public.map_legacy_campaign_status(text) SET search_path = public;
ALTER FUNCTION public.map_legacy_script_status(text) SET search_path = public;
