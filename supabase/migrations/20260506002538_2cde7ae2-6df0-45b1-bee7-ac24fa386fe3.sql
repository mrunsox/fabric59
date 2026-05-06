CREATE UNIQUE INDEX IF NOT EXISTS legal_connect_connections_client_provider_uq
  ON public.legal_connect_connections(client_id, provider);