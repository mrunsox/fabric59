
-- Phase 7B — additive, append-only assist usage event log
CREATE TABLE public.call_assist_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_session_id uuid NOT NULL REFERENCES public.call_sessions(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL CHECK (event_type IN ('suggestion_used')),
  suggestion_id text,
  source_type text,
  source_precedence integer,
  action text CHECK (action IN ('accepted','copied','ignored')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX call_assist_events_session_idx
  ON public.call_assist_events (call_session_id, created_at DESC);
CREATE INDEX call_assist_events_workspace_idx
  ON public.call_assist_events (workspace_id, created_at DESC);

GRANT SELECT, INSERT ON public.call_assist_events TO authenticated;
GRANT ALL ON public.call_assist_events TO service_role;

ALTER TABLE public.call_assist_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members read assist events"
  ON public.call_assist_events FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "workspace members insert assist events"
  ON public.call_assist_events FOR INSERT
  TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

-- Append-only enforcement: block UPDATE and DELETE for all non-service roles
CREATE OR REPLACE FUNCTION public.call_assist_events_block_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  RAISE EXCEPTION 'call_assist_events is append-only; % is not allowed', TG_OP;
END;
$$;

CREATE TRIGGER call_assist_events_no_update
  BEFORE UPDATE ON public.call_assist_events
  FOR EACH ROW EXECUTE FUNCTION public.call_assist_events_block_mutation();

CREATE TRIGGER call_assist_events_no_delete
  BEFORE DELETE ON public.call_assist_events
  FOR EACH ROW EXECUTE FUNCTION public.call_assist_events_block_mutation();
