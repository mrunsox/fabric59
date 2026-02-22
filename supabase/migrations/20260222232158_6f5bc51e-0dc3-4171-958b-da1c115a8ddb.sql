
-- Create campaign_setups table
CREATE TABLE public.campaign_setups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL,
  five9_domain_id uuid,
  campaign_name text NOT NULL,
  client_name text NOT NULL,
  campaign_type text NOT NULL DEFAULT 'inbound',
  intake_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  checklist_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  priority text NOT NULL DEFAULT 'normal',
  target_go_live timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaign_setups ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Master admin can manage all campaign setups"
  ON public.campaign_setups FOR ALL
  USING (is_master_admin(auth.uid()))
  WITH CHECK (is_master_admin(auth.uid()));

CREATE POLICY "Platform admins can manage all campaign setups"
  ON public.campaign_setups FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Org owners and admins can manage campaign setups"
  ON public.campaign_setups FOR ALL
  USING (is_org_owner_or_admin(auth.uid(), organization_id))
  WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));

CREATE POLICY "Org members can view campaign setups"
  ON public.campaign_setups FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

-- Trigger for updated_at
CREATE TRIGGER update_campaign_setups_updated_at
  BEFORE UPDATE ON public.campaign_setups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create campaign-assets storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('campaign-assets', 'campaign-assets', false);

-- Storage RLS: authenticated users can upload
CREATE POLICY "Authenticated users can upload campaign assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'campaign-assets' AND auth.uid() IS NOT NULL);

-- Storage RLS: authenticated users can read
CREATE POLICY "Authenticated users can read campaign assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'campaign-assets' AND auth.uid() IS NOT NULL);

-- Storage RLS: authenticated users can update their uploads
CREATE POLICY "Authenticated users can update campaign assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'campaign-assets' AND auth.uid() IS NOT NULL);

-- Storage RLS: authenticated users can delete their uploads
CREATE POLICY "Authenticated users can delete campaign assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'campaign-assets' AND auth.uid() IS NOT NULL);
