

# Plug-and-Play CRM Integration Wizard

## What Exists Today

The current `TenantForm.tsx` (1176 lines) has a basic "CRM Integration Rules" collapsible at the bottom with simple toggle/checkbox UI for Clio and MyCase rules. The `five9-main` edge function and `clio-oauth-callback` are already implemented with the full handler logic. The `oauth_tokens`, `clio_mappings`, and `mycase_mappings` tables exist with RLS.

What's missing is the polished "plug-and-play" wizard UX described in the prompt: connection status badges, OAuth connect buttons, profile presets, Five9 webhook setup card, and the overall "3 cards" layout.

## Plan

### 1. New Component: `CrmIntegrationWizard.tsx`

Replace the current basic "CRM Integration Rules" collapsible in `TenantForm.tsx` with a dedicated component that renders **3 cards** inside a collapsible section:

**Card A: Five9 Webhook Setup**
- Toggle: "Enable Five9 integration for this client"
- Read-only field: Webhook URL (`https://<project-url>/functions/v1/five9-main`)
- Read-only field: Tenant ID (the tenant's UUID, for `x-tenant-id` header)
- Input: Webhook secret (auto-generate button + manual input)
- Copy-to-clipboard buttons for URL, tenant ID, and secret
- Instructions text about pasting into Five9 Workflow Automation

**Card B: Clio Connection**
- Toggle: "Enable Clio integration"
- Status badge: "Not connected" / "Connected" (based on whether `integration_configs.clio.oauthTokenId` exists and `oauth_tokens` row is present)
- "Connect Clio" button that initiates OAuth redirect to Clio authorize URL (constructs URL with `CLIO_CLIENT_ID`, redirect URI, and state containing tenant/org IDs)
- Profile dropdown with 6 presets:
  - "Intake-Heavy PI Firm" — auto contacts + matters for Intake, time entries on
  - "Conservative" — log only, no auto-create
  - "Solo Generalist" — auto contacts, no auto matters
  - "High-Volume" — auto everything
  - "Family Law" — auto for Family Intake only
  - "Super Safe" — log only when contact exists
- Override toggles (shown below profile, prefilled from preset):
  - Auto-create contacts
  - Auto-create matters
  - Queues allowed (multi-input, free-text tags)
  - Attach to latest open matter
  - Fallback to contact-only
  - Create billable time entries

**Card C: MyCase Connection**
- Toggle: "Enable MyCase integration"
- Status badge: "Not connected" / "Connected"
- "Connect MyCase" button — opens a small inline form to paste API key (v1), stored into `integration_configs.mycase.apiKeyId`
- Profile dropdown with 6 presets (same pattern, minus time entries)
- Override toggles (same as Clio minus billable time)

All presets are hardcoded JSON maps. When user selects a preset, toggles update to match. Manual toggle changes mark the profile as "Custom". Everything serializes into `integration_configs` JSONB on save.

### 2. Profile Presets Data

Create a small data file `src/data/crm-profiles.ts` with the 6 Clio and 6 MyCase preset definitions as typed objects matching `Five9ToCrmRules`.

### 3. Update `TenantForm.tsx`

- Remove the existing "CRM Integration Rules" collapsible (lines 1075-1166)
- Replace with `<CrmIntegrationWizard tenantId={tenant?.id} configs={form.watch("integration_configs")} onChange={(configs) => form.setValue("integration_configs", configs)} />`
- Remove the now-unused CRM rule helper functions (lines 151-225)

### 4. Webhook Secret Generation

Add a `crypto.randomUUID()` based secret generator in the wizard. When "Generate" is clicked, populate the webhook secret field and update the integration_configs for the appropriate CRM.

### 5. Build Outline Update

Add items to `buildMap.ts` for the wizard UI work.

## File Changes

| File | Change |
|---|---|
| `src/data/crm-profiles.ts` | New — preset definitions for 6 Clio + 6 MyCase profiles |
| `src/components/tenants/CrmIntegrationWizard.tsx` | New — 3-card wizard component with Five9 setup, Clio connect, MyCase connect |
| `src/components/tenants/TenantForm.tsx` | Replace CRM Integration Rules section with CrmIntegrationWizard |
| `src/data/buildMap.ts` | Add wizard UI items |

