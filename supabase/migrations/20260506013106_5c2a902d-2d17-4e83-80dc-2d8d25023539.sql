
CREATE TYPE public.demo_request_status AS ENUM ('new', 'scheduled', 'completed', 'archived');

CREATE TABLE public.demo_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  work_email TEXT NOT NULL,
  company TEXT NOT NULL,
  role TEXT,
  five9_status TEXT,
  current_crm TEXT,
  team_size TEXT,
  focus_areas TEXT[] NOT NULL DEFAULT '{}',
  timezone TEXT,
  slot_1 TIMESTAMPTZ,
  slot_2 TIMESTAMPTZ,
  slot_3 TIMESTAMPTZ,
  notes TEXT,
  source_url TEXT,
  user_agent TEXT,
  status public.demo_request_status NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.demo_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a demo request"
ON public.demo_requests FOR INSERT
WITH CHECK (true);

CREATE POLICY "Ops can view demo requests"
ON public.demo_requests FOR SELECT
USING (public.is_ops_member(auth.uid()) OR public.is_master_admin(auth.uid()));

CREATE POLICY "Ops can update demo requests"
ON public.demo_requests FOR UPDATE
USING (public.is_ops_member(auth.uid()) OR public.is_master_admin(auth.uid()));

CREATE POLICY "Master admin can delete demo requests"
ON public.demo_requests FOR DELETE
USING (public.is_master_admin(auth.uid()));

CREATE TRIGGER update_demo_requests_updated_at
BEFORE UPDATE ON public.demo_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_demo_requests_status ON public.demo_requests(status);
CREATE INDEX idx_demo_requests_created_at ON public.demo_requests(created_at DESC);
