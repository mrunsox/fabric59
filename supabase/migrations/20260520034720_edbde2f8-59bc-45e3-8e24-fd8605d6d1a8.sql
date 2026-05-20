ALTER TABLE public.form_submissions
  ADD COLUMN IF NOT EXISTS outcome_key text,
  ADD COLUMN IF NOT EXISTS disposition_key text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;