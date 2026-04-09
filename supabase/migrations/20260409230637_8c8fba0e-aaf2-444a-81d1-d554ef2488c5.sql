
CREATE OR REPLACE VIEW public.legal_connect_connections_safe
WITH (security_invoker = on) AS
SELECT
  id, organization_id, client_id, provider, connection_name, status,
  auth_type, provider_account_id, provider_region, base_url, scopes,
  encrypted_access_token IS NOT NULL AS has_access_token,
  encrypted_refresh_token IS NOT NULL AS has_refresh_token,
  access_token_expires_at, refresh_token_expires_at,
  deauth_callback_enabled, last_connected_at, last_refreshed_at,
  last_error_at, last_error_message, is_sandbox, metadata, created_at, updated_at
FROM public.legal_connect_connections;
