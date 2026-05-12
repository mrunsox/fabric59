-- Phase 5: Canonical Templates =========================================

DO $$ BEGIN
  CREATE TYPE public.template_scope AS ENUM ('platform','org','partner','client','workspace');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.template_kind AS ENUM ('guide','flow','campaign','email','summary','prompt','report');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.template_status AS ENUM ('draft','published','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  scope_type public.template_scope NOT NULL,
  scope_id uuid,
  kind public.template_kind NOT NULL,
  name text NOT NULL,
  description text,
  status public.template_status NOT NULL DEFAULT 'draft',
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  parent_template_id uuid REFERENCES public.templates(id) ON DELETE SET NULL,
  current_version integer NOT NULL DEFAULT 1,
  source_type text,
  source_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT templates_source_uq UNIQUE (source_type, source_id)
);

CREATE INDEX IF NOT EXISTS templates_org_idx ON public.templates(organization_id);
CREATE INDEX IF NOT EXISTS templates_scope_idx ON public.templates(scope_type, scope_id);
CREATE INDEX IF NOT EXISTS templates_kind_idx ON public.templates(kind);
CREATE INDEX IF NOT EXISTS templates_parent_idx ON public.templates(parent_template_id);

CREATE TABLE IF NOT EXISTS public.template_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  version integer NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_current boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(template_id, version)
);

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_versions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_templates_updated_at
  BEFORE UPDATE ON public.templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS policies for templates
CREATE POLICY "templates_select_platform_or_member" ON public.templates
  FOR SELECT TO authenticated
  USING (
    scope_type = 'platform'
    OR (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id))
    OR public.is_master_admin(auth.uid())
  );

CREATE POLICY "templates_insert_org_or_master" ON public.templates
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_master_admin(auth.uid())
    OR (organization_id IS NOT NULL AND public.is_org_owner_or_admin(auth.uid(), organization_id))
    OR (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id) AND scope_type IN ('workspace','client'))
  );

CREATE POLICY "templates_update_org_admin_or_master" ON public.templates
  FOR UPDATE TO authenticated
  USING (
    public.is_master_admin(auth.uid())
    OR (organization_id IS NOT NULL AND public.is_org_owner_or_admin(auth.uid(), organization_id))
  );

CREATE POLICY "templates_delete_org_admin_or_master" ON public.templates
  FOR DELETE TO authenticated
  USING (
    public.is_master_admin(auth.uid())
    OR (organization_id IS NOT NULL AND public.is_org_owner_or_admin(auth.uid(), organization_id))
  );

-- RLS for template_versions (inherit from parent template)
CREATE POLICY "template_versions_select" ON public.template_versions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.templates t WHERE t.id = template_id
      AND (t.scope_type = 'platform'
        OR (t.organization_id IS NOT NULL AND public.is_org_member(auth.uid(), t.organization_id))
        OR public.is_master_admin(auth.uid()))
  ));

CREATE POLICY "template_versions_manage" ON public.template_versions
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.templates t WHERE t.id = template_id
      AND (public.is_master_admin(auth.uid())
        OR (t.organization_id IS NOT NULL AND public.is_org_owner_or_admin(auth.uid(), t.organization_id)))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.templates t WHERE t.id = template_id
      AND (public.is_master_admin(auth.uid())
        OR (t.organization_id IS NOT NULL AND public.is_org_owner_or_admin(auth.uid(), t.organization_id)))
  ));

-- Mirror trigger functions for legacy tables ============================

