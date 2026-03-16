
-- campaign_scripts: DNIS/campaign → script mapping
CREATE TABLE public.campaign_scripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  tenant_id uuid NOT NULL,
  five9_domain_id uuid REFERENCES public.five9_domains(id) ON DELETE SET NULL,
  five9_campaign_id text,
  dnis text,
  script_id uuid NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- call_sessions: richer call lifecycle records
CREATE TABLE public.call_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  tenant_id uuid,
  script_id uuid REFERENCES public.scripts(id) ON DELETE SET NULL,
  script_session_id uuid REFERENCES public.script_sessions(id) ON DELETE SET NULL,
  five9_call_id text,
  agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  dnis text,
  ani text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_seconds integer,
  status text NOT NULL DEFAULT 'in_progress',
  metadata jsonb DEFAULT '{}'::jsonb
);

-- call_session_events: granular event log
CREATE TABLE public.call_session_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_session_id uuid NOT NULL REFERENCES public.call_sessions(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL,
  node_id text,
  data jsonb DEFAULT '{}'::jsonb
);

-- call_outcome_types: configurable outcome definitions
CREATE TABLE public.call_outcome_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text
);

-- call_outcomes: per-call outcome records
CREATE TABLE public.call_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_session_id uuid NOT NULL REFERENCES public.call_sessions(id) ON DELETE CASCADE,
  outcome_type_id uuid NOT NULL REFERENCES public.call_outcome_types(id) ON DELETE CASCADE,
  disposition text,
  summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- call_notes: agent notes per call
CREATE TABLE public.call_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_session_id uuid NOT NULL REFERENCES public.call_sessions(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL,
  note_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- performance_goals: goals and coaching
CREATE TABLE public.performance_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  tenant_id uuid,
  name text NOT NULL,
  description text,
  metric text NOT NULL,
  target_value numeric NOT NULL,
  timeframe text NOT NULL DEFAULT 'monthly',
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'active',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- call_summary_templates: post-call summary templates
CREATE TABLE public.call_summary_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  tenant_id uuid,
  name text NOT NULL,
  template_body text NOT NULL DEFAULT '',
  channel text NOT NULL DEFAULT 'email',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- updated_at triggers
CREATE TRIGGER update_campaign_scripts_updated_at BEFORE UPDATE ON public.campaign_scripts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_performance_goals_updated_at BEFORE UPDATE ON public.performance_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: Enable on all tables
ALTER TABLE public.campaign_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_session_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_outcome_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_summary_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for campaign_scripts (org-scoped pattern)
CREATE POLICY "Master admin can manage all campaign_scripts" ON public.campaign_scripts FOR ALL TO authenticated USING (is_master_admin(auth.uid())) WITH CHECK (is_master_admin(auth.uid()));
CREATE POLICY "Org members can view campaign_scripts" ON public.campaign_scripts FOR SELECT TO authenticated USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "Org owners and admins can manage campaign_scripts" ON public.campaign_scripts FOR ALL TO authenticated USING (is_org_owner_or_admin(auth.uid(), organization_id)) WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));
CREATE POLICY "Platform admins can manage all campaign_scripts" ON public.campaign_scripts FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS policies for call_sessions
CREATE POLICY "Master admin can manage all call_sessions" ON public.call_sessions FOR ALL TO authenticated USING (is_master_admin(auth.uid())) WITH CHECK (is_master_admin(auth.uid()));
CREATE POLICY "Org members can view call_sessions" ON public.call_sessions FOR SELECT TO authenticated USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "Org owners and admins can manage call_sessions" ON public.call_sessions FOR ALL TO authenticated USING (is_org_owner_or_admin(auth.uid(), organization_id)) WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));
CREATE POLICY "Platform admins can manage all call_sessions" ON public.call_sessions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can insert call_sessions" ON public.call_sessions FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT get_user_org_ids(auth.uid())));

