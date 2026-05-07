
-- Allow 'skipped' status on sync jobs (used when an outcome rule resolves to no_writeback or email-only without queueing CRM work).
ALTER TABLE public.legal_connect_sync_jobs DROP CONSTRAINT IF EXISTS legal_connect_sync_jobs_status_check;
ALTER TABLE public.legal_connect_sync_jobs
  ADD CONSTRAINT legal_connect_sync_jobs_status_check
  CHECK (status = ANY (ARRAY['queued','processing','succeeded','failed','retrying','dead_letter','review','skipped']));

-- Allow post_call_email pseudo-provider for email-only outcome jobs.
-- (legal_connect_connections already restricts provider; email-only jobs use connection_id = NULL.)
-- No CHECK on legal_connect_sync_jobs.provider exists, so nothing to widen there.

CREATE INDEX IF NOT EXISTS idx_lc_sync_jobs_correlation
  ON public.legal_connect_sync_jobs (correlation_id);

CREATE INDEX IF NOT EXISTS idx_lc_sync_jobs_provider_status
  ON public.legal_connect_sync_jobs (provider, status);

-- New review type used by outcome engine when caller classification is missing.
-- review_type column is free-text; no constraint to widen.
