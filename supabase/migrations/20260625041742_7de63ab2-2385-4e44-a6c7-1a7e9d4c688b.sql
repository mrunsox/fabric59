ALTER TABLE public.integration_connections
  ADD COLUMN IF NOT EXISTS campaign_id uuid NULL REFERENCES public.campaigns(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS integration_connections_workspace_campaign_idx
  ON public.integration_connections (workspace_id, campaign_id);