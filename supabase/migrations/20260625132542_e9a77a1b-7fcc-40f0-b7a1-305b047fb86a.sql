
-- 1) tenants: revoke SELECT on sensitive credential/webhook columns from authenticated and anon
REVOKE SELECT (
  crm_api_key,
  webhook_url,
  slack_webhook_url,
  zapier_webhook_url,
  make_webhook_url,
  pabbly_webhook_url,
  n8n_webhook_url,
  teams_webhook_url,
  twilio_account_sid,
  twilio_auth_token,
  zoom_api_key,
  stripe_api_key,
  quickbooks_api_key,
  calendly_api_key,
  docusign_api_key,
  dropbox_api_key,
  microsoft365_api_key,
  asana_api_key,
  openai_api_key,
  power_automate_webhook_url,
  integration_configs
) ON public.tenants FROM authenticated, anon;

-- 2) five9_domains: revoke SELECT on encrypted credentials and webhook secret
REVOKE SELECT (
  five9_password_encrypted,
  api_key_encrypted,
  webhook_secret
) ON public.five9_domains FROM authenticated, anon;

-- 3) legal_connect_escalation_sinks: revoke SELECT on hmac_secret
REVOKE SELECT (hmac_secret) ON public.legal_connect_escalation_sinks FROM authenticated, anon;

-- 4) Storage: add UPDATE policies mirroring INSERT for business-brain-sources and blueprint-documents
DROP POLICY IF EXISTS bb_storage_update ON storage.objects;
CREATE POLICY bb_storage_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'business-brain-sources'
    AND has_workspace_role_min(auth.uid(), (split_part(name, '/', 1))::uuid, 'manager'::workspace_role)
  )
  WITH CHECK (
    bucket_id = 'business-brain-sources'
    AND has_workspace_role_min(auth.uid(), (split_part(name, '/', 1))::uuid, 'manager'::workspace_role)
  );

DROP POLICY IF EXISTS "Org members can update blueprint docs" ON storage.objects;
CREATE POLICY "Org members can update blueprint docs" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'blueprint-documents'
    AND (
      is_master_admin(auth.uid())
      OR (
        (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND ((storage.foldername(name))[1])::uuid IN (SELECT get_user_org_ids(auth.uid()))
      )
    )
  )
  WITH CHECK (
    bucket_id = 'blueprint-documents'
    AND (
      is_master_admin(auth.uid())
      OR (
        (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND ((storage.foldername(name))[1])::uuid IN (SELECT get_user_org_ids(auth.uid()))
      )
    )
  );
