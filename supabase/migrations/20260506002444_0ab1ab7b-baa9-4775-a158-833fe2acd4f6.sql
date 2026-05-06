
CREATE TABLE public.legal_connect_oauth_states (
  state text PRIMARY KEY,
  provider text NOT NULL,
  client_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid,
  redirect_after text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes')
);

CREATE INDEX idx_lc_oauth_states_expires ON public.legal_connect_oauth_states(expires_at);

ALTER TABLE public.legal_connect_oauth_states ENABLE ROW LEVEL SECURITY;

-- Deny-all to authenticated and anon. Service role bypasses RLS, so edge
-- functions using the service role key can read/write freely.
CREATE POLICY "no client access to oauth states"
  ON public.legal_connect_oauth_states
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);
