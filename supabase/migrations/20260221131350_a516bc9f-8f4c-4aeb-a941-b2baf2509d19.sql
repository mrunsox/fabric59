
-- Create error_alerts table
CREATE TABLE public.error_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  error_type TEXT NOT NULL,
  message TEXT NOT NULL,
  details JSONB,
  tenant_id UUID REFERENCES public.tenants(id),
  alerted_via TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.error_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ops team can view error alerts" ON public.error_alerts
  FOR SELECT USING (is_ops_member(auth.uid()));

CREATE POLICY "Master admin can manage all error alerts" ON public.error_alerts
  FOR ALL USING (is_master_admin(auth.uid())) WITH CHECK (is_master_admin(auth.uid()));

-- Add webhook_secret to five9_domains
ALTER TABLE public.five9_domains
  ADD COLUMN IF NOT EXISTS webhook_secret TEXT;
