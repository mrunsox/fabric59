

# Build Out Next 6 Integrations

## Overview

Move 6 high-value integrations from "Coming Soon" to functional status, spanning multiple categories. Each will get a catalog status upgrade, backend edge function, and where needed, new database fields and tenant form configuration.

## Selected Integrations

1. **HubSpot** (CRM) -- Popular general-purpose CRM
2. **Zendesk** (Support CRM) -- Ticketing and support
3. **Twilio** (Communication) -- SMS confirmations/follow-ups
4. **Google Calendar** (Productivity) -- Appointment booking
5. **Zoom** (Communication) -- Meeting scheduling
6. **Microsoft Teams** (Communication) -- Team notifications

## What Changes

### 1. Database Migration

Add new columns to the `tenants` table for the integrations that need per-client configuration:

```
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS teams_webhook_url text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS twilio_account_sid text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS twilio_auth_token text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS twilio_from_number text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS zoom_api_key text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS google_calendar_id text;
```

Also expand the `crm_type` enum to include `hubspot` and `zendesk`:

```
ALTER TYPE crm_type ADD VALUE IF NOT EXISTS 'hubspot';
ALTER TYPE crm_type ADD VALUE IF NOT EXISTS 'zendesk';
```

### 2. Integration Catalog Updates

**File: `src/data/integrations-catalog.ts`**

Change status from `"coming_soon"` to `"available"` for: HubSpot, Zendesk, Twilio, Google Calendar, Zoom, Microsoft Teams.

### 3. Integration Detail Dialog

**File: `src/components/integrations/IntegrationDetailDialog.tsx`**

Add all 6 new IDs to the `LINKED_INTEGRATIONS` array so clicking "Configure" opens the client selector.

### 4. Integration Card Connected Detection

**File: `src/pages/admin/IntegrationsPage.tsx`**

Update the `connectedIds` logic to detect the new integrations from tenant data (e.g., `teams_webhook_url`, `twilio_account_sid`, `hubspot`/`zendesk` in `crm_type`, etc.).

### 5. Client Select Dialog

**File: `src/components/integrations/ClientSelectDialog.tsx`**

Update `isConfiguredForTenant` to detect configuration for the 6 new integrations (CRM type match for HubSpot/Zendesk, field presence for Teams/Twilio/Zoom/Google Calendar).

### 6. Tenant Form Updates

**File: `src/components/tenants/TenantForm.tsx`**

- Add HubSpot and Zendesk to the CRM Type dropdown
- Add a new collapsible "Communication" section with Twilio fields (Account SID, Auth Token, From Number)
- Add a new collapsible "Scheduling" section with Zoom API Key and Google Calendar ID
- Add Teams Webhook URL to the existing Notifications section alongside Slack

### 7. TypeScript Types

**File: `src/types/database.ts`**

- Add `'hubspot' | 'zendesk'` to `CrmType`
- Add new fields to `Tenant` and `TenantFormData` interfaces

### 8. Edge Functions (6 new stubs)

Each edge function follows the existing `contacts/index.ts` pattern with CORS, tenant ID header, and placeholder logic:

| Function | Purpose |
|----------|---------|
| `supabase/functions/hubspot/index.ts` | Create contacts, deals, tickets, log calls in HubSpot |
| `supabase/functions/zendesk/index.ts` | Create tickets, contacts, log calls in Zendesk |
| `supabase/functions/twilio-sms/index.ts` | Send SMS confirmations and follow-ups |
| `supabase/functions/google-calendar/index.ts` | Create calendar events, check availability |
| `supabase/functions/zoom-meeting/index.ts` | Create Zoom meetings, generate invite links |
| `supabase/functions/teams-notify/index.ts` | Post messages to Microsoft Teams channels |

Each function accepts a POST with a JSON body containing tenant-specific credentials and payload, validates inputs, and returns a structured response. They are stubs that document the expected API calls without requiring live API keys yet.

### 9. Tenant Hook Updates

**File: `src/hooks/useTenants.ts`**

Ensure the create/update mutations include the new fields.

---

## Files Changed

| File | Change |
|------|--------|
| Database migration | Add 6 columns to tenants + 2 enum values to crm_type |
| `src/data/integrations-catalog.ts` | Change status to "available" for 6 integrations |
| `src/components/integrations/IntegrationDetailDialog.tsx` | Add 6 IDs to LINKED_INTEGRATIONS |
| `src/pages/admin/IntegrationsPage.tsx` | Update connectedIds detection |
| `src/components/integrations/ClientSelectDialog.tsx` | Update isConfiguredForTenant |
| `src/components/tenants/TenantForm.tsx` | Add HubSpot/Zendesk to CRM dropdown, add Communication + Scheduling sections |
| `src/types/database.ts` | Expand CrmType, Tenant, TenantFormData |
| `src/hooks/useTenants.ts` | Include new fields in mutations |
| `supabase/functions/hubspot/index.ts` | New edge function stub |
| `supabase/functions/zendesk/index.ts` | New edge function stub |
| `supabase/functions/twilio-sms/index.ts` | New edge function stub |
| `supabase/functions/google-calendar/index.ts` | New edge function stub |
| `supabase/functions/zoom-meeting/index.ts` | New edge function stub |
| `supabase/functions/teams-notify/index.ts` | New edge function stub |

