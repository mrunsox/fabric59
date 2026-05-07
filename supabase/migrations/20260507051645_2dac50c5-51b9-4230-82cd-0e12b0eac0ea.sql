DO $$ BEGIN
  CREATE TYPE public.legal_connect_readiness AS ENUM (
    'draft', 'setup_in_progress', 'test_passed', 'ready_for_live', 'live', 'paused'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.legal_connect_safe_mode AS ENUM (
    'none', 'email_only', 'no_writeback'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS legal_connect_readiness_state public.legal_connect_readiness NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS legal_connect_go_live_checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS legal_connect_safe_mode public.legal_connect_safe_mode NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS legal_connect_readiness_updated_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_tenants_lc_readiness_state
  ON public.tenants (legal_connect_readiness_state);
