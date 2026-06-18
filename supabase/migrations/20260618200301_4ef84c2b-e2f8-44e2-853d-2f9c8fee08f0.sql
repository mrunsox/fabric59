
-- ============================================================
-- Business Brain Phase 6 — Vertical profiles and schemas
-- ============================================================

-- 1) Vertical profile catalog ---------------------------------
CREATE TABLE public.bb_vertical_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.bb_vertical_profiles TO authenticated;
GRANT ALL ON public.bb_vertical_profiles TO service_role;

ALTER TABLE public.bb_vertical_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vertical_profiles readable by authenticated"
  ON public.bb_vertical_profiles FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER bb_vertical_profiles_updated
  BEFORE UPDATE ON public.bb_vertical_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Workspace → profile mapping ------------------------------
CREATE TABLE public.bb_workspace_vertical_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  vertical_profile_id uuid NOT NULL REFERENCES public.bb_vertical_profiles(id) ON DELETE RESTRICT,
  client_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  is_default boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX bb_wvp_unique
  ON public.bb_workspace_vertical_profiles (workspace_id, COALESCE(client_id, '00000000-0000-0000-0000-000000000000'::uuid));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bb_workspace_vertical_profiles TO authenticated;
GRANT ALL ON public.bb_workspace_vertical_profiles TO service_role;

ALTER TABLE public.bb_workspace_vertical_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wvp readable by workspace members"
  ON public.bb_workspace_vertical_profiles FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "wvp writable by workspace admins"
  ON public.bb_workspace_vertical_profiles FOR ALL TO authenticated
  USING (public.has_workspace_role_min(auth.uid(), workspace_id, 'admin'::public.workspace_role))
  WITH CHECK (public.has_workspace_role_min(auth.uid(), workspace_id, 'admin'::public.workspace_role));

CREATE TRIGGER bb_wvp_updated
  BEFORE UPDATE ON public.bb_workspace_vertical_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Per-vertical entity requirements -------------------------
CREATE TABLE public.bb_vertical_entity_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_profile_id uuid NOT NULL REFERENCES public.bb_vertical_profiles(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  is_required boolean NOT NULL DEFAULT true,
  min_count integer NOT NULL DEFAULT 1,
  max_count integer,
  high_priority boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vertical_profile_id, entity_type)
);

GRANT SELECT ON public.bb_vertical_entity_requirements TO authenticated;
GRANT ALL ON public.bb_vertical_entity_requirements TO service_role;

ALTER TABLE public.bb_vertical_entity_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "entity_requirements readable"
  ON public.bb_vertical_entity_requirements FOR SELECT TO authenticated USING (true);

CREATE TRIGGER bb_ver_entity_req_updated
  BEFORE UPDATE ON public.bb_vertical_entity_requirements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Per-vertical field requirements --------------------------
CREATE TABLE public.bb_vertical_field_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_profile_id uuid NOT NULL REFERENCES public.bb_vertical_profiles(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  field_path text NOT NULL,
  is_required boolean NOT NULL DEFAULT true,
  validation_hint text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vertical_profile_id, entity_type, field_path)
);

GRANT SELECT ON public.bb_vertical_field_requirements TO authenticated;
GRANT ALL ON public.bb_vertical_field_requirements TO service_role;

ALTER TABLE public.bb_vertical_field_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "field_requirements readable"
  ON public.bb_vertical_field_requirements FOR SELECT TO authenticated USING (true);

CREATE TRIGGER bb_ver_field_req_updated
  BEFORE UPDATE ON public.bb_vertical_field_requirements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Completeness rollup --------------------------------------
CREATE TABLE public.bb_vertical_completeness (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  vertical_profile_id uuid NOT NULL REFERENCES public.bb_vertical_profiles(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  required_count integer NOT NULL DEFAULT 0,
  actual_count integer NOT NULL DEFAULT 0,
  coverage_ratio numeric NOT NULL DEFAULT 0,
  last_computed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, vertical_profile_id, entity_type)
);

GRANT SELECT ON public.bb_vertical_completeness TO authenticated;
GRANT ALL ON public.bb_vertical_completeness TO service_role;

ALTER TABLE public.bb_vertical_completeness ENABLE ROW LEVEL SECURITY;

CREATE POLICY "completeness readable by workspace members"
  ON public.bb_vertical_completeness FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE TRIGGER bb_ver_completeness_updated
  BEFORE UPDATE ON public.bb_vertical_completeness
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6) Gaps -----------------------------------------------------
CREATE TABLE public.bb_vertical_gaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  vertical_profile_id uuid NOT NULL REFERENCES public.bb_vertical_profiles(id) ON DELETE CASCADE,
  gap_kind text NOT NULL CHECK (gap_kind IN ('missing_entity','missing_field','under_min_count')),
  entity_type text NOT NULL,
  fact_id uuid REFERENCES public.bb_facts(id) ON DELETE CASCADE,
  field_path text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','suppressed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  suppressed_at timestamptz,
  suppressed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Partial unique index: only one OPEN gap per (workspace, profile, entity, fact, field, kind).
