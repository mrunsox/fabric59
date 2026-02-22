
-- Add email column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Update trigger to copy email from auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

-- Backfill existing profiles with emails from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- Add RLS policy so org colleagues can view profiles (needed for team member display)
CREATE POLICY "Org members can view colleague profiles"
ON public.profiles
FOR SELECT
USING (
  id IN (
    SELECT om.user_id FROM public.organization_members om
    WHERE om.organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
  )
);
