-- Create helper function to check if user is org owner or admin
-- Uses SECURITY DEFINER to bypass RLS and prevent recursion
CREATE OR REPLACE FUNCTION public.is_org_owner_or_admin(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role IN ('owner', 'admin')
  )
$$;

-- Drop existing recursive policies on organization_members
DROP POLICY IF EXISTS "Org members can view own org members" ON public.organization_members;
DROP POLICY IF EXISTS "Org owners and admins can manage members" ON public.organization_members;

-- New policy: Users can view their own membership
CREATE POLICY "Users can view own membership"
ON public.organization_members FOR SELECT
USING (user_id = auth.uid());

-- New policy: Users can view other members in their org (via helper function)
CREATE POLICY "Members can view org colleagues"
ON public.organization_members FOR SELECT
USING (
  organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
);

-- New policy: Insert allowed for org creation (user adding themselves)
CREATE POLICY "Users can create membership for themselves"
ON public.organization_members FOR INSERT
WITH CHECK (user_id = auth.uid());

-- New policy: Owners/admins can add others (via helper function)
CREATE POLICY "Org admins can add members"
ON public.organization_members FOR INSERT
WITH CHECK (
  public.is_org_owner_or_admin(auth.uid(), organization_id)
);

-- New policy: Owners/admins can update members
CREATE POLICY "Org admins can update members"
ON public.organization_members FOR UPDATE
USING (public.is_org_owner_or_admin(auth.uid(), organization_id));

-- New policy: Owners/admins can delete members
CREATE POLICY "Org admins can delete members"
ON public.organization_members FOR DELETE
USING (public.is_org_owner_or_admin(auth.uid(), organization_id));

-- Drop and recreate for five9_domains
DROP POLICY IF EXISTS "Org owners and admins can manage domains" ON public.five9_domains;
CREATE POLICY "Org owners and admins can manage domains"
ON public.five9_domains FOR ALL
USING (public.is_org_owner_or_admin(auth.uid(), organization_id))
WITH CHECK (public.is_org_owner_or_admin(auth.uid(), organization_id));

-- Drop and recreate for tenants
DROP POLICY IF EXISTS "Org owners and admins can manage tenants" ON public.tenants;
CREATE POLICY "Org owners and admins can manage tenants"
ON public.tenants FOR ALL
USING (public.is_org_owner_or_admin(auth.uid(), organization_id))
WITH CHECK (public.is_org_owner_or_admin(auth.uid(), organization_id));