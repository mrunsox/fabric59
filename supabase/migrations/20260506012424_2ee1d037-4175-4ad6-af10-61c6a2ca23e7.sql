-- Walkthrough request status enum
DO $$ BEGIN
  CREATE TYPE public.walkthrough_request_status AS ENUM ('new', 'contacted', 'qualified', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.walkthrough_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  work_email TEXT NOT NULL,
  company TEXT,
  role TEXT,
  five9_status TEXT,
  current_crm TEXT,
  team_size TEXT,
  message TEXT,
  source_url TEXT,
  user_agent TEXT,
  status public.walkthrough_request_status NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT walkthrough_requests_name_len CHECK (char_length(name) BETWEEN 1 AND 200),
  CONSTRAINT walkthrough_requests_email_len CHECK (char_length(work_email) BETWEEN 3 AND 320),
  CONSTRAINT walkthrough_requests_message_len CHECK (message IS NULL OR char_length(message) <= 4000)
);

CREATE INDEX IF NOT EXISTS walkthrough_requests_created_at_idx
  ON public.walkthrough_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS walkthrough_requests_status_idx
  ON public.walkthrough_requests (status);

ALTER TABLE public.walkthrough_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can submit a walkthrough request
CREATE POLICY "Anyone can submit walkthrough requests"
  ON public.walkthrough_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Ops team / admins / master admins can read all submissions
CREATE POLICY "Ops can view walkthrough requests"
  ON public.walkthrough_requests
  FOR SELECT
  TO authenticated
  USING (
    public.is_master_admin(auth.uid())
    OR public.is_ops_member(auth.uid())
  );

-- Ops team / admins / master admins can update status
CREATE POLICY "Ops can update walkthrough requests"
  ON public.walkthrough_requests
  FOR UPDATE
  TO authenticated
  USING (
    public.is_master_admin(auth.uid())
    OR public.is_ops_member(auth.uid())
  )
  WITH CHECK (
    public.is_master_admin(auth.uid())
    OR public.is_ops_member(auth.uid())
  );

-- Only master admins can delete
CREATE POLICY "Master admins can delete walkthrough requests"
  ON public.walkthrough_requests
  FOR DELETE
  TO authenticated
  USING (public.is_master_admin(auth.uid()));

-- updated_at trigger
DROP TRIGGER IF EXISTS set_walkthrough_requests_updated_at ON public.walkthrough_requests;
CREATE TRIGGER set_walkthrough_requests_updated_at
  BEFORE UPDATE ON public.walkthrough_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();