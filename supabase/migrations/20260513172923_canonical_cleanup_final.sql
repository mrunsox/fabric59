-- Phase 13 — Canonical cleanup final pass
-- 1. Additive workspace_id on tenants (clients)
-- 2. canonical_cleanup_audit table + RLS
-- 3. reset_workspace_demo_data() destructive RPC with typed confirmation
--
-- Non-destructive to schema. No table renames. RLS additive only.

-- ============================================================
-- 1. tenants.workspace_id (additive, nullable, default to org's default workspace)
-- ============================================================

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS workspace_id uuid
    REFERENCES public.workspaces(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS tenants_workspace_idx ON public.tenants(workspace_id);

-- Backfill: assign existing tenants to their org's default workspace.
UPDATE public.tenants t
SET workspace_id = w.id
FROM public.workspaces w
WHERE t.workspace_id IS NULL
  AND t.organization_id IS NOT NULL
  AND w.organization_id = t.organization_id
  AND w.is_default = true;

-- Trigger: when a tenant is inserted without workspace_id, assign org default.
CREATE OR REPLACE FUNCTION public.assign_tenant_default_workspace()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.workspace_id IS NULL AND NEW.organization_id IS NOT NULL THEN
    SELECT w.id INTO NEW.workspace_id
    FROM public.workspaces w
    WHERE w.organization_id = NEW.organization_id AND w.is_default = true
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tenants_assign_default_workspace ON public.tenants;
CREATE TRIGGER tenants_assign_default_workspace
BEFORE INSERT OR UPDATE OF organization_id ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.assign_tenant_default_workspace();

-- ============================================================
-- 2. canonical_cleanup_audit
-- ============================================================

CREATE TABLE IF NOT EXISTS public.canonical_cleanup_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  predicate text NOT NULL,
  heuristic text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz NOT NULL DEFAULT now(),
  counts jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS canonical_cleanup_audit_org_idx
  ON public.canonical_cleanup_audit(organization_id, started_at DESC);
CREATE INDEX IF NOT EXISTS canonical_cleanup_audit_workspace_idx
  ON public.canonical_cleanup_audit(workspace_id, started_at DESC);

ALTER TABLE public.canonical_cleanup_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cleanup audit readable by org admins" ON public.canonical_cleanup_audit;
CREATE POLICY "cleanup audit readable by org admins"
ON public.canonical_cleanup_audit FOR SELECT TO authenticated
USING (
  public.is_org_owner_or_admin(auth.uid(), organization_id)
  OR public.is_master_admin(auth.uid())
);

-- No INSERT/UPDATE/DELETE policy — writes go through the SECURITY DEFINER RPC only.

-- ============================================================
-- 3. reset_workspace_demo_data — destructive counterpart of preview
-- ============================================================

CREATE OR REPLACE FUNCTION public.reset_workspace_demo_data(
  _workspace_id uuid,
  _confirm_token text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_ws_name text;
  v_predicate text := $$name matches '(test|demo|sandbox|please_ignore)' OR starts with 'old_'$$;
  v_heuristic text := 'name ~* ''(test|demo|sandbox|please_ignore)'' OR name ~* ''^old_''';
  v_audit_id uuid;
  v_started timestamptz := now();
  v_tenants_scanned int := 0;
  v_tenants_deleted int := 0;
  v_campaigns_scanned int := 0;
  v_campaigns_deleted int := 0;
  v_guides_scanned int := 0;
  v_guides_deleted int := 0;
  v_forms_scanned int := 0;
  v_forms_deleted int := 0;
  v_templates_scanned int := 0;
  v_templates_deleted int := 0;
  v_counts jsonb;
BEGIN
  -- Resolve workspace + org + verify workspace exists
  SELECT w.organization_id, w.name
    INTO v_org_id, v_ws_name
  FROM public.workspaces w
  WHERE w.id = _workspace_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'workspace % not found', _workspace_id;
  END IF;

  -- Authorization: must be org owner/admin or master admin
  IF NOT (public.is_org_owner_or_admin(auth.uid(), v_org_id) OR public.is_master_admin(auth.uid())) THEN
    RAISE EXCEPTION 'permission denied: not an org owner/admin for this workspace';
  END IF;

  -- Typed confirmation: token must equal workspace name (trim + case-insensitive)
  IF lower(btrim(coalesce(_confirm_token, ''))) <> lower(btrim(v_ws_name)) THEN
    RAISE EXCEPTION 'confirm token mismatch: expected workspace name';
  END IF;

  -- Count scanned rows before delete, then delete and capture deleted counts.
  SELECT count(*) INTO v_tenants_scanned
  FROM public.tenants
  WHERE organization_id = v_org_id
    AND (name ~* '(test|demo|sandbox|please_ignore)' OR name ~* '^old_');

  WITH d AS (
    DELETE FROM public.tenants
    WHERE organization_id = v_org_id
      AND (name ~* '(test|demo|sandbox|please_ignore)' OR name ~* '^old_')
    RETURNING 1
  )
  SELECT count(*) INTO v_tenants_deleted FROM d;

  SELECT count(*) INTO v_campaigns_scanned
  FROM public.campaigns
  WHERE workspace_id = _workspace_id
    AND (name ~* '(test|demo|sandbox|please_ignore)' OR name ~* '^old_');

  WITH d AS (
    DELETE FROM public.campaigns
    WHERE workspace_id = _workspace_id
      AND (name ~* '(test|demo|sandbox|please_ignore)' OR name ~* '^old_')
    RETURNING 1
  )
  SELECT count(*) INTO v_campaigns_deleted FROM d;

  SELECT count(*) INTO v_guides_scanned
  FROM public.guides
  WHERE workspace_id = _workspace_id
    AND (name ~* '(test|demo|sandbox|please_ignore)' OR name ~* '^old_');

  WITH d AS (
    DELETE FROM public.guides
    WHERE workspace_id = _workspace_id
      AND (name ~* '(test|demo|sandbox|please_ignore)' OR name ~* '^old_')
    RETURNING 1
  )
  SELECT count(*) INTO v_guides_deleted FROM d;

  SELECT count(*) INTO v_forms_scanned
  FROM public.forms
  WHERE workspace_id = _workspace_id
    AND (name ~* '(test|demo|sandbox|please_ignore)' OR name ~* '^old_');

  WITH d AS (
    DELETE FROM public.forms
    WHERE workspace_id = _workspace_id
      AND (name ~* '(test|demo|sandbox|please_ignore)' OR name ~* '^old_')
    RETURNING 1
  )
  SELECT count(*) INTO v_forms_deleted FROM d;

  SELECT count(*) INTO v_templates_scanned
  FROM public.templates
  WHERE organization_id = v_org_id
    AND (name ~* '(test|demo|sandbox|please_ignore)' OR name ~* '^old_');

  WITH d AS (
    DELETE FROM public.templates
    WHERE organization_id = v_org_id
      AND (name ~* '(test|demo|sandbox|please_ignore)' OR name ~* '^old_')
    RETURNING 1
  )
  SELECT count(*) INTO v_templates_deleted FROM d;

  v_counts := jsonb_build_object(
    'tenants',   jsonb_build_object('scanned', v_tenants_scanned,   'deleted', v_tenants_deleted),
    'campaigns', jsonb_build_object('scanned', v_campaigns_scanned, 'deleted', v_campaigns_deleted),
    'guides',    jsonb_build_object('scanned', v_guides_scanned,    'deleted', v_guides_deleted),
    'forms',     jsonb_build_object('scanned', v_forms_scanned,     'deleted', v_forms_deleted),
    'templates', jsonb_build_object('scanned', v_templates_scanned, 'deleted', v_templates_deleted)
  );

  -- Persist audit row
  INSERT INTO public.canonical_cleanup_audit
    (actor_id, workspace_id, organization_id, predicate, heuristic, started_at, ended_at, counts)
  VALUES
    (auth.uid(), _workspace_id, v_org_id, v_predicate, v_heuristic, v_started, now(), v_counts)
  RETURNING id INTO v_audit_id;

  RETURN jsonb_build_object(
    'audit_id', v_audit_id,
    'workspace_id', _workspace_id,
    'organization_id', v_org_id,
    'heuristic', v_heuristic,
    'predicate', v_predicate,
    'counts', v_counts
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reset_workspace_demo_data(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_workspace_demo_data(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.reset_workspace_demo_data(uuid, text) IS
  'Destructive cleanup counterpart of preview_workspace_demo_data. Requires org owner/admin (or master admin) and _confirm_token = workspaces.name. Deletes rows matching the test/demo/sandbox/please_ignore/^old_ heuristic across tenants/campaigns/guides/forms/templates for the given workspace''s org. Logs to canonical_cleanup_audit.';