CREATE OR REPLACE FUNCTION public.mirror_script_template_to_canonical()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.templates (
    organization_id, scope_type, scope_id, kind, name, description,
    status, content, source_type, source_id, metadata, created_by, created_at, updated_at
  ) VALUES (
    NEW.organization_id,
    CASE WHEN NEW.is_built_in THEN 'platform'::template_scope ELSE 'org'::template_scope END,
    NEW.organization_id, 'guide'::template_kind, NEW.name, NEW.description,
    'published'::template_status, COALESCE(NEW.content, '{}'::jsonb),
    'script_template', NEW.id,
    jsonb_build_object('category', NEW.category, 'is_built_in', NEW.is_built_in, 'tenant_id', NEW.tenant_id),
    NEW.created_by, NEW.created_at, now()
  )
  ON CONFLICT ON CONSTRAINT templates_source_uq DO UPDATE
    SET name = EXCLUDED.name, description = EXCLUDED.description,
        content = EXCLUDED.content, metadata = EXCLUDED.metadata, updated_at = now();
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.mirror_flow_template_to_canonical()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.templates (
    organization_id, scope_type, scope_id, kind, name, description,
    status, content, source_type, source_id, metadata, created_by, created_at, updated_at
  ) VALUES (
    NEW.organization_id,
    CASE WHEN NEW.organization_id IS NULL THEN 'platform'::template_scope ELSE 'org'::template_scope END,
    NEW.organization_id, 'flow'::template_kind, NEW.name, NEW.description,
    'published'::template_status, COALESCE(NEW.definition, '{}'::jsonb),
    'flow_template', NEW.id,
    jsonb_build_object('category', NEW.category),
    NEW.created_by, NEW.created_at, NEW.updated_at
  )
  ON CONFLICT ON CONSTRAINT templates_source_uq DO UPDATE
    SET name = EXCLUDED.name, description = EXCLUDED.description,
        content = EXCLUDED.content, metadata = EXCLUDED.metadata, updated_at = now();
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.mirror_email_template_to_canonical()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.templates (
    organization_id, scope_type, scope_id, kind, name,
    status, content, source_type, source_id, metadata, created_by, created_at, updated_at
  ) VALUES (
    NEW.organization_id, 'org'::template_scope, NEW.organization_id, 'email'::template_kind, NEW.name,
    'published'::template_status,
    jsonb_build_object('html', NEW.html_content),
    'email_template', NEW.id,
    jsonb_build_object('is_default', NEW.is_default),
    NEW.created_by, NEW.created_at, NEW.updated_at
  )
  ON CONFLICT ON CONSTRAINT templates_source_uq DO UPDATE
    SET name = EXCLUDED.name, content = EXCLUDED.content,
        metadata = EXCLUDED.metadata, updated_at = now();
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.mirror_report_template_to_canonical()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.templates (
    organization_id, scope_type, scope_id, kind, name,
    status, content, source_type, source_id, metadata, created_by, created_at, updated_at
  ) VALUES (
    NEW.organization_id, 'org'::template_scope, NEW.organization_id, 'report'::template_kind, NEW.name,
    'published'::template_status,
    jsonb_build_object('field_config', NEW.field_config, 'filter_config', NEW.filter_config),
    'report_template', NEW.id,
    jsonb_build_object('report_type', NEW.report_type),
    NEW.created_by, NEW.created_at, NEW.updated_at
  )
  ON CONFLICT ON CONSTRAINT templates_source_uq DO UPDATE
    SET name = EXCLUDED.name, content = EXCLUDED.content,
        metadata = EXCLUDED.metadata, updated_at = now();
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.mirror_call_summary_template_to_canonical()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_scope public.template_scope;
  v_scope_id uuid;
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN
    v_scope := 'client'; v_scope_id := NEW.tenant_id;
  ELSIF NEW.partner_id IS NOT NULL THEN
    v_scope := 'partner'; v_scope_id := NEW.partner_id;
  ELSE
    v_scope := 'org'; v_scope_id := NEW.organization_id;
  END IF;

  INSERT INTO public.templates (
    organization_id, scope_type, scope_id, kind, name,
    status, content, source_type, source_id, metadata, created_by, created_at, updated_at
  ) VALUES (
    NEW.organization_id, v_scope, v_scope_id, 'summary'::template_kind, NEW.name,
    'published'::template_status,
    jsonb_build_object('body', NEW.template_body, 'channel', NEW.channel),
    'call_summary_template', NEW.id,
    jsonb_build_object('partner_id', NEW.partner_id, 'tenant_id', NEW.tenant_id, 'channel', NEW.channel),
    NEW.created_by, NEW.created_at, now()
  )
  ON CONFLICT ON CONSTRAINT templates_source_uq DO UPDATE
    SET name = EXCLUDED.name, content = EXCLUDED.content,
        metadata = EXCLUDED.metadata, updated_at = now();
  RETURN NEW;
END $$;

-- legal_connect_prompt_templates may have varying columns; use to_jsonb for full payload
CREATE OR REPLACE FUNCTION public.mirror_lc_prompt_template_to_canonical()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_payload jsonb;
  v_org uuid;
  v_name text;
BEGIN
  v_payload := to_jsonb(NEW);
  v_org := NULLIF(v_payload->>'organization_id','')::uuid;
  v_name := COALESCE(v_payload->>'name', v_payload->>'title', 'Untitled prompt');

  INSERT INTO public.templates (
    organization_id, scope_type, scope_id, kind, name,
    status, content, source_type, source_id, metadata, created_by, created_at, updated_at
  ) VALUES (
    v_org,
    CASE WHEN v_org IS NULL THEN 'platform'::template_scope ELSE 'org'::template_scope END,
    v_org, 'prompt'::template_kind, v_name,
    'published'::template_status,
    v_payload,
    'legal_connect_prompt_template', (v_payload->>'id')::uuid,
    '{}'::jsonb,
    NULLIF(v_payload->>'created_by','')::uuid,
    COALESCE(NULLIF(v_payload->>'created_at','')::timestamptz, now()),
    now()
  )
  ON CONFLICT ON CONSTRAINT templates_source_uq DO UPDATE
    SET name = EXCLUDED.name, content = EXCLUDED.content, updated_at = now();
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.mirror_campaign_blueprint_to_canonical()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_payload jsonb;
  v_org uuid;
  v_name text;
