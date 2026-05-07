-- Phase 5 Slice 4: feedback capture + release notes

CREATE TABLE IF NOT EXISTS public.legal_connect_release_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  summary text,
  highlights jsonb NOT NULL DEFAULT '[]'::jsonb,
  details jsonb NOT NULL DEFAULT '[]'::jsonb,
  audience text NOT NULL DEFAULT 'all'
    CHECK (audience IN ('all','design_partners','internal')),
  dev_guide_link text,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lc_release_notes_published
  ON public.legal_connect_release_notes (published_at DESC);

ALTER TABLE public.legal_connect_release_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view release notes"
  ON public.legal_connect_release_notes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Platform admins manage release notes"
  ON public.legal_connect_release_notes FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Master admin manage release notes"
  ON public.legal_connect_release_notes FOR ALL
  USING (is_master_admin(auth.uid()))
  WITH CHECK (is_master_admin(auth.uid()));

CREATE TRIGGER update_lc_release_notes_updated_at
  BEFORE UPDATE ON public.legal_connect_release_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.legal_connect_feedback_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'in_product'
    CHECK (source IN ('design_partner_interview','in_product','support_call','internal_note','other')),
  topic text NOT NULL DEFAULT 'general'
    CHECK (topic IN ('onboarding','tests','dashboard','accuracy','speed','trust','billing_future','general','other')),
  entry_type text NOT NULL DEFAULT 'idea'
    CHECK (entry_type IN ('bug','feature_request','confusion','praise','idea')),
  severity text CHECK (severity IN ('low','medium','high','critical')),
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','triaged','in_progress','shipped','wont_fix')),
  logged_by uuid,
  logged_by_name text,
  shipped_release_note_id uuid REFERENCES public.legal_connect_release_notes(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lc_feedback_org_created
  ON public.legal_connect_feedback_entries (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lc_feedback_client_created
  ON public.legal_connect_feedback_entries (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lc_feedback_status
  ON public.legal_connect_feedback_entries (status, created_at DESC);

ALTER TABLE public.legal_connect_feedback_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view feedback"
  ON public.legal_connect_feedback_entries FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Org admins manage feedback"
  ON public.legal_connect_feedback_entries FOR ALL
  USING (is_org_owner_or_admin(auth.uid(), organization_id))
  WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));

CREATE POLICY "Platform admins manage feedback"
  ON public.legal_connect_feedback_entries FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Master admin manage feedback"
  ON public.legal_connect_feedback_entries FOR ALL
  USING (is_master_admin(auth.uid()))
  WITH CHECK (is_master_admin(auth.uid()));

CREATE TRIGGER update_lc_feedback_updated_at
  BEFORE UPDATE ON public.legal_connect_feedback_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO public.legal_connect_release_notes (slug, title, summary, highlights, details, audience, dev_guide_link)
VALUES
  ('phase-5-slice-3-rate-limits-health',
   'Rate limits & tenant health',
   'Production guardrails for design-partner pilots.',
   '["Per-tenant minute & hourly job caps","Live tenant health card with success rates","Open alerts for failure rate, auth, rate limits"]'::jsonb,
   '["max_jobs_per_minute / max_jobs_per_hour on tenants","legal-connect-health edge function","DeliveryDashboard error-class filter"]'::jsonb,
   'design_partners',
   '/superadmin/dev-guide#phase-5-slice-3'),
  ('phase-5-slice-2-pilot-approval',
   'Pilot approval & templates',
   'Formal go/no-go workflow for live pilots.',
   '["11-item pilot checklist","Reusable pilot templates","Block reasons surfaced to ops"]'::jsonb,
   '["legal_connect_pilot_* tenant fields","PilotApprovalPanel on Readiness tab","Pilot column on Design Partners ops view"]'::jsonb,
   'design_partners',
   '/superadmin/dev-guide#phase-5-slice-2'),
  ('phase-5-slice-4-feedback-release-notes',
   'Feedback capture & What''s new',
   'Close the loop with design partners.',
   '["Structured feedback entries per tenant","In-product What''s new drawer","Internal GA readiness checklist"]'::jsonb,
   '["legal_connect_feedback_entries table","legal_connect_release_notes table","Feedback panel on Design Partners ops view"]'::jsonb,
   'all',
   '/superadmin/dev-guide#phase-5-slice-4')
ON CONFLICT (slug) DO NOTHING;