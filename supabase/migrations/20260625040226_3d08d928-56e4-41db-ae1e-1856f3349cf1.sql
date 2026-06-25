ALTER TABLE public.disposition_access
  ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS disposition_access_org_campaign_idx
  ON public.disposition_access (organization_id, campaign_id);

DROP TRIGGER IF EXISTS disposition_access_set_updated_at ON public.disposition_access;
CREATE TRIGGER disposition_access_set_updated_at
  BEFORE UPDATE ON public.disposition_access
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();