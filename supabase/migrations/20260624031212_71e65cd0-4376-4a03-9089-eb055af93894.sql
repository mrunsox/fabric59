
-- 1. Flip all {public}-role policies on sensitive tables to {authenticated}
DO $$
DECLARE
  r record;
  tables text[] := ARRAY[
    'audit_logs','campaign_builder_drafts','campaign_setups','clio_mappings',
    'five9_campaign_routes','five9_event_log','legal_connect_campaigns',
    'legal_connect_conflicts','legal_connect_connections','legal_connect_contacts',
    'legal_connect_disposition_mappings','legal_connect_matters','legal_connect_notes',
    'legal_connect_review_queue','legal_connect_sync_jobs','legal_connect_tenant_configs',
    'mycase_mappings','oauth_tokens','tenants'
  ];
BEGIN
  FOR r IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY(tables)
      AND 'public' = ANY(roles)
  LOOP
    EXECUTE format(
      'ALTER POLICY %I ON public.%I TO authenticated',
      r.policyname, r.tablename
    );
  END LOOP;
END $$;

-- 2. Tighten storage policies for campaign-assets bucket (org-scoped by path prefix)
DROP POLICY IF EXISTS "Authenticated users can read campaign assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload campaign assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update campaign assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete campaign assets" ON storage.objects;

CREATE POLICY "Org members can read campaign assets"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'campaign-assets'
  AND (
    public.is_master_admin(auth.uid())
    OR (
      (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND ((storage.foldername(name))[1])::uuid IN (SELECT public.get_user_org_ids(auth.uid()))
    )
  )
);

CREATE POLICY "Org members can upload campaign assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'campaign-assets'
  AND (
    public.is_master_admin(auth.uid())
    OR (
      (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND ((storage.foldername(name))[1])::uuid IN (SELECT public.get_user_org_ids(auth.uid()))
    )
  )
);

CREATE POLICY "Org members can update campaign assets"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'campaign-assets'
  AND (
    public.is_master_admin(auth.uid())
    OR (
      (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND ((storage.foldername(name))[1])::uuid IN (SELECT public.get_user_org_ids(auth.uid()))
    )
  )
);

CREATE POLICY "Org members can delete campaign assets"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'campaign-assets'
  AND (
    public.is_master_admin(auth.uid())
    OR (
      (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND ((storage.foldername(name))[1])::uuid IN (SELECT public.get_user_org_ids(auth.uid()))
    )
  )
);

-- 3. Tighten storage policies for blueprint-documents bucket (org-scoped by path prefix)
DROP POLICY IF EXISTS "Authenticated users can read blueprint docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload blueprint docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete blueprint docs" ON storage.objects;

CREATE POLICY "Org members can read blueprint docs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'blueprint-documents'
  AND (
    public.is_master_admin(auth.uid())
    OR (
      (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND ((storage.foldername(name))[1])::uuid IN (SELECT public.get_user_org_ids(auth.uid()))
    )
  )
);

CREATE POLICY "Org members can upload blueprint docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'blueprint-documents'
  AND (
    public.is_master_admin(auth.uid())
    OR (
      (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND ((storage.foldername(name))[1])::uuid IN (SELECT public.get_user_org_ids(auth.uid()))
    )
  )
);

CREATE POLICY "Org members can delete blueprint docs"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'blueprint-documents'
  AND (
    public.is_master_admin(auth.uid())
    OR (
      (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND ((storage.foldername(name))[1])::uuid IN (SELECT public.get_user_org_ids(auth.uid()))
    )
  )
);
