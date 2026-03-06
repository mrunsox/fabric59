

# Fabric59 – Web Callback Orchestration for 24H Virtual

## What This Adds

A complete web callback pipeline: external sources (web widgets, QR codes, landing pages) submit callback requests → Fabric59 validates, normalizes, and maps them → Five9 outbound/scheduled calls are triggered → outcomes are written back to the tenant.

## Architecture

```text
Web Widget / QR / Chat
        │
        ▼
  web-callback Edge Function  ←── receives POST with contact + intent
        │
        ├─ Validate (phone required, tenant scoping)
        ├─ Normalize (defaults for mode/reason/queue)
        ├─ Store in web_callbacks table
        │
        ▼
  five9-provisioning (existing SOAP)  ←── addRecordToList / createCallback
        │
        ├─ Map queue → Five9 campaign
        ├─ Instant → immediate dial
        ├─ Scheduled → timed callback
        │
        ▼
  Outcome writeback via five9-webhook (existing)
        │
        └─ Update web_callbacks.status + call result
```

## Implementation Plan

### 1. Database: `web_callbacks` table

New table scoped by `organization_id` and `tenant_id`:

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| organization_id | uuid NOT NULL | FK for RLS |
| tenant_id | uuid | Which client/tenant |
| five9_domain_id | uuid | Which Five9 domain to dial through |
| contact_name | text | Optional |
| contact_phone | text NOT NULL | E.164 normalized |
| contact_email | text | Optional |
| source_channel | text | web_widget, qr_code, chat, landing_page |
| source_url | text | Where it came from |
| utm_source, utm_medium, utm_campaign | text | Marketing attribution |
| reason | text DEFAULT 'sales' | sales, support, partner |
| mode | text DEFAULT 'human' | human, ai |
| queue | text DEFAULT '24H-WEB-SALES' | Routing queue name |
| callback_type | text DEFAULT 'instant' | instant, scheduled |
| callback_time | timestamptz | For scheduled callbacks |
| priority | text DEFAULT 'normal' | high, normal, low |
| status | text DEFAULT 'pending' | pending, dialing, completed, no_answer, failed, error_missing_phone |
| five9_call_id | text | Returned from Five9 |
| call_disposition | text | Written back after call |
| call_duration_seconds | int | |
| recording_url | text | |
| error_message | text | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Standard RLS: master_admin ALL, org-scoped SELECT for members, org owner/admin ALL, platform admin ALL.

### 2. Tenant callback config: `callback_routing_configs` table

Per-tenant mapping of queue names to Five9 campaign IDs:

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| organization_id | uuid NOT NULL | |
| tenant_id | uuid | |
| five9_domain_id | uuid | |
| queue_name | text | e.g. '24H-WEB-SALES' |
| five9_campaign_id | text | Target campaign in Five9 |
| five9_list_name | text | Target list for record injection |
| mode | text | 'human' or 'ai' |
| is_active | boolean DEFAULT true | |
| created_at / updated_at | timestamptz | |

Same RLS pattern. This keeps the queue→campaign mapping configurable per tenant without hardcoding.

### 3. Edge Function: `web-callback`

New edge function (`supabase/functions/web-callback/index.ts`):

- **Auth**: Accepts requests with `x-webhook-secret` + `x-five9-domain` headers (same pattern as `five9-webhook`) OR authenticated Supabase JWT
- **Validation**: Phone required, normalize E.164, default missing fields (reason→sales, mode→human, queue→24H-WEB-SALES, callback_type→instant)
- **Insert**: Write to `web_callbacks` table with status=pending
- **Route**: Look up `callback_routing_configs` for the tenant's queue→campaign mapping
- **Execute**: Call `five9-provisioning` edge function with action `addRecordToList` (inject contact into outbound list for immediate dial) or schedule via Five9 SOAP
- **Update**: Set status to `dialing` on success, `failed` on error
- **Log**: Insert into `api_logs` for observability

### 4. Extend `five9-webhook` for callback outcomes

Add handler for `web_callback_result` event type (or extend `call_ended` handler):

- Match incoming call result to a `web_callbacks` row by `five9_call_id` or phone+campaign
- Update status, disposition, duration, recording_url
- Fire tenant notification if configured

### 5. Extend `five9-provisioning` with `addRecordToList` action

Add a new SOAP action handler to the existing edge function:

```xml
<ser:addRecordToList>
  <listName>{list}</listName>
  <record>
    <fields><name>number1</name><value>{phone}</value></fields>
    <fields><name>first_name</name><value>{name}</value></fields>
    ...
  </record>
</ser:addRecordToList>
```

This injects a contact into a Five9 outbound list, which triggers the dialer for instant callbacks.

### 6. Build outline update

Add new category "Web Callback Orchestration" (6 items) to `src/data/buildMap.ts`:

| Item | Status | Description |
|---|---|---|
| Web Callbacks Table | planned | web_callbacks table with org/tenant scoping, contact fields, routing intent, call outcome tracking, RLS |
| Callback Routing Configs | planned | Per-tenant queue→Five9 campaign mapping table with mode (human/ai) support |
| Web Callback Edge Function | planned | Receives callback requests, validates phone, normalizes defaults, stores record, triggers Five9 dial |
| Five9 addRecordToList Action | planned | New SOAP action in five9-provisioning to inject contacts into outbound lists for immediate dialing |
| Callback Outcome Writeback | planned | Extend five9-webhook to match call results back to web_callbacks and update status/disposition |
| QR Code Inbound Routing | planned | Map inbound QR DIDs to tenant callback routing configs for source_channel=qr_code tracking |

### 7. File changes summary

| File | Change |
|---|---|
| `src/data/buildMap.ts` | Insert "Web Callback Orchestration" category (6 items) before "Platform Utilities" |
| Migration SQL | Create `web_callbacks` and `callback_routing_configs` tables with RLS |
| `supabase/functions/web-callback/index.ts` | New edge function |
| `supabase/functions/five9-provisioning/index.ts` | Add `addRecordToList` SOAP action |
| `supabase/functions/five9-webhook/index.ts` | Add `web_callback_result` handler |
| `supabase/config.toml` | Add `[functions.web-callback]` with `verify_jwt = false` |

### What this does NOT include yet

- Admin UI for managing callback routing configs (future item)
- QR code generator UI (future item)
- Scheduled callback cron job (can use existing `process-jobs` pattern)
- AI mode campaign configuration (depends on Five9 AI agent setup)

