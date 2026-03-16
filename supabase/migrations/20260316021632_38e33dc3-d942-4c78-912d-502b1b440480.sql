
-- Create report_uploads table
CREATE TABLE public.report_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  partner_id uuid REFERENCES public.partners(id),
  tenant_id uuid REFERENCES public.tenants(id),
  five9_domain_id uuid REFERENCES public.five9_domains(id),
  original_filename text NOT NULL,
  file_size_bytes integer,
  file_type text NOT NULL DEFAULT 'csv',
  uploaded_by uuid REFERENCES public.profiles(id),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  parsed_summary jsonb DEFAULT '{}'::jsonb,
  exclusions_applied text[] DEFAULT '{}',
  row_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create invoices table
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  partner_id uuid REFERENCES public.partners(id),
  tenant_id uuid REFERENCES public.tenants(id),
  status text NOT NULL DEFAULT 'draft',
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  currency text NOT NULL DEFAULT 'USD',
  total_amount numeric NOT NULL DEFAULT 0,
  notes text,
  source_upload_id uuid REFERENCES public.report_uploads(id),
  source_period_start date,
  source_period_end date,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create invoice_line_items table
CREATE TABLE public.invoice_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id),
  description text NOT NULL DEFAULT '',
  quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'minutes',
  rate numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add billing fields to partners
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS billing_default_rate_per_minute numeric,
  ADD COLUMN IF NOT EXISTS billing_currency text DEFAULT 'USD';

-- Add billing fields to tenants
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS billing_rate_per_minute numeric,
  ADD COLUMN IF NOT EXISTS five9_campaign_identifier text;

-- Enable RLS
ALTER TABLE public.report_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;

-- RLS for report_uploads (org-scoped, same pattern as partners)
CREATE POLICY "Master admin can manage all report_uploads" ON public.report_uploads FOR ALL TO authenticated USING (is_master_admin(auth.uid())) WITH CHECK (is_master_admin(auth.uid()));
CREATE POLICY "Platform admins can manage all report_uploads" ON public.report_uploads FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Org owners and admins can manage report_uploads" ON public.report_uploads FOR ALL TO authenticated USING (is_org_owner_or_admin(auth.uid(), organization_id)) WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));
CREATE POLICY "Org members can view report_uploads" ON public.report_uploads FOR SELECT TO authenticated USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

-- RLS for invoices (org-scoped)
CREATE POLICY "Master admin can manage all invoices" ON public.invoices FOR ALL TO authenticated USING (is_master_admin(auth.uid())) WITH CHECK (is_master_admin(auth.uid()));
CREATE POLICY "Platform admins can manage all invoices" ON public.invoices FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Org owners and admins can manage invoices" ON public.invoices FOR ALL TO authenticated USING (is_org_owner_or_admin(auth.uid(), organization_id)) WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));
CREATE POLICY "Org members can view invoices" ON public.invoices FOR SELECT TO authenticated USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

-- RLS for invoice_line_items (via invoice join)
CREATE POLICY "Master admin can manage all invoice_line_items" ON public.invoice_line_items FOR ALL TO authenticated USING (is_master_admin(auth.uid())) WITH CHECK (is_master_admin(auth.uid()));
CREATE POLICY "Platform admins can manage all invoice_line_items" ON public.invoice_line_items FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Org members can view invoice_line_items" ON public.invoice_line_items FOR SELECT TO authenticated USING (invoice_id IN (SELECT id FROM public.invoices WHERE organization_id IN (SELECT get_user_org_ids(auth.uid()))));
CREATE POLICY "Org owners and admins can manage invoice_line_items" ON public.invoice_line_items FOR ALL TO authenticated USING (invoice_id IN (SELECT id FROM public.invoices WHERE is_org_owner_or_admin(auth.uid(), organization_id))) WITH CHECK (invoice_id IN (SELECT id FROM public.invoices WHERE is_org_owner_or_admin(auth.uid(), organization_id)));

-- Updated_at triggers
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
