ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS legal_connect_pilot_checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS legal_connect_pilot_status text NOT NULL DEFAULT 'not_ready',
  ADD COLUMN IF NOT EXISTS legal_connect_pilot_template text,
  ADD COLUMN IF NOT EXISTS legal_connect_pilot_block_reason text,
  ADD COLUMN IF NOT EXISTS legal_connect_pilot_approval jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS legal_connect_pilot_updated_at timestamptz;

ALTER TABLE public.tenants
  DROP CONSTRAINT IF EXISTS tenants_legal_connect_pilot_status_check;
ALTER TABLE public.tenants
  ADD CONSTRAINT tenants_legal_connect_pilot_status_check
  CHECK (legal_connect_pilot_status IN ('not_ready','blocked','ready_for_pilot','approved'));

CREATE INDEX IF NOT EXISTS idx_tenants_legal_connect_pilot_status
  ON public.tenants (legal_connect_pilot_status);