CREATE UNIQUE INDEX bb_vertical_gaps_open_uq
  ON public.bb_vertical_gaps (
    workspace_id, vertical_profile_id, entity_type, gap_kind,
    COALESCE(fact_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(field_path, '')
  )
  WHERE status = 'open';

-- And one SUPPRESSED gap per shape (sticky suppression).
CREATE UNIQUE INDEX bb_vertical_gaps_suppressed_uq
  ON public.bb_vertical_gaps (
    workspace_id, vertical_profile_id, entity_type, gap_kind,
    COALESCE(fact_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(field_path, '')
  )
  WHERE status = 'suppressed';

CREATE INDEX bb_vertical_gaps_ws_status ON public.bb_vertical_gaps (workspace_id, status);

GRANT SELECT, UPDATE ON public.bb_vertical_gaps TO authenticated;
GRANT ALL ON public.bb_vertical_gaps TO service_role;

ALTER TABLE public.bb_vertical_gaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gaps readable by workspace members"
  ON public.bb_vertical_gaps FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "gaps updatable by supervisors"
  ON public.bb_vertical_gaps FOR UPDATE TO authenticated
  USING (public.has_workspace_role_min(auth.uid(), workspace_id, 'supervisor'::public.workspace_role))
  WITH CHECK (public.has_workspace_role_min(auth.uid(), workspace_id, 'supervisor'::public.workspace_role));

CREATE TRIGGER bb_ver_gaps_updated
  BEFORE UPDATE ON public.bb_vertical_gaps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7) Seed profiles + requirements -----------------------------
INSERT INTO public.bb_vertical_profiles (slug, label, description) VALUES
  ('local_gov', 'Local Government', 'City / county service line: 311-style intake, departmental routing, escalation contacts.'),
  ('healthcare_lite', 'Healthcare (Lite)', 'Clinic-scale intake: services, hours, on-call escalation, intake requirements.'),
  ('property_mgmt', 'Property Management', 'Residential / commercial property service: maintenance, hours, escalation contacts.')
ON CONFLICT (slug) DO NOTHING;

-- Entity requirements (conservative starter set).
WITH p AS (SELECT id, slug FROM public.bb_vertical_profiles)
INSERT INTO public.bb_vertical_entity_requirements (vertical_profile_id, entity_type, is_required, min_count, high_priority)
SELECT p.id, x.entity_type, true, x.min_count, x.high_priority
FROM p
JOIN (VALUES
  ('local_gov', 'service', 1, false),
  ('local_gov', 'hours', 1, true),
  ('local_gov', 'escalation_contact', 1, true),
  ('healthcare_lite', 'service', 1, false),
  ('healthcare_lite', 'hours', 1, true),
  ('healthcare_lite', 'escalation_contact', 1, true),
  ('healthcare_lite', 'intake_requirement', 1, false),
  ('property_mgmt', 'service', 1, false),
  ('property_mgmt', 'hours', 1, true),
  ('property_mgmt', 'escalation_contact', 1, true)
) AS x(slug, entity_type, min_count, high_priority) ON x.slug = p.slug
ON CONFLICT (vertical_profile_id, entity_type) DO NOTHING;

-- Field requirements (minimal payload checks; live in payload.*).
WITH p AS (SELECT id, slug FROM public.bb_vertical_profiles)
INSERT INTO public.bb_vertical_field_requirements (vertical_profile_id, entity_type, field_path, is_required, validation_hint)
SELECT p.id, x.entity_type, x.field_path, true, x.hint
FROM p
JOIN (VALUES
  ('local_gov', 'service', 'payload.name', 'Service must have a display name'),
  ('local_gov', 'hours', 'payload.hours', 'Hours payload required'),
  ('local_gov', 'escalation_contact', 'payload.contact', 'Escalation contact must include a contact method'),
  ('healthcare_lite', 'service', 'payload.name', 'Service must have a display name'),
  ('healthcare_lite', 'hours', 'payload.hours', 'Hours payload required'),
  ('healthcare_lite', 'escalation_contact', 'payload.contact', 'Escalation contact must include a contact method'),
  ('healthcare_lite', 'intake_requirement', 'payload.name', 'Intake requirement must have a name'),
  ('property_mgmt', 'service', 'payload.name', 'Service must have a display name'),
  ('property_mgmt', 'hours', 'payload.hours', 'Hours payload required'),
  ('property_mgmt', 'escalation_contact', 'payload.contact', 'Escalation contact must include a contact method')
) AS x(slug, entity_type, field_path, hint) ON x.slug = p.slug
ON CONFLICT (vertical_profile_id, entity_type, field_path) DO NOTHING;
