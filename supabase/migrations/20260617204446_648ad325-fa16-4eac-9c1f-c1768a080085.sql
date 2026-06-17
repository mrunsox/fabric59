
-- Enums
CREATE TYPE public.bb_source_kind AS ENUM ('upload_doc','paste_text','paste_faq','upload_csv','url_crawl');
CREATE TYPE public.bb_source_status AS ENUM ('pending','processing','processed','failed','superseded');
CREATE TYPE public.bb_entity_type AS ENUM (
  'department','service','staff','phone','hours',
  'destination_contact','faq','escalation_contact','intake_requirement','policy'
);
CREATE TYPE public.bb_review_status AS ENUM ('suggested','approved','rejected','superseded');
CREATE TYPE public.bb_verification_state AS ENUM ('approved','needs_review','stale');
CREATE TYPE public.bb_relation_kind AS ENUM (
  'staff_in_department','department_handles_service','route_to_destination',
  'faq_about_service','service_in_area','escalation_for'
);
CREATE TYPE public.bb_review_action AS ENUM ('approve','reject','edit','merge','supersede','reopen');

-- bb_sources
CREATE TABLE public.bb_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  kind public.bb_source_kind NOT NULL,
  title text NOT NULL,
  uri text,
  content_hash text,
  version integer NOT NULL DEFAULT 1,
  prior_source_id uuid REFERENCES public.bb_sources(id) ON DELETE SET NULL,
  status public.bb_source_status NOT NULL DEFAULT 'pending',
  status_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
CREATE INDEX bb_sources_workspace_idx ON public.bb_sources(workspace_id, created_at DESC);
CREATE INDEX bb_sources_hash_idx ON public.bb_sources(workspace_id, content_hash);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bb_sources TO authenticated;
GRANT ALL ON public.bb_sources TO service_role;
ALTER TABLE public.bb_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bb_sources_select" ON public.bb_sources FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "bb_sources_insert" ON public.bb_sources FOR INSERT TO authenticated
  WITH CHECK (public.has_workspace_role_min(auth.uid(), workspace_id, 'manager'));
CREATE POLICY "bb_sources_update" ON public.bb_sources FOR UPDATE TO authenticated
  USING (public.has_workspace_role_min(auth.uid(), workspace_id, 'manager'))
  WITH CHECK (public.has_workspace_role_min(auth.uid(), workspace_id, 'manager'));
CREATE POLICY "bb_sources_delete" ON public.bb_sources FOR DELETE TO authenticated
  USING (public.has_workspace_role_min(auth.uid(), workspace_id, 'admin'));

CREATE TRIGGER bb_sources_updated_at BEFORE UPDATE ON public.bb_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- bb_source_chunks
CREATE TABLE public.bb_source_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.bb_sources(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ordinal integer NOT NULL,
  text text NOT NULL,
  offset_start integer,
  offset_end integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bb_source_chunks_source_idx ON public.bb_source_chunks(source_id, ordinal);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bb_source_chunks TO authenticated;
GRANT ALL ON public.bb_source_chunks TO service_role;
ALTER TABLE public.bb_source_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bb_chunks_select" ON public.bb_source_chunks FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "bb_chunks_write" ON public.bb_source_chunks FOR ALL TO authenticated
  USING (public.has_workspace_role_min(auth.uid(), workspace_id, 'manager'))
  WITH CHECK (public.has_workspace_role_min(auth.uid(), workspace_id, 'manager'));

-- bb_facts
CREATE TABLE public.bb_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  entity_type public.bb_entity_type NOT NULL,
  canonical_key text NOT NULL,
  display_name text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence_at_review numeric,
  verification_state public.bb_verification_state NOT NULL DEFAULT 'approved',
  source_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  superseded_by uuid REFERENCES public.bb_facts(id) ON DELETE SET NULL,
  notes text,
  last_reviewed_at timestamptz NOT NULL DEFAULT now(),
  last_reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bb_facts_unique_key UNIQUE (workspace_id, entity_type, canonical_key)
);
CREATE INDEX bb_facts_workspace_idx ON public.bb_facts(workspace_id, entity_type);
CREATE INDEX bb_facts_client_idx ON public.bb_facts(client_id) WHERE client_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bb_facts TO authenticated;
GRANT ALL ON public.bb_facts TO service_role;
ALTER TABLE public.bb_facts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bb_facts_select" ON public.bb_facts FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "bb_facts_insert" ON public.bb_facts FOR INSERT TO authenticated
  WITH CHECK (public.has_workspace_role_min(auth.uid(), workspace_id, 'manager'));