-- RLS policies for call_session_events (via call_sessions join)
CREATE POLICY "Master admin can manage all call_session_events" ON public.call_session_events FOR ALL TO authenticated USING (is_master_admin(auth.uid())) WITH CHECK (is_master_admin(auth.uid()));
CREATE POLICY "Org members can view call_session_events" ON public.call_session_events FOR SELECT TO authenticated USING (call_session_id IN (SELECT id FROM public.call_sessions WHERE organization_id IN (SELECT get_user_org_ids(auth.uid()))));
CREATE POLICY "Org owners and admins can manage call_session_events" ON public.call_session_events FOR ALL TO authenticated USING (call_session_id IN (SELECT id FROM public.call_sessions WHERE is_org_owner_or_admin(auth.uid(), organization_id))) WITH CHECK (call_session_id IN (SELECT id FROM public.call_sessions WHERE is_org_owner_or_admin(auth.uid(), organization_id)));
CREATE POLICY "Platform admins can manage all call_session_events" ON public.call_session_events FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS policies for call_outcome_types
CREATE POLICY "Master admin can manage all call_outcome_types" ON public.call_outcome_types FOR ALL TO authenticated USING (is_master_admin(auth.uid())) WITH CHECK (is_master_admin(auth.uid()));
CREATE POLICY "Org members can view call_outcome_types" ON public.call_outcome_types FOR SELECT TO authenticated USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "Org owners and admins can manage call_outcome_types" ON public.call_outcome_types FOR ALL TO authenticated USING (is_org_owner_or_admin(auth.uid(), organization_id)) WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));
CREATE POLICY "Platform admins can manage all call_outcome_types" ON public.call_outcome_types FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS policies for call_outcomes (via call_sessions join)
CREATE POLICY "Master admin can manage all call_outcomes" ON public.call_outcomes FOR ALL TO authenticated USING (is_master_admin(auth.uid())) WITH CHECK (is_master_admin(auth.uid()));
CREATE POLICY "Org members can view call_outcomes" ON public.call_outcomes FOR SELECT TO authenticated USING (call_session_id IN (SELECT id FROM public.call_sessions WHERE organization_id IN (SELECT get_user_org_ids(auth.uid()))));
CREATE POLICY "Org owners and admins can manage call_outcomes" ON public.call_outcomes FOR ALL TO authenticated USING (call_session_id IN (SELECT id FROM public.call_sessions WHERE is_org_owner_or_admin(auth.uid(), organization_id))) WITH CHECK (call_session_id IN (SELECT id FROM public.call_sessions WHERE is_org_owner_or_admin(auth.uid(), organization_id)));
CREATE POLICY "Platform admins can manage all call_outcomes" ON public.call_outcomes FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS policies for call_notes (via call_sessions join)
CREATE POLICY "Master admin can manage all call_notes" ON public.call_notes FOR ALL TO authenticated USING (is_master_admin(auth.uid())) WITH CHECK (is_master_admin(auth.uid()));
CREATE POLICY "Org members can view call_notes" ON public.call_notes FOR SELECT TO authenticated USING (call_session_id IN (SELECT id FROM public.call_sessions WHERE organization_id IN (SELECT get_user_org_ids(auth.uid()))));
CREATE POLICY "Agents can insert own call_notes" ON public.call_notes FOR INSERT TO authenticated WITH CHECK (agent_id = auth.uid());
CREATE POLICY "Platform admins can manage all call_notes" ON public.call_notes FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS policies for performance_goals
CREATE POLICY "Master admin can manage all performance_goals" ON public.performance_goals FOR ALL TO authenticated USING (is_master_admin(auth.uid())) WITH CHECK (is_master_admin(auth.uid()));
CREATE POLICY "Org members can view performance_goals" ON public.performance_goals FOR SELECT TO authenticated USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "Org owners and admins can manage performance_goals" ON public.performance_goals FOR ALL TO authenticated USING (is_org_owner_or_admin(auth.uid(), organization_id)) WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));
CREATE POLICY "Platform admins can manage all performance_goals" ON public.performance_goals FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS policies for call_summary_templates
CREATE POLICY "Master admin can manage all call_summary_templates" ON public.call_summary_templates FOR ALL TO authenticated USING (is_master_admin(auth.uid())) WITH CHECK (is_master_admin(auth.uid()));
CREATE POLICY "Org members can view call_summary_templates" ON public.call_summary_templates FOR SELECT TO authenticated USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "Org owners and admins can manage call_summary_templates" ON public.call_summary_templates FOR ALL TO authenticated USING (is_org_owner_or_admin(auth.uid(), organization_id)) WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));
CREATE POLICY "Platform admins can manage all call_summary_templates" ON public.call_summary_templates FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
