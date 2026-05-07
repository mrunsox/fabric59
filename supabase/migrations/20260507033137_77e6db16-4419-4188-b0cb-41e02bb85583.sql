
-- 1. Extend source_location to include constant + worksheet
ALTER TABLE public.legal_connect_call_variable_mappings
  DROP CONSTRAINT IF EXISTS legal_connect_call_variable_mappings_source_location_check;

ALTER TABLE public.legal_connect_call_variable_mappings
  ADD CONSTRAINT legal_connect_call_variable_mappings_source_location_check
  CHECK (source_location = ANY (ARRAY[
    'five9_call_variable',
    'five9_disposition_field',
    'five9_connector_param',
    'derived',
    'constant',
    'worksheet'
  ]));

-- 2. Worksheet field definitions
CREATE TABLE IF NOT EXISTS public.worksheet_field_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.legal_connect_campaigns(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  label text NOT NULL,
  field_type text NOT NULL DEFAULT 'text'
    CHECK (field_type IN ('text','textarea','number','date','phone','email','select','boolean')),
  required boolean NOT NULL DEFAULT false,
  category text,
  description text,
  options jsonb DEFAULT '[]'::jsonb,
  position integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, campaign_id, field_key)
);
CREATE INDEX IF NOT EXISTS idx_worksheet_fields_client ON public.worksheet_field_definitions(client_id);
ALTER TABLE public.worksheet_field_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view worksheet fields"
  ON public.worksheet_field_definitions FOR SELECT
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));
CREATE POLICY "Org admins manage worksheet fields"
  ON public.worksheet_field_definitions FOR ALL
  USING (public.is_org_owner_or_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_owner_or_admin(auth.uid(), organization_id));
CREATE POLICY "Master admin manage worksheet fields"
  ON public.worksheet_field_definitions FOR ALL
  USING (public.is_master_admin(auth.uid()))
  WITH CHECK (public.is_master_admin(auth.uid()));
CREATE POLICY "Platform admin manage worksheet fields"
  ON public.worksheet_field_definitions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_worksheet_fields_updated
  BEFORE UPDATE ON public.worksheet_field_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Worksheet responses
CREATE TABLE IF NOT EXISTS public.worksheet_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.legal_connect_campaigns(id) ON DELETE SET NULL,
  call_session_id uuid,
  correlation_id text,
  responses jsonb NOT NULL DEFAULT '{}'::jsonb,
  captured_phase text NOT NULL DEFAULT 'acw'
    CHECK (captured_phase IN ('during_call','acw','post_call')),
  captured_by uuid,
  is_complete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_worksheet_responses_corr ON public.worksheet_responses(correlation_id);
CREATE INDEX IF NOT EXISTS idx_worksheet_responses_client ON public.worksheet_responses(client_id);
CREATE INDEX IF NOT EXISTS idx_worksheet_responses_session ON public.worksheet_responses(call_session_id);
ALTER TABLE public.worksheet_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view worksheet responses"
  ON public.worksheet_responses FOR SELECT
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));
CREATE POLICY "Org admins manage worksheet responses"
  ON public.worksheet_responses FOR ALL
  USING (public.is_org_owner_or_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_owner_or_admin(auth.uid(), organization_id));
CREATE POLICY "Master admin manage worksheet responses"
  ON public.worksheet_responses FOR ALL
  USING (public.is_master_admin(auth.uid()))
  WITH CHECK (public.is_master_admin(auth.uid()));
CREATE POLICY "Platform admin manage worksheet responses"
  ON public.worksheet_responses FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_worksheet_responses_updated
  BEFORE UPDATE ON public.worksheet_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Snapshot worksheet payload onto five9_event_log
ALTER TABLE public.five9_event_log
  ADD COLUMN IF NOT EXISTS worksheet_payload jsonb NOT NULL DEFAULT '{}'::jsonb;
