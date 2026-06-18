
-- ──────────────────────────────────────────────────────────────────
-- bb_facts: governance columns
-- ──────────────────────────────────────────────────────────────────
ALTER TABLE public.bb_facts
  ADD COLUMN IF NOT EXISTS expected_review_interval_days integer,
  ADD COLUMN IF NOT EXISTS stale_state text NOT NULL DEFAULT 'fresh',
  ADD COLUMN IF NOT EXISTS stale_reasons text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS last_used_at timestamptz;

CREATE INDEX IF NOT EXISTS bb_facts_stale_state_idx
  ON public.bb_facts(workspace_id, stale_state)
  WHERE verification_state = 'approved';

CREATE INDEX IF NOT EXISTS bb_facts_last_used_idx
  ON public.bb_facts(workspace_id, last_used_at DESC NULLS LAST);

-- ──────────────────────────────────────────────────────────────────
-- bb_fact_entity_defaults
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bb_fact_entity_defaults (
  entity_type text PRIMARY KEY,
  default_review_interval_days integer NOT NULL,
  high_risk boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.bb_fact_entity_defaults TO authenticated;
GRANT ALL ON public.bb_fact_entity_defaults TO service_role;

ALTER TABLE public.bb_fact_entity_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "entity_defaults_select_auth"
  ON public.bb_fact_entity_defaults FOR SELECT
  TO authenticated USING (true);

-- Seed defaults (idempotent)
INSERT INTO public.bb_fact_entity_defaults(entity_type, default_review_interval_days, high_risk) VALUES
  ('escalation_contact', 30, true),
  ('hours',              30, true),
  ('phone',              60, true),
  ('destination_contact',60, true),
  ('department',         90, false),
  ('staff',              90, false),
  ('service',            90, false),
  ('intake_requirement', 90, false),
  ('faq',                90, false),
  ('policy',             90, false)
ON CONFLICT (entity_type) DO NOTHING;

-- ──────────────────────────────────────────────────────────────────
-- bb_fact_conflicts
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bb_fact_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  primary_fact_id uuid NOT NULL REFERENCES public.bb_facts(id) ON DELETE CASCADE,
  conflicting_fact_id uuid NOT NULL REFERENCES public.bb_facts(id) ON DELETE CASCADE,
  conflict_kind text NOT NULL CHECK (conflict_kind IN (
    'phone_mismatch','hours_overlap','destination_mismatch',
    'faq_duplicate','policy_duplicate','other'
  )),
  entity_type text NOT NULL,
  similarity numeric,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','dismissed')),
  resolution text,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (primary_fact_id <> conflicting_fact_id)
);

-- Unique open conflict per ordered pair + kind (avoid dup rows)
CREATE UNIQUE INDEX IF NOT EXISTS bb_fact_conflicts_open_unique
  ON public.bb_fact_conflicts(
    workspace_id,
    LEAST(primary_fact_id, conflicting_fact_id),
    GREATEST(primary_fact_id, conflicting_fact_id),
    conflict_kind
  ) WHERE status = 'open';

CREATE INDEX IF NOT EXISTS bb_fact_conflicts_workspace_idx
  ON public.bb_fact_conflicts(workspace_id, status, created_at DESC);

GRANT SELECT, UPDATE ON public.bb_fact_conflicts TO authenticated;
GRANT ALL ON public.bb_fact_conflicts TO service_role;

ALTER TABLE public.bb_fact_conflicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conflicts_select_workspace_members"
  ON public.bb_fact_conflicts FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "conflicts_update_workspace_editors"
  ON public.bb_fact_conflicts FOR UPDATE
  TO authenticated
  USING (public.has_workspace_role_min(auth.uid(), workspace_id, 'manager'::workspace_role))
  WITH CHECK (public.has_workspace_role_min(auth.uid(), workspace_id, 'manager'::workspace_role));

CREATE TRIGGER bb_fact_conflicts_set_updated_at
  BEFORE UPDATE ON public.bb_fact_conflicts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ──────────────────────────────────────────────────────────────────
-- bb_fact_usage
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bb_fact_usage (
  fact_id uuid PRIMARY KEY REFERENCES public.bb_facts(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  search_opens integer NOT NULL DEFAULT 0,
  search_marked_useful integer NOT NULL DEFAULT 0,
  search_marked_not_useful integer NOT NULL DEFAULT 0,
  asc_suggestion_used integer NOT NULL DEFAULT 0,
  asc_suggestion_dismissed integer NOT NULL DEFAULT 0,
  assist_opened integer NOT NULL DEFAULT 0,
  assist_copied integer NOT NULL DEFAULT 0,
  assist_inserted integer NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  usage_score numeric NOT NULL DEFAULT 0,
  rolled_up_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bb_fact_usage_workspace_score_idx
  ON public.bb_fact_usage(workspace_id, usage_score DESC NULLS LAST);

GRANT SELECT ON public.bb_fact_usage TO authenticated;
GRANT ALL ON public.bb_fact_usage TO service_role;

ALTER TABLE public.bb_fact_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usage_select_workspace_members"
  ON public.bb_fact_usage FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE TRIGGER bb_fact_usage_set_updated_at
  BEFORE UPDATE ON public.bb_fact_usage
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
