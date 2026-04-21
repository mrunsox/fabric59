
-- ============================================================
-- 1. Five9 ownership mode
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.five9_ownership_mode AS ENUM ('client', 'workspace');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS five9_ownership_mode public.five9_ownership_mode NOT NULL DEFAULT 'workspace';

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS five9_ownership_mode public.five9_ownership_mode NULL;

-- ============================================================
-- 2. Flows / Deployments
-- ============================================================
CREATE TABLE IF NOT EXISTS public.flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL,
  definition JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.flow_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES public.flows(id) ON DELETE CASCADE,
  version INT NOT NULL,
  definition JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (flow_id, version)
);

CREATE TABLE IF NOT EXISTS public.flow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  definition JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  flow_id UUID NOT NULL REFERENCES public.flows(id) ON DELETE CASCADE,
  flow_version INT NOT NULL DEFAULT 1,
  client_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  scope JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.deployment_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deployment_id UUID NOT NULL REFERENCES public.deployments(id) ON DELETE CASCADE,
  trigger_event_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  error TEXT,
  payload JSONB
);

CREATE INDEX IF NOT EXISTS idx_flows_org ON public.flows(organization_id);
CREATE INDEX IF NOT EXISTS idx_deployments_org ON public.deployments(organization_id);
CREATE INDEX IF NOT EXISTS idx_deployments_flow ON public.deployments(flow_id);
CREATE INDEX IF NOT EXISTS idx_deployment_runs_dep ON public.deployment_runs(deployment_id);
CREATE INDEX IF NOT EXISTS idx_deployment_runs_org_started ON public.deployment_runs(organization_id, started_at DESC);

ALTER TABLE public.flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployment_runs ENABLE ROW LEVEL SECURITY;

-- flows
CREATE POLICY "flows_org_select" ON public.flows FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id) OR public.is_master_admin(auth.uid()));
CREATE POLICY "flows_org_insert" ON public.flows FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "flows_org_update" ON public.flows FOR UPDATE
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "flows_org_delete" ON public.flows FOR DELETE
  USING (public.is_org_owner_or_admin(auth.uid(), organization_id) OR public.is_master_admin(auth.uid()));

-- flow_versions
CREATE POLICY "flow_versions_select" ON public.flow_versions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.flows f WHERE f.id = flow_id AND (public.is_org_member(auth.uid(), f.organization_id) OR public.is_master_admin(auth.uid()))));
CREATE POLICY "flow_versions_insert" ON public.flow_versions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.flows f WHERE f.id = flow_id AND public.is_org_member(auth.uid(), f.organization_id)));

-- flow_templates (global readable when org is null)
CREATE POLICY "flow_templates_select" ON public.flow_templates FOR SELECT
  USING (organization_id IS NULL OR public.is_org_member(auth.uid(), organization_id) OR public.is_master_admin(auth.uid()));
CREATE POLICY "flow_templates_insert" ON public.flow_templates FOR INSERT
  WITH CHECK (organization_id IS NULL AND public.is_master_admin(auth.uid()) OR public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "flow_templates_update" ON public.flow_templates FOR UPDATE
  USING (public.is_master_admin(auth.uid()) OR (organization_id IS NOT NULL AND public.is_org_owner_or_admin(auth.uid(), organization_id)));
CREATE POLICY "flow_templates_delete" ON public.flow_templates FOR DELETE
  USING (public.is_master_admin(auth.uid()) OR (organization_id IS NOT NULL AND public.is_org_owner_or_admin(auth.uid(), organization_id)));

-- deployments
CREATE POLICY "deployments_select" ON public.deployments FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id) OR public.is_master_admin(auth.uid()));
CREATE POLICY "deployments_insert" ON public.deployments FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "deployments_update" ON public.deployments FOR UPDATE
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "deployments_delete" ON public.deployments FOR DELETE
  USING (public.is_org_owner_or_admin(auth.uid(), organization_id) OR public.is_master_admin(auth.uid()));

-- deployment_runs
CREATE POLICY "deployment_runs_select" ON public.deployment_runs FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id) OR public.is_master_admin(auth.uid()));
CREATE POLICY "deployment_runs_insert" ON public.deployment_runs FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id) OR public.is_master_admin(auth.uid()));

-- triggers
CREATE TRIGGER update_flows_updated_at BEFORE UPDATE ON public.flows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_flow_templates_updated_at BEFORE UPDATE ON public.flow_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_deployments_updated_at BEFORE UPDATE ON public.deployments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 3. Vault
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.vault_feature_status AS ENUM ('core', 'archived', 'experimental', 'deprecated', 'extracted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.vault_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status public.vault_feature_status NOT NULL DEFAULT 'archived',
  summary TEXT,
  reason_archived TEXT,
  original_routes TEXT[] NOT NULL DEFAULT '{}',
  frontend_files TEXT[] NOT NULL DEFAULT '{}',
  backend_files TEXT[] NOT NULL DEFAULT '{}',
  db_objects TEXT[] NOT NULL DEFAULT '{}',
  edge_functions TEXT[] NOT NULL DEFAULT '{}',
  dependencies JSONB NOT NULL DEFAULT '{}'::jsonb,
  required_secrets TEXT[] NOT NULL DEFAULT '{}',
  risks TEXT,
  restore_notes TEXT,
  extraction_notes TEXT,
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vault_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id UUID NOT NULL REFERENCES public.vault_features(id) ON DELETE CASCADE,
  version TEXT NOT NULL DEFAULT 'v1',
  manifest JSONB NOT NULL DEFAULT '{}'::jsonb,
  bundle_path TEXT NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vault_exports_feature ON public.vault_exports(feature_id, created_at DESC);

ALTER TABLE public.vault_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vault_features_master_all" ON public.vault_features FOR ALL
  USING (public.is_master_admin(auth.uid())) WITH CHECK (public.is_master_admin(auth.uid()));

CREATE POLICY "vault_exports_master_all" ON public.vault_exports FOR ALL
  USING (public.is_master_admin(auth.uid())) WITH CHECK (public.is_master_admin(auth.uid()));

CREATE TRIGGER update_vault_features_updated_at BEFORE UPDATE ON public.vault_features
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('vault-exports', 'vault-exports', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "vault_exports_bucket_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'vault-exports' AND public.is_master_admin(auth.uid()));
CREATE POLICY "vault_exports_bucket_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'vault-exports' AND public.is_master_admin(auth.uid()));
CREATE POLICY "vault_exports_bucket_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'vault-exports' AND public.is_master_admin(auth.uid()));
CREATE POLICY "vault_exports_bucket_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'vault-exports' AND public.is_master_admin(auth.uid()));