BEGIN
  v_payload := to_jsonb(NEW);
  v_org := NULLIF(v_payload->>'organization_id','')::uuid;
  v_name := COALESCE(v_payload->>'name', v_payload->>'campaign_name', 'Untitled blueprint');

  INSERT INTO public.templates (
    organization_id, scope_type, scope_id, kind, name, description,
    status, content, source_type, source_id, metadata, created_by, created_at, updated_at
  ) VALUES (
    v_org,
    CASE WHEN v_org IS NULL THEN 'platform'::template_scope ELSE 'org'::template_scope END,
    v_org, 'campaign'::template_kind, v_name,
    NULLIF(v_payload->>'description',''),
    'published'::template_status,
    v_payload,
    'campaign_blueprint', (v_payload->>'id')::uuid,
    '{}'::jsonb,
    NULLIF(v_payload->>'created_by','')::uuid,
    COALESCE(NULLIF(v_payload->>'created_at','')::timestamptz, now()),
    now()
  )
  ON CONFLICT ON CONSTRAINT templates_source_uq DO UPDATE
    SET name = EXCLUDED.name, description = EXCLUDED.description,
        content = EXCLUDED.content, updated_at = now();
  RETURN NEW;
END $$;

-- Attach triggers
DROP TRIGGER IF EXISTS trg_mirror_script_template ON public.script_templates;
CREATE TRIGGER trg_mirror_script_template
  AFTER INSERT OR UPDATE ON public.script_templates
  FOR EACH ROW EXECUTE FUNCTION public.mirror_script_template_to_canonical();

DROP TRIGGER IF EXISTS trg_mirror_flow_template ON public.flow_templates;
CREATE TRIGGER trg_mirror_flow_template
  AFTER INSERT OR UPDATE ON public.flow_templates
  FOR EACH ROW EXECUTE FUNCTION public.mirror_flow_template_to_canonical();

DROP TRIGGER IF EXISTS trg_mirror_email_template ON public.email_templates;
CREATE TRIGGER trg_mirror_email_template
  AFTER INSERT OR UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.mirror_email_template_to_canonical();

DROP TRIGGER IF EXISTS trg_mirror_report_template ON public.report_templates;
CREATE TRIGGER trg_mirror_report_template
  AFTER INSERT OR UPDATE ON public.report_templates
  FOR EACH ROW EXECUTE FUNCTION public.mirror_report_template_to_canonical();

DROP TRIGGER IF EXISTS trg_mirror_call_summary_template ON public.call_summary_templates;
CREATE TRIGGER trg_mirror_call_summary_template
  AFTER INSERT OR UPDATE ON public.call_summary_templates
  FOR EACH ROW EXECUTE FUNCTION public.mirror_call_summary_template_to_canonical();

DROP TRIGGER IF EXISTS trg_mirror_lc_prompt_template ON public.legal_connect_prompt_templates;
CREATE TRIGGER trg_mirror_lc_prompt_template
  AFTER INSERT OR UPDATE ON public.legal_connect_prompt_templates
  FOR EACH ROW EXECUTE FUNCTION public.mirror_lc_prompt_template_to_canonical();

DROP TRIGGER IF EXISTS trg_mirror_campaign_blueprint ON public.campaign_blueprints;
CREATE TRIGGER trg_mirror_campaign_blueprint
  AFTER INSERT OR UPDATE ON public.campaign_blueprints
  FOR EACH ROW EXECUTE FUNCTION public.mirror_campaign_blueprint_to_canonical();

-- Backfill existing rows ===============================================
INSERT INTO public.templates (
  organization_id, scope_type, scope_id, kind, name, description,
  status, content, source_type, source_id, metadata, created_by, created_at, updated_at
)
SELECT organization_id,
       CASE WHEN is_built_in THEN 'platform'::template_scope ELSE 'org'::template_scope END,
       organization_id, 'guide'::template_kind, name, description,
       'published'::template_status, COALESCE(content, '{}'::jsonb),
       'script_template', id,
       jsonb_build_object('category', category, 'is_built_in', is_built_in, 'tenant_id', tenant_id),
       created_by, created_at, now()
FROM public.script_templates
ON CONFLICT ON CONSTRAINT templates_source_uq DO NOTHING;

