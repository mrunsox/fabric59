
-- Phase 4: Canonical Guides foundation

CREATE TYPE public.guide_status AS ENUM ('draft', 'published', 'archived');

CREATE TABLE public.guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  status public.guide_status NOT NULL DEFAULT 'draft',
  current_version integer NOT NULL DEFAULT 1,
  source_type text,
  source_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT guides_source_uq UNIQUE (source_type, source_id)
);

CREATE INDEX guides_workspace_idx ON public.guides(workspace_id);
CREATE INDEX guides_campaign_idx ON public.guides(campaign_id);
CREATE INDEX guides_status_idx ON public.guides(status);

CREATE TABLE public.guide_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id uuid NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  version integer NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_current boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (guide_id, version)
);

CREATE INDEX guide_versions_guide_idx ON public.guide_versions(guide_id);

ALTER TABLE public.guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guide_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "guides readable by workspace members"
  ON public.guides FOR SELECT TO authenticated
  USING (public.is_master_admin(auth.uid()) OR public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "guides managed by org admins"
  ON public.guides FOR ALL TO authenticated
  USING (
    public.is_master_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = guides.workspace_id
        AND public.is_org_owner_or_admin(auth.uid(), w.organization_id)
    )
  )
  WITH CHECK (
    public.is_master_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = guides.workspace_id
        AND public.is_org_owner_or_admin(auth.uid(), w.organization_id)
    )
  );

CREATE POLICY "guide_versions readable by workspace members"
  ON public.guide_versions FOR SELECT TO authenticated
  USING (
    public.is_master_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.guides g
      WHERE g.id = guide_versions.guide_id
        AND public.is_workspace_member(auth.uid(), g.workspace_id)
    )
  );

CREATE POLICY "guide_versions managed by org admins"
  ON public.guide_versions FOR ALL TO authenticated
  USING (
    public.is_master_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.guides g
      JOIN public.workspaces w ON w.id = g.workspace_id
      WHERE g.id = guide_versions.guide_id
        AND public.is_org_owner_or_admin(auth.uid(), w.organization_id)
    )
  )
  WITH CHECK (
    public.is_master_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.guides g
      JOIN public.workspaces w ON w.id = g.workspace_id
      WHERE g.id = guide_versions.guide_id
        AND public.is_org_owner_or_admin(auth.uid(), w.organization_id)
    )
  );

CREATE TRIGGER guides_set_updated_at
  BEFORE UPDATE ON public.guides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Map legacy script status -> canonical guide status
CREATE OR REPLACE FUNCTION public.map_legacy_script_status(_legacy text)
RETURNS public.guide_status
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE lower(coalesce(_legacy, 'draft'))
    WHEN 'draft' THEN 'draft'::public.guide_status
    WHEN 'published' THEN 'published'::public.guide_status
    WHEN 'live' THEN 'published'::public.guide_status
    WHEN 'active' THEN 'published'::public.guide_status
    WHEN 'archived' THEN 'archived'::public.guide_status
    WHEN 'deprecated' THEN 'archived'::public.guide_status
    ELSE 'draft'::public.guide_status
  END
$$;

-- Mirror legacy scripts -> canonical guides (one-way bridge)
CREATE OR REPLACE FUNCTION public.mirror_script_to_guide()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_workspace_id uuid;
  v_status public.guide_status;
BEGIN
  SELECT id INTO v_workspace_id
  FROM public.workspaces
  WHERE organization_id = NEW.organization_id AND is_default
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_status := CASE
    WHEN NEW.is_live THEN 'published'::public.guide_status
    ELSE public.map_legacy_script_status(NEW.status)
  END;

  INSERT INTO public.guides (
    workspace_id, name, description, status, current_version,
    source_type, source_id, metadata, created_by, created_at, updated_at
  )
  VALUES (
    v_workspace_id, NEW.name, NEW.description, v_status, coalesce(NEW.version, 1),
    'script', NEW.id,
    jsonb_build_object('legacy_status', NEW.status, 'is_live', NEW.is_live, 'is_template', NEW.is_template),
    NEW.created_by, NEW.created_at, NEW.updated_at
  )
  ON CONFLICT ON CONSTRAINT guides_source_uq DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        status = EXCLUDED.status,
        current_version = EXCLUDED.current_version,
        metadata = EXCLUDED.metadata,
        updated_at = now();

  RETURN NEW;
END;
$$;

CREATE TRIGGER scripts_mirror_to_guides
  AFTER INSERT OR UPDATE ON public.scripts
  FOR EACH ROW EXECUTE FUNCTION public.mirror_script_to_guide();

-- Backfill existing scripts into canonical guides
INSERT INTO public.guides (
  workspace_id, name, description, status, current_version,
  source_type, source_id, metadata, created_by, created_at, updated_at
)
SELECT
  w.id,
  s.name,
  s.description,
  CASE WHEN s.is_live THEN 'published'::public.guide_status
       ELSE public.map_legacy_script_status(s.status) END,
  coalesce(s.version, 1),
  'script', s.id,
  jsonb_build_object('legacy_status', s.status, 'is_live', s.is_live, 'is_template', s.is_template),
  s.created_by, s.created_at, s.updated_at
FROM public.scripts s
JOIN public.workspaces w
  ON w.organization_id = s.organization_id AND w.is_default
ON CONFLICT ON CONSTRAINT guides_source_uq DO NOTHING;
