-- Phase A: SaaS Architecture Foundation

-- 1. Create new enums
CREATE TYPE public.org_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE public.org_status AS ENUM ('active', 'suspended', 'cancelled');
CREATE TYPE public.org_plan AS ENUM ('free', 'starter', 'pro', 'enterprise');
CREATE TYPE public.five9_domain_status AS ENUM ('active', 'inactive', 'pending_verification');

-- 2. Create organizations table
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  billing_email TEXT,
  plan org_plan NOT NULL DEFAULT 'free',
  status org_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create organization_members table (links users to orgs with roles)
CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role org_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

-- 4. Create five9_domains table
CREATE TABLE public.five9_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  display_name TEXT NOT NULL,
  api_key_encrypted TEXT,
  workflow_settings JSONB DEFAULT '{}'::jsonb,
  status five9_domain_status NOT NULL DEFAULT 'pending_verification',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (domain)
);

-- 5. Add organization and domain columns to tenants
ALTER TABLE public.tenants 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
ADD COLUMN five9_domain_id UUID REFERENCES public.five9_domains(id) ON DELETE SET NULL;

-- 6. Create helper function to check org membership
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id UUID, _org_id UUID)
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
  )
$$;

-- 7. Create helper function to get user's org membership (without org_id param)
CREATE OR REPLACE FUNCTION public.get_user_org_ids(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.organization_members
  WHERE user_id = _user_id
$$;

-- 8. Enable RLS on new tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.five9_domains ENABLE ROW LEVEL SECURITY;

-- 9. Organizations RLS policies
-- Platform admins can see all
CREATE POLICY "Platform admins can manage all organizations"
ON public.organizations FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Org members can view their own org
CREATE POLICY "Org members can view own organization"
ON public.organizations FOR SELECT
USING (
  id IN (SELECT public.get_user_org_ids(auth.uid()))
);

-- Org owners/admins can update their org
CREATE POLICY "Org owners and admins can update own organization"
ON public.organizations FOR UPDATE
USING (
  id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- 10. Organization members RLS policies
-- Platform admins can see all
CREATE POLICY "Platform admins can manage all org members"
ON public.organization_members FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Org members can view their org's members
CREATE POLICY "Org members can view own org members"
ON public.organization_members FOR SELECT
USING (
  organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
);

-- Org owners/admins can manage members
CREATE POLICY "Org owners and admins can manage members"
ON public.organization_members FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- 11. Five9 domains RLS policies
-- Platform admins can see all
CREATE POLICY "Platform admins can manage all domains"
ON public.five9_domains FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Org members can view their org's domains
CREATE POLICY "Org members can view own domains"
ON public.five9_domains FOR SELECT
USING (
  organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
);

-- Org owners/admins can manage domains
CREATE POLICY "Org owners and admins can manage domains"
ON public.five9_domains FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- 12. Update tenants RLS - add org-scoped access
-- Org members can view their org's tenants
CREATE POLICY "Org members can view own org tenants"
ON public.tenants FOR SELECT
USING (
  organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
);

-- Org owners/admins can manage tenants
CREATE POLICY "Org owners and admins can manage tenants"
ON public.tenants FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- 13. Add update triggers for new tables
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_five9_domains_updated_at
BEFORE UPDATE ON public.five9_domains
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 14. Create indexes for performance
CREATE INDEX idx_organization_members_user_id ON public.organization_members(user_id);
CREATE INDEX idx_organization_members_org_id ON public.organization_members(organization_id);
CREATE INDEX idx_five9_domains_org_id ON public.five9_domains(organization_id);
CREATE INDEX idx_tenants_org_id ON public.tenants(organization_id);
CREATE INDEX idx_tenants_domain_id ON public.tenants(five9_domain_id);