INSERT INTO public.templates (
  organization_id, scope_type, scope_id, kind, name, description,
  status, content, source_type, source_id, metadata, created_by, created_at, updated_at
)
SELECT organization_id,
       CASE WHEN organization_id IS NULL THEN 'platform'::template_scope ELSE 'org'::template_scope END,
       organization_id, 'flow'::template_kind, name, description,
       'published'::template_status, COALESCE(definition, '{}'::jsonb),
       'flow_template', id,
       jsonb_build_object('category', category),
       created_by, created_at, updated_at
FROM public.flow_templates
ON CONFLICT ON CONSTRAINT templates_source_uq DO NOTHING;

INSERT INTO public.templates (
  organization_id, scope_type, scope_id, kind, name,
  status, content, source_type, source_id, metadata, created_by, created_at, updated_at
)
SELECT organization_id, 'org'::template_scope, organization_id, 'email'::template_kind, name,
       'published'::template_status,
       jsonb_build_object('html', html_content),
       'email_template', id,
       jsonb_build_object('is_default', is_default),
       created_by, created_at, updated_at
FROM public.email_templates
ON CONFLICT ON CONSTRAINT templates_source_uq DO NOTHING;

INSERT INTO public.templates (
  organization_id, scope_type, scope_id, kind, name,
  status, content, source_type, source_id, metadata, created_by, created_at, updated_at
)
SELECT organization_id, 'org'::template_scope, organization_id, 'report'::template_kind, name,
       'published'::template_status,
       jsonb_build_object('field_config', field_config, 'filter_config', filter_config),
       'report_template', id,
       jsonb_build_object('report_type', report_type),
       created_by, created_at, updated_at
FROM public.report_templates
ON CONFLICT ON CONSTRAINT templates_source_uq DO NOTHING;

INSERT INTO public.templates (
  organization_id, scope_type, scope_id, kind, name,
  status, content, source_type, source_id, metadata, created_by, created_at, updated_at
)
SELECT organization_id,
       CASE WHEN tenant_id IS NOT NULL THEN 'client'::template_scope
            WHEN partner_id IS NOT NULL THEN 'partner'::template_scope
            ELSE 'org'::template_scope END,
       COALESCE(tenant_id, partner_id, organization_id),
       'summary'::template_kind, name,
       'published'::template_status,
       jsonb_build_object('body', template_body, 'channel', channel),
       'call_summary_template', id,
       jsonb_build_object('partner_id', partner_id, 'tenant_id', tenant_id, 'channel', channel),
       created_by, created_at, now()
FROM public.call_summary_templates
ON CONFLICT ON CONSTRAINT templates_source_uq DO NOTHING;

-- Generic backfill via to_jsonb for variable-shape tables
DO $do$
DECLARE r record;
BEGIN
  FOR r IN SELECT to_jsonb(t.*) AS p FROM public.legal_connect_prompt_templates t LOOP
    INSERT INTO public.templates (
      organization_id, scope_type, scope_id, kind, name,
      status, content, source_type, source_id, metadata, created_by, created_at, updated_at
    ) VALUES (
      NULLIF(r.p->>'organization_id','')::uuid,
      CASE WHEN NULLIF(r.p->>'organization_id','') IS NULL THEN 'platform'::template_scope ELSE 'org'::template_scope END,
      NULLIF(r.p->>'organization_id','')::uuid,
      'prompt'::template_kind,
      COALESCE(r.p->>'name', r.p->>'title', 'Untitled prompt'),
      'published'::template_status,
      r.p, 'legal_connect_prompt_template', (r.p->>'id')::uuid, '{}'::jsonb,
      NULLIF(r.p->>'created_by','')::uuid,
      COALESCE(NULLIF(r.p->>'created_at','')::timestamptz, now()), now()
    ) ON CONFLICT ON CONSTRAINT templates_source_uq DO NOTHING;
  END LOOP;

  FOR r IN SELECT to_jsonb(t.*) AS p FROM public.campaign_blueprints t LOOP
    INSERT INTO public.templates (
      organization_id, scope_type, scope_id, kind, name, description,
      status, content, source_type, source_id, metadata, created_by, created_at, updated_at
    ) VALUES (
      NULLIF(r.p->>'organization_id','')::uuid,
      CASE WHEN NULLIF(r.p->>'organization_id','') IS NULL THEN 'platform'::template_scope ELSE 'org'::template_scope END,
      NULLIF(r.p->>'organization_id','')::uuid,
      'campaign'::template_kind,
      COALESCE(r.p->>'name', r.p->>'campaign_name', 'Untitled blueprint'),
      NULLIF(r.p->>'description',''),
      'published'::template_status,
      r.p, 'campaign_blueprint', (r.p->>'id')::uuid, '{}'::jsonb,
      NULLIF(r.p->>'created_by','')::uuid,
      COALESCE(NULLIF(r.p->>'created_at','')::timestamptz, now()), now()
    ) ON CONFLICT ON CONSTRAINT templates_source_uq DO NOTHING;
  END LOOP;
END $do$;
