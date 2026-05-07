
-- Source-of-truth on issue review actions
ALTER TABLE public.legal_connect_issue_reviews
  ADD COLUMN IF NOT EXISTS updated_from text NOT NULL DEFAULT 'app',
  ADD COLUMN IF NOT EXISTS external_actor text;

ALTER TABLE public.legal_connect_issue_reviews
  DROP CONSTRAINT IF EXISTS lc_issue_review_updated_from_chk;
ALTER TABLE public.legal_connect_issue_reviews
  ADD CONSTRAINT lc_issue_review_updated_from_chk
    CHECK (updated_from IN ('app','slack','webhook','system'));

-- Per-tenant digest scope
ALTER TABLE public.legal_connect_digest_subscriptions
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.legal_connect_digest_schedules
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.legal_connect_digest_runs
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;

-- Replace unique constraints to include tenant scope (NULLs treated distinct via expression index)
ALTER TABLE public.legal_connect_digest_subscriptions
  DROP CONSTRAINT IF EXISTS legal_connect_digest_subscrip_organization_id_recipient_ema_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_lc_digest_sub_full
  ON public.legal_connect_digest_subscriptions
    (organization_id, recipient_email, cadence, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid));

ALTER TABLE public.legal_connect_digest_schedules
  DROP CONSTRAINT IF EXISTS legal_connect_digest_schedule_organization_id_cohort_cadenc_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_lc_digest_sched_full
  ON public.legal_connect_digest_schedules
    (organization_id, cohort, cadence, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Sink scoping & cohort routing
ALTER TABLE public.legal_connect_escalation_sinks
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS cohort_filter text;

ALTER TABLE public.legal_connect_escalation_sinks
  DROP CONSTRAINT IF EXISTS lc_esc_sink_cohort_chk;
ALTER TABLE public.legal_connect_escalation_sinks
  ADD CONSTRAINT lc_esc_sink_cohort_chk
    CHECK (cohort_filter IS NULL OR cohort_filter IN ('all','design_partners','ops','tenant'));

-- Escalation event ack tracking
ALTER TABLE public.legal_connect_escalation_events
  ADD COLUMN IF NOT EXISTS ack_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS acked_at timestamptz,
  ADD COLUMN IF NOT EXISTS acked_by text,
  ADD COLUMN IF NOT EXISTS linked_issue_key text,
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;

ALTER TABLE public.legal_connect_escalation_events
  DROP CONSTRAINT IF EXISTS lc_esc_event_ack_chk;
ALTER TABLE public.legal_connect_escalation_events
  ADD CONSTRAINT lc_esc_event_ack_chk
    CHECK (ack_status IN ('pending','received','acknowledged','resolved','dismissed'));

-- Ack tokens (one-time, signed, short-lived)
CREATE TABLE IF NOT EXISTS public.legal_connect_ack_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  sink_id uuid REFERENCES public.legal_connect_escalation_sinks(id) ON DELETE SET NULL,
  event_id uuid REFERENCES public.legal_connect_escalation_events(id) ON DELETE SET NULL,
  issue_key text NOT NULL,
  action text NOT NULL CHECK (action IN ('acknowledged','monitoring','resolved')),
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  used_by text,
  source text NOT NULL DEFAULT 'slack' CHECK (source IN ('slack','webhook')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lc_ack_tokens_org ON public.legal_connect_ack_tokens(organization_id);
CREATE INDEX IF NOT EXISTS idx_lc_ack_tokens_token ON public.legal_connect_ack_tokens(token);

ALTER TABLE public.legal_connect_ack_tokens ENABLE ROW LEVEL SECURITY;

-- Tokens: only ops/admins can view; writes happen via service role in edge fn
CREATE POLICY "Ops view ack tokens" ON public.legal_connect_ack_tokens
  FOR SELECT TO authenticated
  USING (is_master_admin(auth.uid()) OR is_ops_member(auth.uid())
         OR is_org_owner_or_admin(auth.uid(), organization_id));
