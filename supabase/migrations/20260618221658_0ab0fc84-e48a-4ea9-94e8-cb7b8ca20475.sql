-- ============================================================
-- Business Brain Phase 7 — Demand-Driven Gap Detection
-- Additive. No changes to existing tables, RLS, or functions.
-- ============================================================

-- ---------- bb_gap_events ----------
CREATE TABLE IF NOT EXISTS public.bb_gap_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  client_id uuid NULL,
  vertical_profile_id uuid NULL,
  channel text NOT NULL CHECK (channel IN ('search', 'asc', 'assist')),
  raw_query text NOT NULL,
  normalized_query text NOT NULL,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  topic_assigned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bb_gap_events_ws_created_idx
  ON public.bb_gap_events (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS bb_gap_events_unassigned_idx
  ON public.bb_gap_events (workspace_id, created_at DESC)
  WHERE topic_assigned = false;

GRANT SELECT ON public.bb_gap_events TO authenticated;
GRANT ALL ON public.bb_gap_events TO service_role;

ALTER TABLE public.bb_gap_events ENABLE ROW LEVEL SECURITY;

-- Workspace members can INSERT their own gap events.
CREATE POLICY "members_insert_gap_events"
  ON public.bb_gap_events FOR INSERT
  TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

-- Only workspace admins (owner/admin/supervisor) can SELECT raw_query.
-- RLS on this table is therefore restricted to admins; the aggregated topic
-- table is the path workspace members use.
CREATE POLICY "admins_read_gap_events"
  ON public.bb_gap_events FOR SELECT
  TO authenticated
  USING (public.has_workspace_role_min(auth.uid(), workspace_id, 'supervisor'::workspace_role));

-- ---------- bb_gap_topics ----------
CREATE TABLE IF NOT EXISTS public.bb_gap_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  vertical_profile_id uuid NULL,
  canonical_question text NOT NULL,
  canonical_question_hash text NOT NULL,
  entity_type_hint text NULL,
  vertical_requirement_hint text NULL,
  open_event_count integer NOT NULL DEFAULT 0,
  channels text[] NOT NULL DEFAULT '{}',
  -- 'open' awaiting review, 'linked' to existing fact, 'dismissed' by reviewer,
  -- 'suppressed' sticky reviewer suppress, 'pruned' machine overflow.
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'linked', 'dismissed', 'suppressed', 'pruned')),
  status_reason text NULL,
  linked_fact_id uuid NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  acted_by uuid NULL
);

-- One open topic per canonical question per workspace.
CREATE UNIQUE INDEX IF NOT EXISTS bb_gap_topics_open_uq
  ON public.bb_gap_topics (workspace_id, canonical_question_hash)
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS bb_gap_topics_ws_status_idx
  ON public.bb_gap_topics (workspace_id, status, last_seen_at DESC);

GRANT SELECT, UPDATE ON public.bb_gap_topics TO authenticated;
GRANT ALL ON public.bb_gap_topics TO service_role;

ALTER TABLE public.bb_gap_topics ENABLE ROW LEVEL SECURITY;

-- Workspace members can view aggregated topics.
CREATE POLICY "members_read_gap_topics"
  ON public.bb_gap_topics FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- Workspace admins (supervisor+) may act on topics (link/dismiss/suppress).
CREATE POLICY "admins_update_gap_topics"
  ON public.bb_gap_topics FOR UPDATE
  TO authenticated
  USING (public.has_workspace_role_min(auth.uid(), workspace_id, 'supervisor'::workspace_role))
  WITH CHECK (public.has_workspace_role_min(auth.uid(), workspace_id, 'supervisor'::workspace_role));

CREATE TRIGGER trg_bb_gap_topics_updated_at
  BEFORE UPDATE ON public.bb_gap_topics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- bb_gap_event_topics ----------
CREATE TABLE IF NOT EXISTS public.bb_gap_event_topics (
  gap_event_id uuid NOT NULL REFERENCES public.bb_gap_events(id) ON DELETE CASCADE,
  gap_topic_id uuid NOT NULL REFERENCES public.bb_gap_topics(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL,
  similarity_score numeric(6,4) NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (gap_event_id, gap_topic_id)
);

CREATE INDEX IF NOT EXISTS bb_gap_event_topics_topic_idx
  ON public.bb_gap_event_topics (gap_topic_id);

GRANT SELECT ON public.bb_gap_event_topics TO authenticated;
GRANT ALL ON public.bb_gap_event_topics TO service_role;

ALTER TABLE public.bb_gap_event_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_read_event_topic_links"
  ON public.bb_gap_event_topics FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));