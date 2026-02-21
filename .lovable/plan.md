

# Activate All Remaining Integrations

## Overview

Flip all 35 remaining "Coming Soon" integrations to "Available" status and wire them into the configuration flow. Rather than adding 35+ individual database columns, introduce a single flexible JSONB column (`integration_configs`) to store API keys and settings for all non-core integrations.

## Remaining Integrations (35 total)

**CRM / Practice Management (15):**
Jobber, Housecall Pro, Smokeball, MyCase, PracticePanther, Filevine, CosmoLex, Zoho CRM, Microsoft Dynamics 365, QuoteIQ, FieldPulse, ZenMaid, LEAP, Actionstep, AbacusLaw

**Communication / Messaging (2):**
RingCentral, Google Chat

**Productivity / Scheduling (4):**
Microsoft 365 (Outlook), OnceHub, Monday.com, LastPass, NordPass

**Document / Storage (4):**
OneDrive, Adobe Sign, HelloSign, NetDocuments

**Billing / Payments (1):**
LawPay

**AI / Legal Tech (7):**
Casetext, Spellbook, Harvey AI, Lexis+ AI, Darrow AI, Diligen, Westlaw, Fastcase

## What Changes

### 1. Database Migration

Add a single JSONB column to store all integration configs generically:

```sql
ALTER TABLE public.tenants 
  ADD COLUMN IF NOT EXISTS integration_configs jsonb DEFAULT '{}'::jsonb;
```

This stores keys like:
```json
{
  "jobber_api_key": "...",
  "ringcentral_api_key": "...",
  "lawpay_api_key": "...",
  "onedrive_api_key": "..."
}
```

### 2. Integration Catalog Updates

**File: `src/data/integrations-catalog.ts`**

Change `status` from `"coming_soon"` to `"available"` for all 35 integrations.

### 3. Integration Detail Dialog

**File: `src/components/integrations/IntegrationDetailDialog.tsx`**

Add all 35 IDs to the `LINKED_INTEGRATIONS` array.

### 4. Connected Detection Updates

**File: `src/pages/admin/IntegrationsPage.tsx`**

Update `connectedIds` to check the `integration_configs` JSONB column for each integration's config key.

### 5. Client Select Dialog

**File: `src/components/integrations/ClientSelectDialog.tsx`**

Add all 35 integration IDs to `INTEGRATION_FIELD_MAP` mapping to their respective keys in `integration_configs`.

### 6. TypeScript Types

**File: `src/types/database.ts`**

Add `integration_configs` to the `Tenant` interface as `Record<string, string>`.

### 7. Tenant Form Updates

**File: `src/components/tenants/TenantForm.tsx`**

Add new collapsible sections to group the remaining integrations:

- **Additional CRMs** section: API keys for Jobber, Housecall Pro, Smokeball, MyCase, PracticePanther, Filevine, CosmoLex, Zoho CRM, Dynamics 365, QuoteIQ, FieldPulse, ZenMaid, LEAP, Actionstep, AbacusLaw
- **Additional Communication** section: RingCentral, Google Chat
- **Additional Scheduling** section: Microsoft 365, OnceHub, Monday.com
- **Additional Documents** section: OneDrive, Adobe Sign, HelloSign, NetDocuments
- **Legal Billing** section: LawPay
- **AI / Legal Research** section: Casetext, Spellbook, Harvey AI, Lexis+ AI, Darrow AI, Diligen, Westlaw, Fastcase
- **Security / Passwords** section: LastPass, NordPass

Each field is a simple text input for the API key or webhook URL, stored in the `integration_configs` JSONB column.

### 8. Tenant Hook Updates

**File: `src/hooks/useTenants.ts`**

Include `integration_configs` in create/update mutations.

### 9. Edge Functions (35 new stubs)

Each follows the existing pattern (CORS headers, tenant ID header, action/payload body, stub response). They will be created as simple endpoint stubs:

| Category | Functions |
|----------|-----------|
| CRM | jobber, housecall-pro, smokeball, mycase, practicepanther, filevine, cosmolex, zoho-crm, dynamics-365, quoteiq, fieldpulse, zenmaid, leap, actionstep, abacuslaw |
| Communication | ringcentral, google-chat |
| Scheduling | oncehub, monday, lastpass, nordpass |
| Documents | onedrive, adobe-sign, hellosign, netdocuments |
| Billing | lawpay |
| AI/Legal | casetext, spellbook, harvey-ai, lexis-ai, darrow-ai, diligen, westlaw, fastcase |

Plus the microsoft-365 function if not already created.

---

## Files Changed

| File | Change |
|------|--------|
| Database migration | Add `integration_configs` JSONB column to tenants |
| `src/data/integrations-catalog.ts` | Change status to "available" for 35 integrations |
| `src/components/integrations/IntegrationDetailDialog.tsx` | Add 35 IDs to LINKED_INTEGRATIONS |
| `src/pages/admin/IntegrationsPage.tsx` | Update connectedIds to check integration_configs |
| `src/components/integrations/ClientSelectDialog.tsx` | Add 35 entries to INTEGRATION_FIELD_MAP |
| `src/components/tenants/TenantForm.tsx` | Add collapsible sections for all remaining integration config fields |
| `src/types/database.ts` | Add integration_configs to Tenant interface |
| `src/hooks/useTenants.ts` | Include integration_configs in mutations |
| 35 new edge function stubs | One per integration in `supabase/functions/` |

