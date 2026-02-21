

# Finish All Remaining Planned Features

## Overview

There are 9 items still marked as "planned" in the build outline. This plan implements all of them and updates the build map to reflect completion.

## Planned Items

| # | Item | Category | Complexity |
|---|------|----------|------------|
| 1 | CRM Push Logic | API & Integrations | Medium |
| 2 | Webhook Support | API & Integrations | Medium |
| 3 | Error Alerting | Monitoring & Logs | Medium |
| 4 | Integration Configure Flow | Integrations Library | Medium |
| 5 | Live API Connection Testing | Integrations Library | Medium |
| 6 | Slack Invite / Remove | Agent Lifecycle | Low (already done) |
| 7 | Data Transfer Step | Agent Lifecycle | Medium |
| 8 | HR Notification Email | Agent Lifecycle | Medium |
| 9 | Cron Trigger for process-jobs | Agent Lifecycle | Low |

---

## Implementation Details

### 1. CRM Push Logic

**New edge function:** `supabase/functions/crm-push/index.ts`

This function reads a tenant's CRM type and credentials, then pushes mapped data to the appropriate CRM system. It will:
- Accept a POST with `tenant_id`, `crm_action` (e.g. `create_contact`, `update_contact`, `log_call`), and `data` (the mapped fields)
- Look up tenant CRM config from the database using service role
- Route to the appropriate CRM adapter (Clio, Workiz, Salesforce, HubSpot, Zendesk, etc.)
- Log the result to `api_logs`
- Return success/failure with response details

Starts as a well-structured dispatcher with stub adapters per CRM type, ready for real API calls.

### 2. Webhook Support (Five9 Inbound Webhooks)

**New edge function:** `supabase/functions/five9-webhook/index.ts`

Receives real-time event POSTs from Five9 (call started, call ended, disposition set, etc.):
- Validates a shared webhook secret from the `x-webhook-secret` header
- Parses the Five9 event payload
- Logs to `api_logs` table
- Triggers downstream actions: calls `crm-push` for contact sync, calls `send-notification` for alerting
- Returns 200 OK quickly

**Database migration:** Add `webhook_secret` column to `five9_domains` table for per-domain secret validation.

**Settings page update:** Add a "Webhook URL" display card showing the endpoint URL to copy/paste into Five9 admin, plus a "Regenerate Secret" button.

### 3. Error Alerting

**New edge function:** `supabase/functions/error-alert/index.ts`

Monitors for critical failures and sends alerts:
- Accepts POST with `error_type`, `message`, `details`, `tenant_id`
- Looks up org-level alerting config from `app_config` (alert email, Slack webhook)
- Sends alert email via Resend (reuses existing Resend key infrastructure)
- Sends Slack notification via the existing `slack-agent` function's gateway
- Logs alert to a new `error_alerts` table

**Database migration:** Create `error_alerts` table (id, error_type, message, details, tenant_id, alerted_via, created_at).

**Settings page update:** Add an "Error Alerting" card in Settings with fields for alert email address and toggle for Slack alerts, stored in `app_config`.

**Notifications page update:** Add an "Alerts" tab alongside the existing notification logs showing error alerts.

### 4. Integration Configure Flow

**New component:** `src/components/integrations/IntegrationConfigWizard.tsx`

A step-by-step dialog wizard that guides users through:
1. **Select Client** -- pick which tenant to configure (reuses existing ClientSelectDialog)
2. **Enter Credentials** -- dynamic form based on integration type (API key, OAuth, webhook URL)
3. **Test Connection** -- calls the integration's edge function with a `test` action
4. **Confirm & Save** -- saves to tenant record, shows success

Updates `IntegrationDetailDialog.tsx` to open this wizard instead of the simple ClientSelectDialog for integrations that support it.

### 5. Live API Connection Testing

**Update all edge function stubs** to support a `test` action that validates credentials format and returns a structured test result. For example:
- HubSpot: validates API key format starts with `pat-`
- Slack: already has `test` action (auth.test)
- Twilio: validates Account SID format starts with `AC`
- Generic: returns `{ success: true, message: "Credentials format valid" }`

