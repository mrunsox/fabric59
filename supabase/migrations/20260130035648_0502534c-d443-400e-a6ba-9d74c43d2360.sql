-- Create is_master_admin helper function
CREATE OR REPLACE FUNCTION public.is_master_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'master_admin'::app_role
  )
$$;

-- Insert master_admin role for pauljoseph@24hvirtual.com (if user exists)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'master_admin'::app_role
FROM auth.users
WHERE email = 'pauljoseph@24hvirtual.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Update user_roles RLS: Master admin can see all roles
CREATE POLICY "Master admin can manage all roles"
ON public.user_roles
FOR ALL
USING (public.is_master_admin(auth.uid()))
WITH CHECK (public.is_master_admin(auth.uid()));

-- Hide master_admin users from non-master queries
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles (excluding master)"
ON public.user_roles
FOR SELECT
USING (
  user_id = auth.uid() 
  AND (role != 'master_admin' OR public.is_master_admin(auth.uid()))
);

-- Update organizations: Master admin has full access
CREATE POLICY "Master admin can manage all organizations"
ON public.organizations
FOR ALL
USING (public.is_master_admin(auth.uid()))
WITH CHECK (public.is_master_admin(auth.uid()));

-- Update organization_members: Master admin has full access
CREATE POLICY "Master admin can manage all org members"
ON public.organization_members
FOR ALL
USING (public.is_master_admin(auth.uid()))
WITH CHECK (public.is_master_admin(auth.uid()));

-- Update five9_domains: Master admin has full access
CREATE POLICY "Master admin can manage all domains"
ON public.five9_domains
FOR ALL
USING (public.is_master_admin(auth.uid()))
WITH CHECK (public.is_master_admin(auth.uid()));

-- Update tenants: Master admin has full access
CREATE POLICY "Master admin can manage all tenants"
ON public.tenants
FOR ALL
USING (public.is_master_admin(auth.uid()))
WITH CHECK (public.is_master_admin(auth.uid()));

-- Update api_logs: Master admin has full access
CREATE POLICY "Master admin can view all logs"
ON public.api_logs
FOR SELECT
USING (public.is_master_admin(auth.uid()));

-- Update notifications: Master admin has full access
CREATE POLICY "Master admin can view all notifications"
ON public.notifications
FOR SELECT
USING (public.is_master_admin(auth.uid()));

-- Update unified_schema: Master admin has full access
CREATE POLICY "Master admin can manage all schemas"
ON public.unified_schema
FOR ALL
USING (public.is_master_admin(auth.uid()))
WITH CHECK (public.is_master_admin(auth.uid()));

-- Update api_keys: Master admin has full access
CREATE POLICY "Master admin can manage all api keys"
ON public.api_keys
FOR ALL
USING (public.is_master_admin(auth.uid()))
WITH CHECK (public.is_master_admin(auth.uid()));