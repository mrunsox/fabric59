
-- 1. Forms: track current version
ALTER TABLE public.forms
  ADD COLUMN IF NOT EXISTS current_version integer NOT NULL DEFAULT 1;

-- 2. form_versions
CREATE TABLE IF NOT EXISTS public.form_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  version integer NOT NULL,
  schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_current boolean NOT NULL DEFAULT false,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (form_id, version)
);
CREATE INDEX IF NOT EXISTS form_versions_form_idx ON public.form_versions(form_id);

ALTER TABLE public.form_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "form_versions readable by workspace members"
  ON public.form_versions FOR SELECT TO authenticated
  USING (
    public.is_master_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_versions.form_id
        AND public.is_workspace_member(auth.uid(), f.workspace_id)
    )
  );

CREATE POLICY "form_versions managed by org admins"
  ON public.form_versions FOR ALL TO authenticated
  USING (
    public.is_master_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.forms f
      JOIN public.workspaces w ON w.id = f.workspace_id
      WHERE f.id = form_versions.form_id
        AND public.is_org_owner_or_admin(auth.uid(), w.organization_id)
    )
  )
  WITH CHECK (
    public.is_master_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.forms f
      JOIN public.workspaces w ON w.id = f.workspace_id
      WHERE f.id = form_versions.form_id
        AND public.is_org_owner_or_admin(auth.uid(), w.organization_id)
    )
  );

-- 3. form_submissions
CREATE TABLE IF NOT EXISTS public.form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  form_id uuid NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  form_version integer NOT NULL DEFAULT 1,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'preview',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  mapped jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_by uuid,
  submitted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS form_submissions_form_idx ON public.form_submissions(form_id);
CREATE INDEX IF NOT EXISTS form_submissions_workspace_idx ON public.form_submissions(workspace_id);
CREATE INDEX IF NOT EXISTS form_submissions_campaign_idx ON public.form_submissions(campaign_id);

ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "form_submissions readable by workspace members"
  ON public.form_submissions FOR SELECT TO authenticated
  USING (
    public.is_master_admin(auth.uid())
    OR public.is_workspace_member(auth.uid(), workspace_id)
  );

CREATE POLICY "form_submissions insert by workspace members"
  ON public.form_submissions FOR INSERT TO authenticated
  WITH CHECK (
    public.is_master_admin(auth.uid())
    OR public.is_workspace_member(auth.uid(), workspace_id)
  );

CREATE POLICY "form_submissions managed by org admins"
  ON public.form_submissions FOR UPDATE TO authenticated
  USING (
    public.is_master_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = form_submissions.workspace_id
        AND public.is_org_owner_or_admin(auth.uid(), w.organization_id)
    )
  );

CREATE POLICY "form_submissions deletable by org admins"
  ON public.form_submissions FOR DELETE TO authenticated
  USING (
    public.is_master_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = form_submissions.workspace_id
        AND public.is_org_owner_or_admin(auth.uid(), w.organization_id)
    )
  );

-- 4. form_campaign_assignments
CREATE TABLE IF NOT EXISTS public.form_campaign_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  form_id uuid NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (form_id, campaign_id)
);
CREATE INDEX IF NOT EXISTS fca_form_idx ON public.form_campaign_assignments(form_id);
CREATE INDEX IF NOT EXISTS fca_campaign_idx ON public.form_campaign_assignments(campaign_id);
CREATE INDEX IF NOT EXISTS fca_workspace_idx ON public.form_campaign_assignments(workspace_id);

ALTER TABLE public.form_campaign_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fca readable by workspace members"
  ON public.form_campaign_assignments FOR SELECT TO authenticated
  USING (
    public.is_master_admin(auth.uid())
    OR public.is_workspace_member(auth.uid(), workspace_id)
  );

CREATE POLICY "fca managed by org admins"
  ON public.form_campaign_assignments FOR ALL TO authenticated
  USING (
    public.is_master_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = form_campaign_assignments.workspace_id
        AND public.is_org_owner_or_admin(auth.uid(), w.organization_id)
    )
  )
  WITH CHECK (
    public.is_master_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = form_campaign_assignments.workspace_id
        AND public.is_org_owner_or_admin(auth.uid(), w.organization_id)
    )
  );
