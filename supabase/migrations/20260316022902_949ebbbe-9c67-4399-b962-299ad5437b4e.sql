
-- ============================================
-- ScriptFlow Integration: 11 new tables
-- ============================================

-- 1. scripts
CREATE TABLE public.scripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft',
  definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_scripts_updated_at BEFORE UPDATE ON public.scripts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Master admin can manage all scripts" ON public.scripts FOR ALL TO authenticated
  USING (is_master_admin(auth.uid())) WITH CHECK (is_master_admin(auth.uid()));
CREATE POLICY "Org members can view scripts" ON public.scripts FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "Org owners and admins can manage scripts" ON public.scripts FOR ALL TO authenticated
  USING (is_org_owner_or_admin(auth.uid(), organization_id))
  WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));
CREATE POLICY "Platform admins can manage all scripts" ON public.scripts FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. script_sessions
CREATE TABLE public.script_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id uuid REFERENCES public.scripts(id) ON DELETE SET NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  five9_call_id text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_seconds integer,
  variables jsonb DEFAULT '{}'::jsonb,
  disposition text,
  post_call_status text NOT NULL DEFAULT 'pending',
  metadata jsonb DEFAULT '{}'::jsonb
);
ALTER TABLE public.script_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master admin can manage all script_sessions" ON public.script_sessions FOR ALL TO authenticated
  USING (is_master_admin(auth.uid())) WITH CHECK (is_master_admin(auth.uid()));
CREATE POLICY "Org members can view script_sessions" ON public.script_sessions FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "Org owners and admins can manage script_sessions" ON public.script_sessions FOR ALL TO authenticated
  USING (is_org_owner_or_admin(auth.uid(), organization_id))
  WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));
CREATE POLICY "Platform admins can manage all script_sessions" ON public.script_sessions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can insert script_sessions" ON public.script_sessions FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT get_user_org_ids(auth.uid())));

-- 3. post_call_automations
CREATE TABLE public.post_call_automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  script_id uuid REFERENCES public.scripts(id) ON DELETE SET NULL,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  name text NOT NULL DEFAULT '',
  disposition_match text NOT NULL,
  action_type text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.post_call_automations ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_post_call_automations_updated_at BEFORE UPDATE ON public.post_call_automations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Master admin can manage all post_call_automations" ON public.post_call_automations FOR ALL TO authenticated
  USING (is_master_admin(auth.uid())) WITH CHECK (is_master_admin(auth.uid()));
CREATE POLICY "Org members can view post_call_automations" ON public.post_call_automations FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "Org owners and admins can manage post_call_automations" ON public.post_call_automations FOR ALL TO authenticated
  USING (is_org_owner_or_admin(auth.uid(), organization_id))
  WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));
CREATE POLICY "Platform admins can manage all post_call_automations" ON public.post_call_automations FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 4. kb_categories
CREATE TABLE public.kb_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.kb_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master admin can manage all kb_categories" ON public.kb_categories FOR ALL TO authenticated
  USING (is_master_admin(auth.uid())) WITH CHECK (is_master_admin(auth.uid()));
CREATE POLICY "Org members can view kb_categories" ON public.kb_categories FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "Org owners and admins can manage kb_categories" ON public.kb_categories FOR ALL TO authenticated
  USING (is_org_owner_or_admin(auth.uid(), organization_id))
  WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));
CREATE POLICY "Platform admins can manage all kb_categories" ON public.kb_categories FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 5. kb_articles
CREATE TABLE public.kb_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.kb_categories(id) ON DELETE SET NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  title text NOT NULL,
  slug text NOT NULL,
  content text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.kb_articles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_kb_articles_updated_at BEFORE UPDATE ON public.kb_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Master admin can manage all kb_articles" ON public.kb_articles FOR ALL TO authenticated
  USING (is_master_admin(auth.uid())) WITH CHECK (is_master_admin(auth.uid()));
CREATE POLICY "Org members can view kb_articles" ON public.kb_articles FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "Org owners and admins can manage kb_articles" ON public.kb_articles FOR ALL TO authenticated
  USING (is_org_owner_or_admin(auth.uid(), organization_id))
  WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));
CREATE POLICY "Platform admins can manage all kb_articles" ON public.kb_articles FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 6. training_modules
CREATE TABLE public.training_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.training_modules ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_training_modules_updated_at BEFORE UPDATE ON public.training_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Master admin can manage all training_modules" ON public.training_modules FOR ALL TO authenticated
  USING (is_master_admin(auth.uid())) WITH CHECK (is_master_admin(auth.uid()));
CREATE POLICY "Org members can view training_modules" ON public.training_modules FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "Org owners and admins can manage training_modules" ON public.training_modules FOR ALL TO authenticated
  USING (is_org_owner_or_admin(auth.uid(), organization_id))
  WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));
