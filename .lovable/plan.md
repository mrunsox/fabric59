

# Fabric59 – Data Plane & Automation Layer for 24H Virtual

## Analysis

The prompt asks Fabric59 to formalize itself as the **data plane** that 24H Virtual's internal AI agents read/write through. It does NOT ask for UI changes or new dashboards -- it asks for **DB views, standardized API contracts, and outline items** so the data surfaces are documented and buildable.

### What already exists
- All Five9 SOAP integration, CRM push, field mapping, agent lifecycle, campaign automation, monitoring -- **done**
- Multi-tenant schema with `organization_id` scoping, RLS, audit logs -- **done**
- `call_log_cache`, `api_logs`, `agents`, `tenants` tables -- **done**

### What's missing (the actual new work)
Six **database views** that normalize existing data into clean, stable contracts for 24H Virtual's agents. Plus one small config table for agent-to-agent identity cross-references.

## Plan

### 1. Add "Data Plane Views" category to buildMap (6 items)

Insert before "Platform Utilities" in `src/data/buildMap.ts`:

| Item | Status | Description |
|---|---|---|
| Call Usage Summary View | planned | `fabric59_call_usage_summary` -- per tenant/org/period: total_minutes, total_calls, skill breakdown, billable flags. Sourced from `call_log_cache` |
| Agent Activity Summary View | planned | `fabric59_agent_activity_summary` -- per agent/period: talk_time, ready_time, logged_in_time, call_count. Sourced from `call_log_cache` + `agents` |
| CRM Push Leads View | planned | `fabric59_crm_push_leads` -- normalized lead events from `api_logs` where endpoint matches `crm-push/*`: org_id, tenant_id, crm_type, object_type, object_id, contact fields, timestamps |
| Agents Identity View | planned | `fabric59_agents_identity` -- unified agent directory joining `agents` table with five9/slack/google IDs, scoped by org via `organization_members` or direct org_id column |
| Customers Identity View | planned | `fabric59_customers_identity` -- unified client directory from `tenants` with CRM refs, Stripe refs, integration_configs keys |
| Lifecycle Audit View | planned | `fabric59_lifecycle_audit` -- filtered `audit_logs` for entity_type in ('agent','provisioning','deprovisioning') with structured details |

### 2. Add "Identity Resolution" category (2 items)

| Item | Status | Description |
|---|---|---|
| Identity Cross-Reference Table | planned | `identity_xrefs` table: org_id, person_type (agent/client), internal_id, external_system (five9/slack/google/stripe/crm), external_id, synced_at. With RLS by org_id |
| Identity Sync Edge Function | planned | Edge function that reads agents + tenants + integration_configs and upserts `identity_xrefs` rows, callable on-demand or via pg_cron |

### 3. Database migrations (executed when building each item)

**Views** (no RLS needed -- views inherit from underlying table RLS):

```sql
-- fabric59_call_usage_summary
CREATE VIEW fabric59_call_usage_summary AS
SELECT
  c.organization_id AS org_id,
  c.five9_domain_id,
  date_trunc('day', c.call_timestamp) AS period_start,
  count(*) AS total_calls,
  sum((c.call_data->>'duration')::int) AS total_seconds,
  c.call_data->>'campaignName' AS campaign,
  c.call_data->>'disposition' AS disposition
FROM call_log_cache c
GROUP BY 1,2,3,6,7;
```

Similar patterns for the other 5 views. Each is a `SELECT` over existing tables with no new data storage.

**Identity table:**

```sql
CREATE TABLE identity_xrefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  person_type text NOT NULL, -- 'agent' or 'client'
  internal_id uuid NOT NULL,
  external_system text NOT NULL, -- 'five9','slack','google','stripe','salesforce', etc.
  external_id text NOT NULL,
  synced_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, person_type, internal_id, external_system)
);
ALTER TABLE identity_xrefs ENABLE ROW LEVEL SECURITY;
-- Standard org-scoped RLS policies
```

### 4. File changes summary

| File | Change |
|---|---|
| `src/data/buildMap.ts` | Insert 2 new categories (8 items total) before "Platform Utilities" |

No other code files change. The views and table are DB-only migrations executed when each item is built. No UI pages needed per the spec ("No UI changes in Fabric59 are required for now").

### 5. What this does NOT include (per spec)

- No new dashboards or UI pages
- No changes to existing Five9/CRM/lifecycle flows
- No 24H Virtual app code (that's a separate project)
- No AI agent implementations (those live in 24H Virtual's app, consuming these views)

