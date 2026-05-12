-- Phase 2B: canonical workspace foundation
-- Non-breaking: organizations + organization_members untouched.

-- Enum: workspace role
DO $$ BEGIN
  CREATE TYPE public.workspace_role AS ENUM ('owner','admin','manager','member','viewer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- workspaces
CREATE TABLE IF NOT EXISTS public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS workspaces_org_idx ON public.workspaces(organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS workspaces_default_per_org_uq
  ON public.workspaces(organization_id) WHERE is_default;

-- workspace_members
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.workspace_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);
CREATE INDEX IF NOT EXISTS workspace_members_user_idx ON public.workspace_members(user_id);

-- updated_at trigger on workspaces
DROP TRIGGER IF EXISTS workspaces_set_updated_at ON public.workspaces;
CREATE TRIGGER workspaces_set_updated_at
BEFORE UPDATE ON public.workspaces
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper: workspace membership check (with transitional org-member fallback)
CREATE OR REPLACE FUNCTION public.is_workspace_member(_user_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id AND workspace_id = _workspace_id
  ) OR EXISTS (
    SELECT 1
    FROM public.workspaces w
    JOIN public.organization_members om ON om.organization_id = w.organization_id
    WHERE w.id = _workspace_id AND om.user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_workspace_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT w.id
  FROM public.workspaces w
  WHERE EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = w.id AND wm.user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = w.organization_id AND om.user_id = _user_id
  );
$$;

-- RLS
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspaces readable by members" ON public.workspaces;
CREATE POLICY "workspaces readable by members"
ON public.workspaces FOR SELECT TO authenticated
USING (
  public.is_workspace_member(auth.uid(), id)
  OR public.is_master_admin(auth.uid())
);

DROP POLICY IF EXISTS "workspaces managed by org admins" ON public.workspaces;
CREATE POLICY "workspaces managed by org admins"
ON public.workspaces FOR ALL TO authenticated
USING (
  public.is_org_owner_or_admin(auth.uid(), organization_id)
  OR public.is_master_admin(auth.uid())
)
WITH CHECK (
  public.is_org_owner_or_admin(auth.uid(), organization_id)
  OR public.is_master_admin(auth.uid())
);

DROP POLICY IF EXISTS "workspace_members readable" ON public.workspace_members;
CREATE POLICY "workspace_members readable"
ON public.workspace_members FOR SELECT TO authenticated
USING (
  public.is_workspace_member(auth.uid(), workspace_id)
  OR public.is_master_admin(auth.uid())
);

DROP POLICY IF EXISTS "workspace_members managed by org admins" ON public.workspace_members;
CREATE POLICY "workspace_members managed by org admins"
ON public.workspace_members FOR ALL TO authenticated
USING (
  public.is_master_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = workspace_id
      AND public.is_org_owner_or_admin(auth.uid(), w.organization_id)
  )
)
WITH CHECK (
  public.is_master_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = workspace_id
      AND public.is_org_owner_or_admin(auth.uid(), w.organization_id)
  )
);

-- Backfill: one default workspace per existing organization
INSERT INTO public.workspaces (organization_id, name, is_default)
SELECT o.id, o.name, true
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.workspaces w
  WHERE w.organization_id = o.id AND w.is_default
);

-- Auto-create default workspace when an organization is created
CREATE OR REPLACE FUNCTION public.create_default_workspace_for_org()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.workspaces (organization_id, name, is_default)
  VALUES (NEW.id, NEW.name, true);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS organizations_default_workspace ON public.organizations;
CREATE TRIGGER organizations_default_workspace
AFTER INSERT ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.create_default_workspace_for_org();