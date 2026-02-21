

# Build Out 10 More Integrations

## Overview

Activate 10 more integrations from "Coming Soon" to "Available" status, spanning Billing, Document/Storage, Productivity/Scheduling, Workflow Automation, and AI categories. Each gets a catalog upgrade, edge function stub, and where applicable, new tenant configuration fields.

## Selected Integrations

| # | Integration | Category | Needs Tenant Fields? |
|---|------------|----------|---------------------|
| 1 | Stripe | Billing / Payments | Yes (API key) |
| 2 | QuickBooks Online | Billing / Payments | Yes (API key) |
| 3 | Calendly | Productivity / Scheduling | Yes (API key) |
| 4 | DocuSign | Document / Storage | Yes (API key) |
| 5 | Google Drive | Document / Storage | No (reuses Google Calendar OAuth) |
| 6 | Dropbox | Document / Storage | Yes (API key) |
| 7 | Microsoft 365 (Outlook) | Productivity / Scheduling | Yes (API key) |
| 8 | Asana | Productivity / Scheduling | Yes (API key) |
| 9 | OpenAI / ChatGPT | AI / Legal Tech | Yes (API key) |
| 10 | Power Automate | Workflow Automation | Yes (webhook URL) |

## What Changes

### 1. Database Migration

Add new columns to the `tenants` table:

```sql
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS stripe_api_key text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS quickbooks_api_key text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS calendly_api_key text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS docusign_api_key text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS dropbox_api_key text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS microsoft365_api_key text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS asana_api_key text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS openai_api_key text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS power_automate_webhook_url text;
```

### 2. Integration Catalog Updates

**File: `src/data/integrations-catalog.ts`**

Change status from `"coming_soon"` to `"available"` for all 10 integrations.

### 3. Integration Detail Dialog

**File: `src/components/integrations/IntegrationDetailDialog.tsx`**

Add all 10 IDs to the `LINKED_INTEGRATIONS` array so "Configure" opens the client selector.

### 4. Connected Detection Updates

**File: `src/pages/admin/IntegrationsPage.tsx`**

Update `connectedIds` logic to detect the new integrations from tenant data.

### 5. Client Select Dialog

**File: `src/components/integrations/ClientSelectDialog.tsx`**

Add the 10 new integration IDs to `INTEGRATION_FIELD_MAP` so "Configured" badges appear.

### 6. Tenant Form Updates

**File: `src/components/tenants/TenantForm.tsx`**

Add three new collapsible sections:
- **Billing** section: Stripe API Key, QuickBooks API Key
- **Documents and E-Signature** section: DocuSign API Key, Dropbox API Key
- **AI and Productivity** section: OpenAI API Key, Asana API Key, Calendly API Key, Microsoft 365 API Key

Add Power Automate Webhook URL to the existing Automation/Webhook section.

### 7. TypeScript Types

**File: `src/types/database.ts`**

Add the 9 new fields to `Tenant` and `TenantFormData` interfaces.

### 8. Tenant Hook Updates

**File: `src/hooks/useTenants.ts`**

Include new fields in create/update mutations.

### 9. Edge Functions (10 new stubs)

Each follows the existing pattern (CORS, tenant ID header, action/payload body):

| Function | Purpose |
|----------|---------|
| `supabase/functions/stripe-payments/index.ts` | Create payment links, process payments |
| `supabase/functions/quickbooks/index.ts` | Create invoices, log time entries |
| `supabase/functions/calendly/index.ts` | Create scheduling links, check availability |
| `supabase/functions/docusign/index.ts` | Send envelopes for e-signature |
| `supabase/functions/google-drive/index.ts` | Upload files, create folders |
| `supabase/functions/dropbox/index.ts` | Upload files, share documents |
| `supabase/functions/microsoft365/index.ts` | Create calendar events, send emails |
| `supabase/functions/asana/index.ts` | Create tasks, assign follow-ups |
| `supabase/functions/openai/index.ts` | Summarize calls, draft follow-ups, extract entities |
| `supabase/functions/power-automate/index.ts` | Trigger flows on Five9 events |

---

## Files Changed

| File | Change |
|------|--------|
| Database migration | Add 9 columns to tenants table |
| `src/data/integrations-catalog.ts` | Change status to "available" for 10 integrations |
| `src/components/integrations/IntegrationDetailDialog.tsx` | Add 10 IDs to LINKED_INTEGRATIONS |
| `src/pages/admin/IntegrationsPage.tsx` | Update connectedIds detection |
| `src/components/integrations/ClientSelectDialog.tsx` | Add 10 entries to INTEGRATION_FIELD_MAP |
| `src/components/tenants/TenantForm.tsx` | Add Billing, Documents, AI/Productivity sections |
| `src/types/database.ts` | Add 9 new fields to Tenant and TenantFormData |
| `src/hooks/useTenants.ts` | Include new fields in mutations |
| `supabase/functions/stripe-payments/index.ts` | New edge function stub |
| `supabase/functions/quickbooks/index.ts` | New edge function stub |
| `supabase/functions/calendly/index.ts` | New edge function stub |
| `supabase/functions/docusign/index.ts` | New edge function stub |
| `supabase/functions/google-drive/index.ts` | New edge function stub |
| `supabase/functions/dropbox/index.ts` | New edge function stub |
| `supabase/functions/microsoft365/index.ts` | New edge function stub |
| `supabase/functions/asana/index.ts` | New edge function stub |
| `supabase/functions/openai/index.ts` | New edge function stub |
| `supabase/functions/power-automate/index.ts` | New edge function stub |

