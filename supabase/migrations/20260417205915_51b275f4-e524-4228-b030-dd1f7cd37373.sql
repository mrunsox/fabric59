-- Assistant config per organization
CREATE TABLE public.assistant_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  assistant_name TEXT NOT NULL DEFAULT 'Fabric Assistant',
  greeting TEXT NOT NULL DEFAULT 'Hi! I''m here to help you navigate Fabric59. Ask me anything.',
  tone TEXT NOT NULL DEFAULT 'friendly',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.assistant_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view assistant config"
ON public.assistant_config FOR SELECT
USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can manage assistant config"
ON public.assistant_config FOR ALL
USING (public.is_org_owner_or_admin(auth.uid(), organization_id))
WITH CHECK (public.is_org_owner_or_admin(auth.uid(), organization_id));

CREATE TRIGGER update_assistant_config_updated_at
BEFORE UPDATE ON public.assistant_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Platform events for the webhook event bus
CREATE TABLE public.platform_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  source TEXT,
  correlation_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_platform_events_org_type ON public.platform_events(organization_id, event_type, created_at DESC);

ALTER TABLE public.platform_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view events"
ON public.platform_events FOR SELECT
USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can insert events"
ON public.platform_events FOR INSERT
WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- QR DID mappings for inbound QR-routed callbacks
CREATE TABLE public.qr_did_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  did TEXT NOT NULL,
  label TEXT,
  source_channel TEXT NOT NULL DEFAULT 'qr_code',
  routing_config_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, did)
);

CREATE INDEX idx_qr_did_mappings_did ON public.qr_did_mappings(did) WHERE is_active = true;

ALTER TABLE public.qr_did_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view qr mappings"
ON public.qr_did_mappings FOR SELECT
USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can manage qr mappings"
ON public.qr_did_mappings FOR ALL
USING (public.is_org_owner_or_admin(auth.uid(), organization_id))
WITH CHECK (public.is_org_owner_or_admin(auth.uid(), organization_id));

CREATE TRIGGER update_qr_did_mappings_updated_at
BEFORE UPDATE ON public.qr_did_mappings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();