DO $$ BEGIN
  CREATE TYPE public.legal_connect_rollout_status AS ENUM (
    'not_started','onboarding_in_progress','testing','ready_for_live',
    'live_pilot','live_steady','paused'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS is_design_partner boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS design_partner_notes jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS legal_connect_rollout_status public.legal_connect_rollout_status NOT NULL DEFAULT 'not_started';

CREATE INDEX IF NOT EXISTS idx_tenants_design_partner
  ON public.tenants (is_design_partner) WHERE is_design_partner = true;