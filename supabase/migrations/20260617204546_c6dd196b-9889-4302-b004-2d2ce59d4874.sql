
CREATE POLICY "bb_storage_select" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'business-brain-sources'
  AND public.is_workspace_member(auth.uid(), (split_part(name, '/', 1))::uuid)
);

CREATE POLICY "bb_storage_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'business-brain-sources'
  AND public.has_workspace_role_min(auth.uid(), (split_part(name, '/', 1))::uuid, 'manager')
);

CREATE POLICY "bb_storage_delete" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'business-brain-sources'
  AND public.has_workspace_role_min(auth.uid(), (split_part(name, '/', 1))::uuid, 'admin')
);
