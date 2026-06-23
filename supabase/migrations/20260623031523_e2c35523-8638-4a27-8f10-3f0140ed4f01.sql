
-- Phase 7A: derived, append-only call session snapshot read model.
-- This is NOT a source of truth — it is a snapshot of canonical call data
-- assembled by the server at lifecycle completion, for replay/audit (Phase 7B+).

CREATE TABLE public.call_session_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_session_id uuid NOT NULL REFERENCES public.call_sessions(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  campaign_id uuid NULL REFERENCES public.campaigns(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1,
  source text NOT NULL DEFAULT 'system',
  snapshot jsonb NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- Stable indexes only (no time-window partial indexes in this phase).
CREATE INDEX idx_call_session_snapshots_session
  ON public.call_session_snapshots (call_session_id, created_at DESC);
CREATE INDEX idx_call_session_snapshots_workspace
  ON public.call_session_snapshots (workspace_id, created_at DESC);

-- Grants: server-side writes only. Workspace members read via RLS.
GRANT SELECT ON public.call_session_snapshots TO authenticated;
GRANT ALL ON public.call_session_snapshots TO service_role;

ALTER TABLE public.call_session_snapshots ENABLE ROW LEVEL SECURITY;

-- Read: any workspace member.
CREATE POLICY "Workspace members can read snapshots"
  ON public.call_session_snapshots
  FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- Manage: master admin only (service_role bypasses RLS for edge functions).
CREATE POLICY "Master admins can manage snapshots"
  ON public.call_session_snapshots
  FOR ALL
  TO authenticated
  USING (public.is_master_admin(auth.uid()))
  WITH CHECK (public.is_master_admin(auth.uid()));

-- Append-only enforcement: block UPDATE entirely. INSERT/DELETE allowed
-- (DELETE via cascade or master admin retention).
CREATE OR REPLACE FUNCTION public.call_session_snapshots_block_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'call_session_snapshots is append-only; updates are not allowed';
END;
$$;

CREATE TRIGGER call_session_snapshots_no_update
  BEFORE UPDATE ON public.call_session_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.call_session_snapshots_block_update();
