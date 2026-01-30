

# Add Workflow Automation Platform Integrations

## Overview

Add the ability for tenants to connect with popular workflow automation platforms (Pabbly Connect, Zapier, Make, and n8n) to extend Fabric59's capabilities. This enables users to trigger automations when events occur (new intakes, call endings, contact updates) and receive data in their preferred workflow tool.

---

## Current Architecture

The system already has:
- **Slack webhook support** per tenant with trigger-based notifications
- **send-notification edge function** that sends to Slack when events occur
- **Tenant-level configuration** for webhooks and notification triggers
- **Events supported**: `intake_created`, `call_ended`, `contact_updated`

---

## What We'll Build

### 1. Database Schema Updates

Add new columns to the `tenants` table to store automation webhook URLs:

| Column | Type | Description |
|--------|------|-------------|
| `zapier_webhook_url` | text | Zapier Zap webhook URL |
| `make_webhook_url` | text | Make (Integromat) webhook URL |
| `pabbly_webhook_url` | text | Pabbly Connect webhook URL |
| `n8n_webhook_url` | text | n8n workflow webhook URL |

### 2. UI: Automations Section in Tenant Form

Add a new collapsible "Workflow Automations" section in the TenantForm with:
- Input fields for each platform's webhook URL
- Visual icons/branding for each platform
- Per-platform toggle to enable/disable triggers
- Helpful descriptions for each platform

### 3. Edge Function: Universal Webhook Dispatcher

Extend the `send-notification` function to dispatch to all configured webhook platforms when events occur:

```text
Event Triggered (e.g., intake_created)
         |
         v
+------------------+
| send-notification|
+------------------+
         |
         +---> Slack (existing)
         +---> Zapier (new)
         +---> Make (new)
         +---> Pabbly Connect (new)
         +---> n8n (new)
```

### 4. Payload Format

All platforms will receive the same standardized payload:

```json
{
  "event": "intake_created",
  "tenant_id": "uuid",
  "tenant_name": "Law Firm Alpha",
  "timestamp": "2026-01-30T12:00:00Z",
  "data": {
    "contact": {
      "name": "John Doe",
      "phone": "+1234567890",
      "email": "john@example.com"
    },
    "intake": {
      "type": "consultation",
      "service": "Personal Injury",
      "urgency": "high"
    }
  }
}
```

---

## Implementation Steps

### Step 1: Database Migration

Add new webhook columns to the tenants table:

```sql
ALTER TABLE public.tenants
ADD COLUMN zapier_webhook_url text,
ADD COLUMN make_webhook_url text,
ADD COLUMN pabbly_webhook_url text,
ADD COLUMN n8n_webhook_url text;
```

### Step 2: Update TypeScript Types

Extend `Tenant` and `TenantFormData` types in `src/types/database.ts`:

```typescript
export interface Tenant {
  // ... existing fields
  zapier_webhook_url: string | null;
  make_webhook_url: string | null;
  pabbly_webhook_url: string | null;
  n8n_webhook_url: string | null;
}
```

### Step 3: Update TenantForm Component

Add new "Workflow Automations" collapsible section with:
- Platform logos/icons
- Webhook URL inputs for each platform
- Description text explaining how to get webhook URLs
- Enable/disable toggles

### Step 4: Extend send-notification Edge Function

Update the function to:
1. Fetch all webhook URLs from tenant record
2. Send to each configured webhook in parallel
3. Log each dispatch attempt with the platform name
4. Handle failures gracefully (one failure doesn't block others)

### Step 5: Add Notification Logging

Extend the `notification_channel` enum to include new platforms:

```sql
ALTER TYPE notification_channel ADD VALUE 'zapier';
ALTER TYPE notification_channel ADD VALUE 'make';
ALTER TYPE notification_channel ADD VALUE 'pabbly';
ALTER TYPE notification_channel ADD VALUE 'n8n';
ALTER TYPE notification_channel ADD VALUE 'webhook';
```

---

## Files to Create/Modify

| File | Changes |
|------|---------|
| `src/types/database.ts` | Add new webhook URL fields to types |
| `src/components/tenants/TenantForm.tsx` | Add automations section with webhook inputs |
| `supabase/functions/send-notification/index.ts` | Dispatch to all configured webhooks |
| Database migration | Add new columns and enum values |

---

## User Experience

### Tenant Configuration Flow

1. Open tenant edit dialog
2. Expand "Workflow Automations" section
3. Paste webhook URL for desired platform(s)
4. Enable triggers for desired events
5. Save - automations are immediately active

### Platform-Specific Instructions

For each platform, include helper text:

**Zapier**: "Create a Zap with 'Webhooks by Zapier' as the trigger. Copy the webhook URL here."

**Make**: "Create a scenario with 'Webhooks' module. Copy the webhook URL here."

**Pabbly Connect**: "Create a workflow with 'Webhook' trigger. Copy the webhook URL here."

**n8n**: "Add a Webhook node to your workflow. Copy the webhook URL here."

---

## Technical Details

### Webhook Dispatch Logic

```typescript
async function dispatchToWebhooks(
  tenant: TenantWithWebhooks,
  event: string,
  payload: EventPayload
): Promise<DispatchResults> {
  const webhooks = [
    { platform: 'slack', url: tenant.slack_webhook_url },
    { platform: 'zapier', url: tenant.zapier_webhook_url },
    { platform: 'make', url: tenant.make_webhook_url },
    { platform: 'pabbly', url: tenant.pabbly_webhook_url },
    { platform: 'n8n', url: tenant.n8n_webhook_url },
  ].filter(w => w.url);

  const results = await Promise.allSettled(
    webhooks.map(w => sendWebhook(w.platform, w.url, event, payload))
  );

  return results;
}
```

### Slack vs Generic Webhook Format

- **Slack**: Uses existing formatted message with attachments
- **Generic webhooks** (Zapier, Make, Pabbly, n8n): Use standardized JSON payload

---

## Summary

This implementation adds support for four major workflow automation platforms:
1. **Zapier** - Most popular, great for non-technical users
2. **Make (Integromat)** - Visual workflow builder with advanced features
3. **Pabbly Connect** - Cost-effective alternative with one-time pricing
4. **n8n** - Open-source, self-hostable option

All platforms receive the same event data, allowing tenants to choose their preferred automation tool or use multiple simultaneously.