CREATE POLICY "Platform admins can manage all training_modules" ON public.training_modules FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 7. training_lessons
CREATE TABLE public.training_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.training_modules(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  duration_minutes integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.training_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master admin can manage all training_lessons" ON public.training_lessons FOR ALL TO authenticated
  USING (is_master_admin(auth.uid())) WITH CHECK (is_master_admin(auth.uid()));
CREATE POLICY "Org members can view training_lessons" ON public.training_lessons FOR SELECT TO authenticated
  USING (module_id IN (SELECT id FROM public.training_modules WHERE organization_id IN (SELECT get_user_org_ids(auth.uid()))));
CREATE POLICY "Org owners and admins can manage training_lessons" ON public.training_lessons FOR ALL TO authenticated
  USING (module_id IN (SELECT id FROM public.training_modules WHERE is_org_owner_or_admin(auth.uid(), organization_id)))
  WITH CHECK (module_id IN (SELECT id FROM public.training_modules WHERE is_org_owner_or_admin(auth.uid(), organization_id)));
CREATE POLICY "Platform admins can manage all training_lessons" ON public.training_lessons FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 8. training_progress
CREATE TABLE public.training_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL REFERENCES public.training_lessons(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.training_modules(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'not_started',
  completed_at timestamptz,
  score numeric,
  UNIQUE(user_id, lesson_id)
);
ALTER TABLE public.training_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own training_progress" ON public.training_progress FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users can manage own training_progress" ON public.training_progress FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Master admin can manage all training_progress" ON public.training_progress FOR ALL TO authenticated
  USING (is_master_admin(auth.uid())) WITH CHECK (is_master_admin(auth.uid()));
CREATE POLICY "Platform admins can manage all training_progress" ON public.training_progress FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Org admins can view all training_progress" ON public.training_progress FOR SELECT TO authenticated
  USING (module_id IN (SELECT id FROM public.training_modules WHERE organization_id IN (SELECT get_user_org_ids(auth.uid()))));

-- 9. tasks
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  assigned_to uuid,
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'pending',
  due_date date,
  script_session_id uuid REFERENCES public.script_sessions(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Master admin can manage all tasks" ON public.tasks FOR ALL TO authenticated
  USING (is_master_admin(auth.uid())) WITH CHECK (is_master_admin(auth.uid()));
CREATE POLICY "Org members can view tasks" ON public.tasks FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "Org owners and admins can manage tasks" ON public.tasks FOR ALL TO authenticated
  USING (is_org_owner_or_admin(auth.uid(), organization_id))
  WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));
CREATE POLICY "Platform admins can manage all tasks" ON public.tasks FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Assigned users can manage own tasks" ON public.tasks FOR ALL TO authenticated
  USING (assigned_to = auth.uid()) WITH CHECK (assigned_to = auth.uid());
CREATE POLICY "Org members can insert tasks" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT get_user_org_ids(auth.uid())));

-- 10. feedback_submissions
CREATE TABLE public.feedback_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL,
  type text NOT NULL DEFAULT 'other',
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master admin can manage all feedback_submissions" ON public.feedback_submissions FOR ALL TO authenticated
  USING (is_master_admin(auth.uid())) WITH CHECK (is_master_admin(auth.uid()));
CREATE POLICY "Org members can view feedback_submissions" ON public.feedback_submissions FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "Org members can insert feedback_submissions" ON public.feedback_submissions FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT get_user_org_ids(auth.uid())) AND submitted_by = auth.uid());
CREATE POLICY "Org owners and admins can manage feedback_submissions" ON public.feedback_submissions FOR ALL TO authenticated
  USING (is_org_owner_or_admin(auth.uid(), organization_id))
  WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));
CREATE POLICY "Platform admins can manage all feedback_submissions" ON public.feedback_submissions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 11. qa_reviews
CREATE TABLE public.qa_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  script_session_id uuid REFERENCES public.script_sessions(id) ON DELETE SET NULL,
  agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  reviewer_id uuid,
  scores jsonb DEFAULT '{}'::jsonb,
  total_score numeric,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.qa_reviews ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_qa_reviews_updated_at BEFORE UPDATE ON public.qa_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Master admin can manage all qa_reviews" ON public.qa_reviews FOR ALL TO authenticated
  USING (is_master_admin(auth.uid())) WITH CHECK (is_master_admin(auth.uid()));
CREATE POLICY "Org members can view qa_reviews" ON public.qa_reviews FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "Org owners and admins can manage qa_reviews" ON public.qa_reviews FOR ALL TO authenticated
  USING (is_org_owner_or_admin(auth.uid(), organization_id))
  WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));
CREATE POLICY "Platform admins can manage all qa_reviews" ON public.qa_reviews FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
