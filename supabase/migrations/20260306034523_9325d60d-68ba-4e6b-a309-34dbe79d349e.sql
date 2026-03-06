
-- Data Plane View 1: Call Usage Summary
CREATE OR REPLACE VIEW public.fabric59_call_usage_summary AS
SELECT
  c.organization_id AS org_id,
  c.five9_domain_id,
  date_trunc('day', c.call_timestamp) AS period_start,
  count(*) AS total_calls,
  coalesce(sum((c.call_data->>'duration')::int), 0) AS total_seconds,
  c.call_data->>'campaignName' AS campaign,
  c.call_data->>'skillName' AS skill,
  c.call_data->>'disposition' AS disposition
FROM public.call_log_cache c
GROUP BY 1, 2, 3, 6, 7, 8;

-- Data Plane View 2: Agent Activity Summary
CREATE OR REPLACE VIEW public.fabric59_agent_activity_summary AS
SELECT
  c.organization_id AS org_id,
  c.five9_domain_id,
  c.call_data->>'agentId' AS external_agent_id,
  c.call_data->>'agentName' AS agent_name,
  date_trunc('day', c.call_timestamp) AS period_start,
  count(*) AS total_calls,
  coalesce(sum((c.call_data->>'talkTime')::int), 0) AS total_talk_seconds,
  coalesce(sum((c.call_data->>'holdTime')::int), 0) AS total_hold_seconds,
  coalesce(sum((c.call_data->>'wrapTime')::int), 0) AS total_wrap_seconds,
  coalesce(sum((c.call_data->>'duration')::int), 0) AS total_duration_seconds
FROM public.call_log_cache c
GROUP BY 1, 2, 3, 4, 5;

-- Data Plane View 3: CRM Push Leads
CREATE OR REPLACE VIEW public.fabric59_crm_push_leads AS
SELECT
  l.id AS log_id,
  l.tenant_id,
  t.organization_id AS org_id,
  t.crm_type,
  l.request_payload->>'crm_action' AS crm_action,
  l.request_payload->'data'->>'name' AS contact_name,
  l.request_payload->'data'->>'email' AS contact_email,
  l.request_payload->'data'->>'phone' AS contact_phone,
  l.request_payload->'data'->>'company' AS contact_company,
  l.status,
  l.response,
  l.created_at
FROM public.api_logs l
LEFT JOIN public.tenants t ON l.tenant_id = t.id
WHERE l.endpoint LIKE 'crm-push/%';

-- Data Plane View 4: Agents Identity
CREATE OR REPLACE VIEW public.fabric59_agents_identity AS
SELECT
  a.id AS fabric59_agent_id,
  a.first_name,
  a.last_name,
  a.email,
  a.role,
  a.status,
  a.five9_user_id,
  a.five9_username,
  a.slack_user_id,
  a.google_user_id,
  a.extension,
  a.provisioned_at,
  a.deprovisioned_at
FROM public.agents a;

-- Data Plane View 5: Customers Identity
CREATE OR REPLACE VIEW public.fabric59_customers_identity AS
SELECT
  t.id AS fabric59_client_id,
  t.organization_id AS org_id,
  t.name AS client_name,
  t.crm_type,
  t.crm_api_url,
  t.status,
  t.stripe_api_key IS NOT NULL AS has_stripe,
  t.quickbooks_api_key IS NOT NULL AS has_quickbooks,
  t.five9_domain_id,
  t.integration_configs,
  t.created_at
FROM public.tenants t;

-- Data Plane View 6: Lifecycle Audit
CREATE OR REPLACE VIEW public.fabric59_lifecycle_audit AS
SELECT
  al.id,
  al.user_id AS performed_by,
  al.action,
  al.entity_type,
  al.entity_id,
  al.details,
  al.ip_address,
  al.created_at
FROM public.audit_logs al
WHERE al.entity_type IN ('agent', 'provisioning', 'deprovisioning', 'onboarding', 'offboarding');
