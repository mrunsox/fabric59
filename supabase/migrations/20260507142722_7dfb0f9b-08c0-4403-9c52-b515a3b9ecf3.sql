-- Phase 8 — Operational rhythm: digest subscriptions, run history, issue review state.

CREATE TABLE IF NOT EXISTS public.legal_connect_digest_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  recipient_name text,
  cohort text NOT NULL DEFAULT 'all',
  cadence text NOT NULL DEFAULT 'weekly',
  enabled boolean NOT NULL DEFAULT true,
  last_sent_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lc_digest_sub_cohort_chk CHECK (cohort IN ('all', 'design_partners', 'ops')),
  CONSTRAINT lc_digest_sub_cadence_chk CHECK (cadence IN ('weekly', 'daily')),
  UNIQUE (organization_id, recipient_email, cadence)
);

CREATE INDEX IF NOT EXISTS idx_lc_digest_sub_org ON public.legal_connect_digest_subscriptions(organization_id);

ALTER TABLE public.legal_connect_digest_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view digest subscriptions"
ON public.legal_connect_digest_subscriptions
FOR SELECT TO authenticated
USING (public.is_org_member(auth.uid(), organization_id) OR public.is_master_admin(auth.uid()) OR public.is_ops_member(auth.uid()));

CREATE POLICY "Org admins manage digest subscriptions"
ON public.legal_connect_digest_subscriptions
FOR ALL TO authenticated
USING (public.is_org_owner_or_admin(auth.uid(), organization_id) OR public.is_master_admin(auth.uid()) OR public.is_ops_member(auth.uid()))
WITH CHECK (public.is_org_owner_or_admin(auth.uid(), organization_id) OR public.is_master_admin(auth.uid()) OR public.is_ops_member(auth.uid()));

CREATE TRIGGER lc_digest_sub_set_updated_at
BEFORE UPDATE ON public.legal_connect_digest_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE IF NOT EXISTS public.legal_connect_digest_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cohort text NOT NULL DEFAULT 'all',
  cadence text NOT NULL DEFAULT 'weekly',
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  recipients_count integer NOT NULL DEFAULT 0,
  delivery_status text NOT NULL DEFAULT 'recorded',
  triggered_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lc_digest_runs_org_created ON public.legal_connect_digest_runs(organization_id, created_at DESC);

ALTER TABLE public.legal_connect_digest_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view digest runs"
ON public.legal_connect_digest_runs
FOR SELECT TO authenticated
USING (public.is_org_member(auth.uid(), organization_id) OR public.is_master_admin(auth.uid()) OR public.is_ops_member(auth.uid()));

CREATE POLICY "Org admins manage digest runs"
ON public.legal_connect_digest_runs
FOR ALL TO authenticated
USING (public.is_org_owner_or_admin(auth.uid(), organization_id) OR public.is_master_admin(auth.uid()) OR public.is_ops_member(auth.uid()))
WITH CHECK (public.is_org_owner_or_admin(auth.uid(), organization_id) OR public.is_master_admin(auth.uid()) OR public.is_ops_member(auth.uid()));


CREATE TABLE IF NOT EXISTS public.legal_connect_issue_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  issue_key text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  note text,
  updated_by uuid,
  updated_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lc_issue_review_status_chk CHECK (status IN ('new', 'acknowledged', 'monitoring', 'resolved')),
  UNIQUE (organization_id, issue_key)
);

CREATE INDEX IF NOT EXISTS idx_lc_issue_reviews_org ON public.legal_connect_issue_reviews(organization_id);

ALTER TABLE public.legal_connect_issue_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view issue reviews"
ON public.legal_connect_issue_reviews
FOR SELECT TO authenticated
USING (public.is_org_member(auth.uid(), organization_id) OR public.is_master_admin(auth.uid()) OR public.is_ops_member(auth.uid()));

CREATE POLICY "Org admins manage issue reviews"
ON public.legal_connect_issue_reviews
FOR ALL TO authenticated
USING (public.is_org_owner_or_admin(auth.uid(), organization_id) OR public.is_master_admin(auth.uid()) OR public.is_ops_member(auth.uid()))
WITH CHECK (public.is_org_owner_or_admin(auth.uid(), organization_id) OR public.is_master_admin(auth.uid()) OR public.is_ops_member(auth.uid()));

CREATE TRIGGER lc_issue_reviews_set_updated_at
BEFORE UPDATE ON public.legal_connect_issue_reviews
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();