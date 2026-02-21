
-- =============================================
-- 1. Profiles table
-- =============================================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  phone text,
  timezone text DEFAULT 'America/New_York',
  onboarding_completed jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid());

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- Master admins can view all profiles
CREATE POLICY "Master admin can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (is_master_admin(auth.uid()));

-- Master admin can manage all profiles
CREATE POLICY "Master admin can manage all profiles"
ON public.profiles FOR ALL
TO authenticated
USING (is_master_admin(auth.uid()))
WITH CHECK (is_master_admin(auth.uid()));

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 2. User permissions table
-- =============================================
CREATE TABLE public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  permission text NOT NULL,
  granted_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id, permission)
);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Security definer function
CREATE OR REPLACE FUNCTION public.user_has_permission(
  _user_id uuid, _org_id uuid, _permission text
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_permissions
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND permission = _permission
  )
$$;

-- Users can view their own permissions
CREATE POLICY "Users can view own permissions"
ON public.user_permissions FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Org owners/admins can manage permissions for their org
CREATE POLICY "Org admins can manage permissions"
ON public.user_permissions FOR ALL
TO authenticated
USING (is_org_owner_or_admin(auth.uid(), organization_id))
WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));

-- Master admins can manage all permissions
CREATE POLICY "Master admin can manage all permissions"
ON public.user_permissions FOR ALL
TO authenticated
USING (is_master_admin(auth.uid()))
WITH CHECK (is_master_admin(auth.uid()));
