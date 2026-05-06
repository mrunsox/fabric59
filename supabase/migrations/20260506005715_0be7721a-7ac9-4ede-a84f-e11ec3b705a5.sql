CREATE OR REPLACE FUNCTION public.get_rls_policy_snapshot(_tables text[])
RETURNS TABLE (
  schemaname text,
  tablename  text,
  policyname text,
  cmd        text,
  roles      text[],
  qual       text,
  with_check text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT p.schemaname::text, p.tablename::text, p.policyname::text,
         p.cmd::text, p.roles::text[], p.qual::text, p.with_check::text
  FROM pg_policies p
  WHERE p.schemaname = 'public'
    AND p.tablename = ANY(_tables)
$$;

REVOKE ALL ON FUNCTION public.get_rls_policy_snapshot(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_rls_policy_snapshot(text[]) TO authenticated, service_role;