
-- 1. Widen provider check on legal_connect_connections to include clio_grow
ALTER TABLE public.legal_connect_connections
  DROP CONSTRAINT IF EXISTS legal_connect_connections_provider_check;
ALTER TABLE public.legal_connect_connections
  ADD CONSTRAINT legal_connect_connections_provider_check
  CHECK (provider = ANY (ARRAY[
    'clio'::text, 'clio_grow'::text, 'mycase'::text, 'smokeball'::text,
    'lawmatics'::text, 'litify'::text, 'cosmolex'::text,
    'practicepanther'::text, 'five9'::text
  ]));

-- 2. Widen provider_target check on five9_campaign_routes
ALTER TABLE public.five9_campaign_routes
  DROP CONSTRAINT IF EXISTS five9_campaign_routes_provider_target_check;
ALTER TABLE public.five9_campaign_routes
  ADD CONSTRAINT five9_campaign_routes_provider_target_check
  CHECK (provider_target IS NULL OR provider_target = ANY (ARRAY[
    'clio'::text, 'clio_grow'::text, 'mycase'::text, 'smokeball'::text
  ]));

-- 3. Seed capabilities for clio_grow (idempotent)
INSERT INTO public.legal_connect_provider_capabilities
  (provider, capability_key, capability_name, supported, support_mode, notes)
VALUES
  ('clio_grow', 'lead_sync',     'Create inbox lead',  true,  'native',       'POST grow.clio.com/inbox_leads with inbox_lead_token'),
  ('clio_grow', 'contact_sync',  'Contact lookup/create', false, 'unsupported', 'Inbox API does not expose contact CRUD; lead is the unit of work'),
  ('clio_grow', 'matter_sync',   'Matter create',      false, 'unsupported',  'Not available via Lead Inbox API'),
  ('clio_grow', 'note_sync',     'Note create',        false, 'unsupported',  'Not available via Lead Inbox API'),
  ('clio_grow', 'task_sync',     'Task create',        false, 'unsupported',  'Not available via Lead Inbox API'),
  ('clio_grow', 'activity_sync', 'Activity create',    false, 'unsupported',  'Not available via Lead Inbox API')
ON CONFLICT DO NOTHING;
