
-- ============================================================
-- PHASE 7: Canonical integrations layer
-- ============================================================

-- 1. Provider registry
CREATE TABLE IF NOT EXISTS public.integration_providers (
  id text PRIMARY KEY, -- e.g. 'clio', 'mycase', 'five9', 'slack', 'zapier', 'make'
  display_name text NOT NULL,
  category text NOT NULL, -- 'crm', 'telephony', 'messaging', 'automation'
  capabilities jsonb NOT NULL DEFAULT '{}'::jsonb, -- { contacts: true, matters: true, webhooks: true, ... }
  auth_type text NOT NULL DEFAULT 'oauth2', -- oauth2 | api_key | webhook | none
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.integration_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view providers"
  ON public.integration_providers FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Master admin can manage providers"
  ON public.integration_providers FOR ALL
  TO authenticated
  USING (public.is_master_admin(auth.uid()))
  WITH CHECK (public.is_master_admin(auth.uid()));

-- Seed canonical providers
INSERT INTO public.integration_providers (id, display_name, category, capabilities, auth_type)
VALUES
  ('clio',   'Clio',    'crm',        '{"contacts":true,"matters":true,"webhooks":true}'::jsonb, 'oauth2'),
  ('mycase', 'MyCase',  'crm',        '{"contacts":true,"cases":true}'::jsonb,                   'api_key'),
  ('five9',  'Five9',   'telephony',  '{"calls":true,"campaigns":true,"webhooks":true}'::jsonb,  'api_key'),
  ('slack',  'Slack',   'messaging',  '{"notifications":true,"channels":true}'::jsonb,           'oauth2'),
  ('zapier', 'Zapier',  'automation', '{"webhooks":true}'::jsonb,                                'webhook'),
  ('make',   'Make',    'automation', '{"webhooks":true}'::jsonb,                                'webhook')
ON CONFLICT (id) DO NOTHING;

-- 2. Canonical workspace-owned connections
CREATE TABLE IF NOT EXISTS public.integration_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider_id text NOT NULL REFERENCES public.integration_providers(id),
  client_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL, -- optional client scope
  display_name text,
  status text NOT NULL DEFAULT 'not_connected', -- not_connected | connected | error | disabled
  auth_type text,
  credentials_ref text, -- reference to vault secret name; never store raw creds
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at timestamptz,
  last_error text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, provider_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_integration_connections_workspace ON public.integration_connections(workspace_id);
CREATE INDEX IF NOT EXISTS idx_integration_connections_provider ON public.integration_connections(provider_id);
CREATE INDEX IF NOT EXISTS idx_integration_connections_status ON public.integration_connections(status);

ALTER TABLE public.integration_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view connections"
  ON public.integration_connections FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Org owners/admins can manage connections"
  ON public.integration_connections FOR ALL
  TO authenticated
  USING (public.is_org_owner_or_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_owner_or_admin(auth.uid(), organization_id));

CREATE POLICY "Master admin can manage all connections"
  ON public.integration_connections FOR ALL
  TO authenticated
  USING (public.is_master_admin(auth.uid()))
  WITH CHECK (public.is_master_admin(auth.uid()));

CREATE TRIGGER update_integration_connections_updated_at
  BEFORE UPDATE ON public.integration_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Canonical provider-keyed identity mappings
-- Replaces fragmented clio_mappings, mycase_mappings, and similar per-provider tables.
CREATE TABLE IF NOT EXISTS public.integration_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider_id text NOT NULL REFERENCES public.integration_providers(id),
  lookup_key text NOT NULL, -- e.g. phone number, email, lead id
  lookup_kind text NOT NULL DEFAULT 'phone', -- phone | email | external_id
  external_ids jsonb NOT NULL DEFAULT '{}'::jsonb, -- { contact_id, matter_id, case_id, ... }
  source text NOT NULL DEFAULT 'canonical', -- canonical | clio_mappings | mycase_mappings
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_id, client_id, lookup_kind, lookup_key)
);

