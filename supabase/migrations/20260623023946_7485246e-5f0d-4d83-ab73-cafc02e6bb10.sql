
-- Phase 6: additive call lifecycle + join columns

-- call_sessions: workspace, campaign, phase, caller_name (all optional)
ALTER TABLE public.call_sessions
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS phase text,
  ADD COLUMN IF NOT EXISTS caller_name text;

CREATE INDEX IF NOT EXISTS idx_call_sessions_workspace_started
  ON public.call_sessions (workspace_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_call_sessions_workspace_active
  ON public.call_sessions (workspace_id, status, started_at DESC)
  WHERE ended_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_call_sessions_campaign_started
  ON public.call_sessions (campaign_id, started_at DESC);

-- qa_reviews: stable join to canonical call session
ALTER TABLE public.qa_reviews
  ADD COLUMN IF NOT EXISTS call_session_id uuid REFERENCES public.call_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_qa_reviews_call_session
  ON public.qa_reviews (call_session_id);

-- deployment_runs: stable joins to call session + campaign
ALTER TABLE public.deployment_runs
  ADD COLUMN IF NOT EXISTS call_session_id uuid REFERENCES public.call_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_deployment_runs_call_session
  ON public.deployment_runs (call_session_id);

CREATE INDEX IF NOT EXISTS idx_deployment_runs_campaign
  ON public.deployment_runs (campaign_id, started_at DESC);

-- Realtime for cockpit + supervisor live updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'call_sessions'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.call_sessions';
  END IF;
END $$;

ALTER TABLE public.call_sessions REPLICA IDENTITY FULL;
