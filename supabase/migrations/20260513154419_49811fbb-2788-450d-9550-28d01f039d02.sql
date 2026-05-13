
-- Forms table (workspace-scoped canonical surface)
CREATE TYPE public.form_status AS ENUM ('draft', 'published', 'archived');

CREATE TABLE public.forms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status public.form_status NOT NULL DEFAULT 'draft',
  schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_forms_workspace ON public.forms(workspace_id);

ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view forms"
  ON public.forms FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can create forms"
  ON public.forms FOR INSERT
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can update forms"
  ON public.forms FOR UPDATE
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can delete forms"
  ON public.forms FOR DELETE
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE TRIGGER update_forms_updated_at
  BEFORE UPDATE ON public.forms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Preview-only reset RPC (G1: read-only; G2 will add destructive counterpart)
CREATE OR REPLACE FUNCTION public.preview_workspace_demo_data(_workspace_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_pattern text := '%(test|demo|sandbox|please_ignore|^old_)%';
  v_tenants jsonb;
  v_campaigns jsonb;
  v_guides jsonb;
  v_forms jsonb;
  v_templates jsonb;
BEGIN
  SELECT organization_id INTO v_org_id FROM public.workspaces WHERE id = _workspace_id;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'workspace % not found', _workspace_id;
  END IF;
  IF NOT public.is_org_member(auth.uid(), v_org_id) THEN
    RAISE EXCEPTION 'not a member of workspace org';
  END IF;

  SELECT jsonb_build_object(
    'count', count(*),
    'sample', coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name) ORDER BY name) FILTER (WHERE rn <= 25), '[]'::jsonb)
  ) INTO v_tenants
  FROM (
    SELECT id, name, row_number() OVER (ORDER BY name) AS rn
    FROM public.tenants
    WHERE organization_id = v_org_id
      AND (name ~* '(test|demo|sandbox|please_ignore)' OR name ~* '^old_')
  ) t;

  SELECT jsonb_build_object('count', count(*)) INTO v_campaigns
  FROM public.campaigns
  WHERE workspace_id = _workspace_id
    AND name ~* '(test|demo|sandbox|please_ignore|^old_)';

  SELECT jsonb_build_object('count', count(*)) INTO v_guides
  FROM public.guides
  WHERE workspace_id = _workspace_id
    AND name ~* '(test|demo|sandbox|please_ignore|^old_)';

  SELECT jsonb_build_object('count', count(*)) INTO v_forms
  FROM public.forms
  WHERE workspace_id = _workspace_id
    AND name ~* '(test|demo|sandbox|please_ignore|^old_)';

  SELECT jsonb_build_object('count', count(*)) INTO v_templates
  FROM public.templates
  WHERE organization_id = v_org_id
    AND name ~* '(test|demo|sandbox|please_ignore|^old_)';

  RETURN jsonb_build_object(
    'workspace_id', _workspace_id,
    'organization_id', v_org_id,
    'heuristic', 'name matches test|demo|sandbox|please_ignore or starts with old_',
    'tenants', v_tenants,
    'campaigns', v_campaigns,
    'guides', v_guides,
    'forms', v_forms,
    'templates', v_templates
  );
END;
$$;