CREATE INDEX IF NOT EXISTS idx_integration_mappings_org ON public.integration_mappings(organization_id);
CREATE INDEX IF NOT EXISTS idx_integration_mappings_workspace ON public.integration_mappings(workspace_id);
CREATE INDEX IF NOT EXISTS idx_integration_mappings_client ON public.integration_mappings(client_id);
CREATE INDEX IF NOT EXISTS idx_integration_mappings_provider ON public.integration_mappings(provider_id);

ALTER TABLE public.integration_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view mappings"
  ON public.integration_mappings FOR SELECT
  TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Org owners/admins can manage mappings"
  ON public.integration_mappings FOR ALL
  TO authenticated
  USING (public.is_org_owner_or_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_owner_or_admin(auth.uid(), organization_id));

CREATE POLICY "Master admin can manage all mappings"
  ON public.integration_mappings FOR ALL
  TO authenticated
  USING (public.is_master_admin(auth.uid()))
  WITH CHECK (public.is_master_admin(auth.uid()));

CREATE TRIGGER update_integration_mappings_updated_at
  BEFORE UPDATE ON public.integration_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Mirror triggers — keep legacy writes flowing into canonical table

-- 4a. clio_mappings -> integration_mappings
CREATE OR REPLACE FUNCTION public.mirror_clio_mapping_to_canonical()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.integration_mappings (
    organization_id, client_id, provider_id, lookup_key, lookup_kind,
    external_ids, source
  ) VALUES (
    NEW.organization_id, NEW.tenant_id, 'clio', NEW.phone, 'phone',
    jsonb_strip_nulls(jsonb_build_object('contact_id', NEW.contact_id, 'matter_id', NEW.matter_id)),
    'clio_mappings'
  )
  ON CONFLICT (provider_id, client_id, lookup_kind, lookup_key) DO UPDATE
    SET external_ids = EXCLUDED.external_ids,
        organization_id = EXCLUDED.organization_id,
        updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mirror_clio_mapping_to_canonical_trigger ON public.clio_mappings;
CREATE TRIGGER mirror_clio_mapping_to_canonical_trigger
  AFTER INSERT OR UPDATE ON public.clio_mappings
  FOR EACH ROW EXECUTE FUNCTION public.mirror_clio_mapping_to_canonical();

-- 4b. mycase_mappings -> integration_mappings
CREATE OR REPLACE FUNCTION public.mirror_mycase_mapping_to_canonical()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.integration_mappings (
    organization_id, client_id, provider_id, lookup_key, lookup_kind,
    external_ids, source
  ) VALUES (
    NEW.organization_id, NEW.tenant_id, 'mycase', NEW.phone, 'phone',
    jsonb_strip_nulls(jsonb_build_object('contact_id', NEW.contact_id, 'case_id', NEW.case_id)),
    'mycase_mappings'
  )
  ON CONFLICT (provider_id, client_id, lookup_kind, lookup_key) DO UPDATE
    SET external_ids = EXCLUDED.external_ids,
        organization_id = EXCLUDED.organization_id,
        updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mirror_mycase_mapping_to_canonical_trigger ON public.mycase_mappings;
CREATE TRIGGER mirror_mycase_mapping_to_canonical_trigger
  AFTER INSERT OR UPDATE ON public.mycase_mappings
  FOR EACH ROW EXECUTE FUNCTION public.mirror_mycase_mapping_to_canonical();

-- 5. Backfill existing legacy rows
INSERT INTO public.integration_mappings (
  organization_id, client_id, provider_id, lookup_key, lookup_kind, external_ids, source
)
SELECT
  organization_id, tenant_id, 'clio', phone, 'phone',
  jsonb_strip_nulls(jsonb_build_object('contact_id', contact_id, 'matter_id', matter_id)),
  'clio_mappings'
FROM public.clio_mappings
ON CONFLICT (provider_id, client_id, lookup_kind, lookup_key) DO NOTHING;

INSERT INTO public.integration_mappings (
  organization_id, client_id, provider_id, lookup_key, lookup_kind, external_ids, source
)
SELECT
  organization_id, tenant_id, 'mycase', phone, 'phone',
  jsonb_strip_nulls(jsonb_build_object('contact_id', contact_id, 'case_id', case_id)),
  'mycase_mappings'
FROM public.mycase_mappings
ON CONFLICT (provider_id, client_id, lookup_kind, lookup_key) DO NOTHING;