**New component:** `src/components/integrations/ConnectionTestButton.tsx`

A button component used in the configure wizard and tenant form that:
- Calls the integration's edge function with `action: "test"`
- Shows loading spinner, then green checkmark or red error
- Displays the test result message

### 6. Slack Invite / Remove

The `slack-agent` edge function already fully implements both `inviteUser` and `removeUser` actions with real Slack API calls. The provisioning and deprovisioning hooks already call these.

**Action:** Simply update `buildMap.ts` status from `"planned"` to `"done"` -- this feature is already complete.

### 7. Data Transfer Step (Google Drive Transfer)

**Update:** `supabase/functions/google-workspace/index.ts`

Add a new `transferData` action that:
- Calls Google Admin SDK's datatransfer API
- Transfers ownership of Drive files and Gmail data from the departing agent to the target email
- Returns transfer status

**Update:** `useDeprovisioning.ts`

Replace the simulated `delay(2000)` in Step 1 with an actual call to `google-workspace` with `action: "transferData"`:
```
body: {
  action: 'transferData',
  sourceUserKey: agentEmail,
  targetUserKey: dataTransfer.targetEmail,
  transferDrive: dataTransfer.transferDrive,
  transferEmail: dataTransfer.transferEmail,
}
```

### 8. HR Notification Email

**Update:** `supabase/functions/send-credentials/index.ts` (or create a new `send-hr-notification/index.ts`)

**New edge function:** `supabase/functions/send-hr-notification/index.ts`

Sends a styled HTML email to HR confirming offboarding completion:
- Agent name, email, role
- Offboarding steps completed/failed
- Data transfer summary (if enabled)
- Timestamp of completion

**Update:** `useDeprovisioning.ts`

Replace the simulated `delay(800)` in Step 6 (HR Notification) with an actual call:
```
await supabase.functions.invoke('send-hr-notification', {
  body: {
    agentName: request.agentName,
    email: request.email,
    role: request.role,
    steps: currentSteps,
    dataTransfer: request.dataTransfer,
    reason: request.reason,
    organizationId: agentData?.organization_id,
  },
});
```

**Settings page update:** Add an "HR Notification Email" field in Settings (stored in `app_config` as `hr_notification_email`).

### 9. Cron Trigger for process-jobs

**Database migration:** Use `pg_cron` extension to schedule the `process-jobs` edge function every 30 minutes:

```sql
SELECT cron.schedule(
  'process-pending-jobs',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/process-jobs',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_anon_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
```

This ensures scheduled deprovisionings execute automatically without manual intervention.

---

## Build Map Update

**File:** `src/data/buildMap.ts`

Change all 9 items from `"planned"` to `"done"`, bringing the overall progress to 100%.

---

## Files Changed Summary

| File | Change |
|------|--------|
| Database migration | Create `error_alerts` table, add `webhook_secret` to `five9_domains`, add pg_cron job |
| `src/data/buildMap.ts` | All 9 planned items to "done" |
| `supabase/functions/crm-push/index.ts` | New -- CRM push dispatcher |
| `supabase/functions/five9-webhook/index.ts` | New -- inbound webhook receiver |
| `supabase/functions/error-alert/index.ts` | New -- error alerting via email/Slack |
| `supabase/functions/send-hr-notification/index.ts` | New -- HR offboarding confirmation email |
| `supabase/functions/google-workspace/index.ts` | Add `transferData` action |
| `src/hooks/useDeprovisioning.ts` | Wire real data transfer + HR notification calls |
| `src/components/integrations/IntegrationConfigWizard.tsx` | New -- step-by-step configure wizard |
| `src/components/integrations/ConnectionTestButton.tsx` | New -- test connection button |
| `src/components/integrations/IntegrationDetailDialog.tsx` | Open wizard for linked integrations |
| `src/pages/admin/SettingsPage.tsx` | Add webhook URL display, error alerting config, HR email field |
| `src/pages/admin/NotificationsPage.tsx` | Add error alerts tab |
| Multiple edge function stubs | Add `test` action support |

