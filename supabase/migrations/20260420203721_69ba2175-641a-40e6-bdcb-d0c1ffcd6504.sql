-- Extend five9_campaign_routes
ALTER TABLE public.five9_campaign_routes
  ADD COLUMN IF NOT EXISTS connection_id uuid REFERENCES public.legal_connect_connections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS campaign_type text,
  ADD COLUMN IF NOT EXISTS call_variable_group_id uuid REFERENCES public.five9_call_variable_groups(id) ON DELETE SET NULL;

-- Extend legal_connect_disposition_mappings
ALTER TABLE public.legal_connect_disposition_mappings
  ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.five9_campaign_routes(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_disposition_mappings_campaign
  ON public.legal_connect_disposition_mappings(campaign_id);

-- Extend five9_call_variable_groups
ALTER TABLE public.five9_call_variable_groups
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'campaign'
    CHECK (scope IN ('client', 'campaign'));

-- Validation trigger: when connection_id is set, it must belong to the same client and match provider_target
CREATE OR REPLACE FUNCTION public.validate_campaign_route_connection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conn_client uuid;
  conn_provider text;
BEGIN
  IF NEW.connection_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT client_id, provider INTO conn_client, conn_provider
  FROM public.legal_connect_connections
  WHERE id = NEW.connection_id;

  IF conn_client IS NULL THEN
    RAISE EXCEPTION 'connection_id % does not exist', NEW.connection_id;
  END IF;

  IF conn_client <> NEW.client_id THEN
    RAISE EXCEPTION 'connection_id % belongs to a different client', NEW.connection_id;
  END IF;

  IF NEW.provider_target IS NOT NULL AND conn_provider <> NEW.provider_target THEN
    RAISE EXCEPTION 'connection provider (%) does not match provider_target (%)', conn_provider, NEW.provider_target;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_campaign_route_connection_trg ON public.five9_campaign_routes;
CREATE TRIGGER validate_campaign_route_connection_trg
  BEFORE INSERT OR UPDATE ON public.five9_campaign_routes
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_campaign_route_connection();