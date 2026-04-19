
The user wants Clio Deep Two-Way Sync built out — specifically the 10 capabilities shown in the uploaded image. Looking at existing code: `clio-oauth-callback` edge function already exists, `useClientIntegrationConfigs` already handles Clio config, and `legal-connect-sync-engine` is already in place.

The user said "this is what clio needs and it needs to be both way sync" — so they want all 10 features built. Clio requires OAuth credentials (CLIO_CLIENT_ID, CLIO_CLIENT_SECRET) which I should check are configured. The OAuth callback already references them.

Let me plan this concisely.

# Clio Deep Two-Way Sync — Full Build

Implements the 10 Clio capabilities from your screenshot, end-to-end, with bidirectional sync (Fabric59 ↔ Clio).

## Prerequisites Check
- `CLIO_CLIENT_ID` + `CLIO_CLIENT_SECRET` — already referenced by existing `clio-oauth-callback` function. I'll verify they're set; if not, I'll prompt you to add them before deploying.

## What Gets Built

### 1. Clio OAuth Connector (UI polish)
- "Connect Clio" button in Settings → Integrations (per-tenant), launches OAuth via existing `clio-oauth-callback`
- Shows connection status, connected account email, last refresh timestamp
- Disconnect button (revokes token, clears `oauthTokenId`)

### 2. Clio Test Connection
- "Test Connection" button → calls new edge function `clio-test-connection` → hits Clio `/users/who_am_i` → displays linked user, firm name, subscription tier

### 3. Contact Field Mapping UI
- New page `/admin/integrations/clio/mapping` with drag-drop field mapper (React Flow, reuses existing `visual-mapping-builder` pattern)
- Maps Fabric59 lead fields → Clio Contact fields (first_name, last_name, primary_email, primary_phone, custom_fields)
- Stored in `integration_configs.clio.fieldMappings`

### 4. Contact Sync to Clio (outbound)
- New edge function `clio-sync-contact`
- Triggered when lead reaches "Qualified" disposition (wired into existing post-call automation engine)
- Creates or updates Clio contact via `POST/PATCH /api/v4/contacts.json`
- Stores returned `clio_contact_id` on the lead row

### 5. Matter Creation in Clio
- New edge function `clio-create-matter`
- Triggered when lead hits configured pipeline stage (e.g. "Retainer Signed")
- Creates matter via `POST /api/v4/matters.json` with practice area, responsible attorney, client reference

### 6. Clio Matter ID Storage + Deep Link
- New columns on `legal_connect_intakes`: `clio_matter_id`, `clio_matter_url`
- UI shows "Open in Clio" button that deep-links to `https://app.clio.com/nc/#/matters/{id}`

### 7. Status Pull from Clio (inbound)
- New edge function `clio-pull-matter-status` (cron every 15 min, also on-demand)
- Pulls `status`, `pending_at`, `closed_at`, `next_court_date` from each tracked matter
- Updates local `legal_connect_intakes` (read-only mirror)

### 8. Billing Handoff to Clio
- New edge function `clio-push-billing`
- Pushes campaign/engagement summary to Clio as a `Bill` or `Activity` entry
- Triggered manually from Reporting page or auto on campaign close

### 9. Sync Audit Trail
- New table `clio_sync_log` (entity_type, entity_id, direction, action, payload, response, status, synced_by, synced_at)
- New page `/admin/integrations/clio/audit` with filterable log viewer

### 10. Reusable Connector Pattern
- Refactor sync logic into `supabase/functions/_shared/legal-crm-adapter.ts` with abstract interface (`syncContact`, `createMatter`, `pullStatus`, `pushBilling`)
- Clio implements the interface; future Lawmatics/Litify/CosmoLex adapters drop in without rewriting orchestration

## Two-Way Sync Architecture

```
Fabric59 ─── OUTBOUND ───▶ Clio
   ▲                        │
   │                     webhook + cron pull
   └─── INBOUND ──────────┘
```

- **Outbound** (Fabric59 → Clio): triggered by Five9 dispositions, stage changes, manual push
- **Inbound** (Clio → Fabric59): Clio webhooks (matter.updated, contact.updated) + 15-min cron status pull as fallback
- Conflict resolution: last-write-wins per field, with full audit log preserving every change

## Database Migrations
1. Add `clio_contact_id`, `clio_matter_id`, `clio_matter_url` columns to relevant tables
2. New table `clio_sync_log` (RLS scoped by org_id)
3. Extend `integration_configs.clio` JSONB schema: `fieldMappings`, `pipelineStageTriggers`, `lastSyncAt`

## Edge Functions (5 new)
- `clio-test-connection`
- `clio-sync-contact`
- `clio-create-matter`
- `clio-pull-matter-status` (cron)
- `clio-push-billing`
- `clio-webhook-handler` (inbound from Clio)

## New UI Pages/Components
- `src/pages/admin/ClioIntegrationPage.tsx` — connection card, test, disconnect
- `src/pages/admin/ClioFieldMappingPage.tsx` — visual field mapper
- `src/pages/admin/ClioAuditLogPage.tsx` — sync history
- `src/components/integrations/ClioConnectButton.tsx`
- `src/components/integrations/ClioMatterDeepLink.tsx`

## Files Edited
- `src/App.tsx` — add 3 Clio routes
- `src/data/buildMap.ts` — flip "Clio Deep Two-Way Sync" to `done` (and add the 10 sub-items as completed)
- `src/types/integrations.ts` — extend `ClioIntegrationConfig` with new fields
- `supabase/config.toml` — register new functions, add cron schedule for `clio-pull-matter-status`
- Existing post-call automation engine — wire Clio triggers

## Estimated Scope
~10 new files, ~6 edits, 3 migrations, 6 edge functions. The OAuth + token storage groundwork already exists.

## What I'll Verify First (Before Building)
1. `CLIO_CLIENT_ID` and `CLIO_CLIENT_SECRET` are set (if not, I'll request them)
2. Confirm Clio webhook subscription URL points to `clio-webhook-handler` (you'll register this in your Clio dev app once deployed)
