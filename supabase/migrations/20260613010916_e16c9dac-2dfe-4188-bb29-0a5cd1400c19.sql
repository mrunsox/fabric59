-- Restrict SELECT on legal_connect_connections (contains encrypted OAuth tokens) to owners/admins only.
DROP POLICY IF EXISTS "Org members can view connections" ON public.legal_connect_connections;

CREATE POLICY "Org owners/admins can view connections"
ON public.legal_connect_connections
FOR SELECT
TO authenticated
USING (public.is_org_owner_or_admin(auth.uid(), organization_id));

-- Restrict SELECT on five9_domains (contains encrypted Five9 password, API key, webhook secret) to owners/admins only.
DROP POLICY IF EXISTS "Org members can view own domains" ON public.five9_domains;

CREATE POLICY "Org owners/admins can view own domains"
ON public.five9_domains
FOR SELECT
TO authenticated
USING (public.is_org_owner_or_admin(auth.uid(), organization_id));