
-- 1) Add workspace_id to tenants (clients), no backfill
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tenants_workspace_id ON public.tenants(workspace_id);

-- 2) Capture doomed tenant ids for cascading orphan cleanup
WITH doomed AS (
  SELECT id FROM public.tenants
  WHERE name ~* '(test|demo|sandbox|please_ignore)'
     OR name ~* '^old_'
)
DELETE FROM public.campaigns
WHERE client_id IN (SELECT id FROM doomed);

-- 3) Hard-delete demo tenants
DELETE FROM public.tenants
WHERE name ~* '(test|demo|sandbox|please_ignore)'
   OR name ~* '^old_';

-- 4) Purge campaigns/guides/forms/templates matching demo heuristic
DELETE FROM public.campaigns
WHERE name ~* '(test|demo|sandbox|please_ignore)'
   OR name ~* '^old_';

DELETE FROM public.guides
WHERE name ~* '(test|demo|sandbox|please_ignore)'
   OR name ~* '^old_';

DELETE FROM public.forms
WHERE name ~* '(test|demo|sandbox|please_ignore)'
   OR name ~* '^old_';

DELETE FROM public.templates
WHERE name ~* '(test|demo|sandbox|please_ignore)'
   OR name ~* '^old_';

-- 5) Seed canonical integration providers (Clio already present)
INSERT INTO public.integration_providers (id, display_name, category, capabilities, auth_type, is_active)
VALUES
  ('mycase', 'MyCase',  'crm',          '{"matters": true, "contacts": true, "webhooks": true}'::jsonb, 'oauth2',     true),
  ('five9',  'Five9',   'telephony',    '{"campaigns": true, "users": true, "skills": true}'::jsonb,    'soap',       true),
  ('slack',  'Slack',   'notification', '{"channels": true, "messages": true}'::jsonb,                  'oauth2',     true),
  ('zapier', 'Zapier',  'automation',   '{"webhook": true}'::jsonb,                                     'webhook_url',true),
  ('make',   'Make',    'automation',   '{"webhook": true}'::jsonb,                                     'webhook_url',true)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  category     = EXCLUDED.category,
  capabilities = EXCLUDED.capabilities,
  auth_type    = EXCLUDED.auth_type,
  is_active    = true,
  updated_at   = now();

-- 6) Purge non-canonical providers / connections / mappings
DELETE FROM public.integration_connections
WHERE provider_id NOT IN ('clio','mycase','five9','slack','zapier','make');

DELETE FROM public.integration_mappings
WHERE provider_id NOT IN ('clio','mycase','five9','slack','zapier','make');

DELETE FROM public.integration_providers
WHERE id NOT IN ('clio','mycase','five9','slack','zapier','make');
