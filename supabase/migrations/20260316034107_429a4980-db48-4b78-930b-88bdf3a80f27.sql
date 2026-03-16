
-- Add versioning columns to scripts table
ALTER TABLE public.scripts 
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_live boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dnis text,
  ADD COLUMN IF NOT EXISTS is_template boolean NOT NULL DEFAULT false;

-- Create script_versions table
CREATE TABLE public.script_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  script_id uuid NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.script_versions ENABLE ROW LEVEL SECURITY;

-- RLS policies for script_versions
CREATE POLICY "Master admin can manage all script_versions"
  ON public.script_versions FOR ALL TO authenticated
  USING (is_master_admin(auth.uid()))
  WITH CHECK (is_master_admin(auth.uid()));

CREATE POLICY "Org members can view script_versions"
  ON public.script_versions FOR SELECT TO authenticated
  USING (script_id IN (
    SELECT id FROM public.scripts 
    WHERE organization_id IN (SELECT get_user_org_ids(auth.uid()))
  ));

CREATE POLICY "Org owners and admins can manage script_versions"
  ON public.script_versions FOR ALL TO authenticated
  USING (script_id IN (
    SELECT s.id FROM public.scripts s
    WHERE is_org_owner_or_admin(auth.uid(), s.organization_id)
  ))
  WITH CHECK (script_id IN (
    SELECT s.id FROM public.scripts s
    WHERE is_org_owner_or_admin(auth.uid(), s.organization_id)
  ));

CREATE POLICY "Platform admins can manage all script_versions"
  ON public.script_versions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));