CREATE POLICY "bb_facts_update" ON public.bb_facts FOR UPDATE TO authenticated
  USING (public.has_workspace_role_min(auth.uid(), workspace_id, 'manager'))
  WITH CHECK (public.has_workspace_role_min(auth.uid(), workspace_id, 'manager'));
CREATE POLICY "bb_facts_delete" ON public.bb_facts FOR DELETE TO authenticated
  USING (public.has_workspace_role_min(auth.uid(), workspace_id, 'admin'));

CREATE TRIGGER bb_facts_updated_at BEFORE UPDATE ON public.bb_facts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- bb_extractions
CREATE TABLE public.bb_extractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES public.bb_sources(id) ON DELETE CASCADE,
  chunk_id uuid REFERENCES public.bb_source_chunks(id) ON DELETE SET NULL,
  entity_type public.bb_entity_type NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  snippet text,
  confidence numeric NOT NULL DEFAULT 0,
  review_status public.bb_review_status NOT NULL DEFAULT 'suggested',
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_notes text,
  approved_fact_id uuid REFERENCES public.bb_facts(id) ON DELETE SET NULL,
  extraction_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bb_extractions_workspace_idx ON public.bb_extractions(workspace_id, review_status, entity_type);
CREATE INDEX bb_extractions_source_idx ON public.bb_extractions(source_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bb_extractions TO authenticated;
GRANT ALL ON public.bb_extractions TO service_role;
ALTER TABLE public.bb_extractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bb_extractions_select" ON public.bb_extractions FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "bb_extractions_insert" ON public.bb_extractions FOR INSERT TO authenticated
  WITH CHECK (public.has_workspace_role_min(auth.uid(), workspace_id, 'manager'));
CREATE POLICY "bb_extractions_update" ON public.bb_extractions FOR UPDATE TO authenticated
  USING (public.has_workspace_role_min(auth.uid(), workspace_id, 'manager'))
  WITH CHECK (public.has_workspace_role_min(auth.uid(), workspace_id, 'manager'));
CREATE POLICY "bb_extractions_delete" ON public.bb_extractions FOR DELETE TO authenticated
  USING (public.has_workspace_role_min(auth.uid(), workspace_id, 'admin'));

CREATE TRIGGER bb_extractions_updated_at BEFORE UPDATE ON public.bb_extractions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- bb_fact_relations
CREATE TABLE public.bb_fact_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  from_fact_id uuid NOT NULL REFERENCES public.bb_facts(id) ON DELETE CASCADE,
  to_fact_id uuid NOT NULL REFERENCES public.bb_facts(id) ON DELETE CASCADE,
  relation public.bb_relation_kind NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bb_fact_relations_unique UNIQUE (from_fact_id, to_fact_id, relation)
);
CREATE INDEX bb_relations_workspace_idx ON public.bb_fact_relations(workspace_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bb_fact_relations TO authenticated;
GRANT ALL ON public.bb_fact_relations TO service_role;
ALTER TABLE public.bb_fact_relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bb_relations_select" ON public.bb_fact_relations FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "bb_relations_write" ON public.bb_fact_relations FOR ALL TO authenticated
  USING (public.has_workspace_role_min(auth.uid(), workspace_id, 'manager'))
  WITH CHECK (public.has_workspace_role_min(auth.uid(), workspace_id, 'manager'));

-- bb_review_events
CREATE TABLE public.bb_review_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  extraction_id uuid REFERENCES public.bb_extractions(id) ON DELETE SET NULL,
  fact_id uuid REFERENCES public.bb_facts(id) ON DELETE SET NULL,
  action public.bb_review_action NOT NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  diff jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bb_review_events_ws_idx ON public.bb_review_events(workspace_id, created_at DESC);
CREATE INDEX bb_review_events_fact_idx ON public.bb_review_events(fact_id);

GRANT SELECT, INSERT ON public.bb_review_events TO authenticated;
GRANT ALL ON public.bb_review_events TO service_role;
ALTER TABLE public.bb_review_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bb_review_events_select" ON public.bb_review_events FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "bb_review_events_insert" ON public.bb_review_events FOR INSERT TO authenticated
  WITH CHECK (public.has_workspace_role_min(auth.uid(), workspace_id, 'manager'));
