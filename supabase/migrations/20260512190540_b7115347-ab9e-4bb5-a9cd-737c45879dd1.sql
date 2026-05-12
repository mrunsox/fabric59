DO $$ BEGIN
  CREATE TYPE public.campaign_status AS ENUM ('draft','ready','live','paused','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  name text NOT NULL,
  status public.campaign_status NOT NULL DEFAULT 'draft',
  source_type text,
  source_id uuid,
  legacy_status text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaigns_source_uq UNIQUE (source_type, source_id)
);
CREATE INDEX IF NOT EXISTS campaigns_workspace_idx ON public.campaigns(workspace_id);
CREATE INDEX IF NOT EXISTS campaigns_client_idx ON public.campaigns(client_id);
CREATE INDEX IF NOT EXISTS campaigns_status_idx ON public.campaigns(status);

DROP TRIGGER IF EXISTS campaigns_set_updated_at ON public.campaigns;
CREATE TRIGGER campaigns_set_updated_at
BEFORE UPDATE ON public.campaigns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaigns readable by workspace members" ON public.campaigns;
CREATE POLICY "campaigns readable by workspace members"
ON public.campaigns FOR SELECT TO authenticated
USING (
  public.is_workspace_member(auth.uid(), workspace_id)
  OR public.is_master_admin(auth.uid())
);

DROP POLICY IF EXISTS "campaigns managed by org admins" ON public.campaigns;
CREATE POLICY "campaigns managed by org admins"
ON public.campaigns FOR ALL TO authenticated
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

CREATE OR REPLACE FUNCTION public.map_legacy_campaign_status(_legacy text)
RETURNS public.campaign_status
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE lower(coalesce(_legacy, 'draft'))
    WHEN 'draft' THEN 'draft'::public.campaign_status
    WHEN 'submitted' THEN 'ready'::public.campaign_status
    WHEN 'provisioning' THEN 'ready'::public.campaign_status
    WHEN 'ready' THEN 'ready'::public.campaign_status
    WHEN 'live' THEN 'live'::public.campaign_status
    WHEN 'active' THEN 'live'::public.campaign_status
    WHEN 'paused' THEN 'paused'::public.campaign_status
    WHEN 'stopped' THEN 'paused'::public.campaign_status
    WHEN 'archived' THEN 'archived'::public.campaign_status
    ELSE 'draft'::public.campaign_status
  END
$$;

CREATE OR REPLACE FUNCTION public.mirror_campaign_setup_to_canonical()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_workspace_id uuid;
  v_client_id uuid;
BEGIN
  SELECT id INTO v_workspace_id
  FROM public.workspaces
  WHERE organization_id = NEW.organization_id AND is_default
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_client_id
  FROM public.tenants
  WHERE organization_id = NEW.organization_id
    AND lower(name) = lower(coalesce(NEW.client_name, ''))
  LIMIT 1;

  INSERT INTO public.campaigns (
    workspace_id, client_id, name, status,
    source_type, source_id, legacy_status,
    metadata, created_by, created_at, updated_at
  )
  VALUES (
    v_workspace_id, v_client_id, NEW.campaign_name,
    public.map_legacy_campaign_status(NEW.status),
    'campaign_setup', NEW.id, NEW.status,
    coalesce(NEW.intake_data, '{}'::jsonb), NEW.created_by, NEW.created_at, NEW.updated_at
  )
  ON CONFLICT ON CONSTRAINT campaigns_source_uq DO UPDATE
    SET name = EXCLUDED.name,
        status = EXCLUDED.status,
        client_id = EXCLUDED.client_id,
        legacy_status = EXCLUDED.legacy_status,
        metadata = EXCLUDED.metadata,
        updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS campaign_setups_mirror_canonical ON public.campaign_setups;
CREATE TRIGGER campaign_setups_mirror_canonical
AFTER INSERT OR UPDATE ON public.campaign_setups
FOR EACH ROW EXECUTE FUNCTION public.mirror_campaign_setup_to_canonical();

INSERT INTO public.campaigns (
  workspace_id, client_id, name, status,
  source_type, source_id, legacy_status,
  metadata, created_by, created_at, updated_at
)
SELECT
  w.id,
  t.id,
  cs.campaign_name,
  public.map_legacy_campaign_status(cs.status),
  'campaign_setup',
  cs.id,
  cs.status,
  coalesce(cs.intake_data, '{}'::jsonb),
  cs.created_by,
  cs.created_at,
  cs.updated_at
FROM public.campaign_setups cs
JOIN public.workspaces w
  ON w.organization_id = cs.organization_id AND w.is_default
LEFT JOIN public.tenants t
  ON t.organization_id = cs.organization_id
 AND lower(t.name) = lower(coalesce(cs.client_name, ''))
ON CONFLICT ON CONSTRAINT campaigns_source_uq DO NOTHING;