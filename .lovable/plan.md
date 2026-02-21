

# Post-Interview Implementation Phase for Alex

## Problem

After Alex finishes the 6-step interview and generates the call flow config summary, nothing happens. The conversation dead-ends. Alex should transition into an **implementation phase** where it saves the config and asks the user for any missing credentials (CRM API keys, Slack webhook URLs, etc.).

---

## Solution

### 1. Extend System Prompt with Implementation Phase

**File: `supabase/functions/ai-call-flow/index.ts`**

After the summary generation step, add a new phase to the prompt:

- **Step 7: Save Config** -- Alex presents the summary and asks: "Ready to save this configuration? Provide a client name or select an existing one." with options: 1. Create new client, 2. Apply to existing client
- **Step 8: Collect Credentials** -- Based on the chosen CRM and notification channels, Alex asks for the specific credentials needed:
  - If CRM is Clio: "I need your Clio API key and API URL."
  - If CRM is Workiz: "I need your Workiz API token and base URL."
  - If Salesforce/HubSpot: respective credentials
  - If Slack notifications selected: "I need your Slack webhook URL."
  - If webhook selected: "I need the webhook endpoint URL."
  - Alex asks for ONE credential at a time, not all at once
- **Step 9: Confirmation** -- Alex confirms everything is saved and provides a summary of what was configured, with a link/suggestion to go to the Mappings page to fine-tune field mappings

The prompt will instruct Alex to output a special JSON block (wrapped in a code fence tagged `:::SAVE_CONFIG:::`) when the user confirms saving. This block contains the structured config data the frontend can parse and save to the database.

### 2. Frontend: Detect and Handle Save Actions

**File: `src/pages/admin/CallFlowBuilderPage.tsx`**

- Add a detection function that scans each streamed assistant message for the `:::SAVE_CONFIG:::` marker
- When detected, parse the JSON payload containing: `{ client_name, crm_type, crm_api_key, crm_api_url, slack_webhook_url, webhook_url, notification_triggers, custom_mappings }`
- Call a save function that either:
  - Creates a new tenant row via `supabase.from('tenants').insert(...)` 
  - Or updates an existing tenant via `supabase.from('tenants').update(...)`
- Show a success toast: "Configuration saved for [client name]"
- After saving, render an inline action bar below the message with buttons: "View Client", "Edit Mappings", "Start Over"

### 3. Credential Input Security

- Credentials typed into the chat (API keys, webhook URLs) are sent to the AI but are only used for saving to the database -- they are NOT stored in the AI conversation history beyond the current session
- The save operation writes directly to the `tenants` table which has RLS policies
- No new edge function needed -- the frontend handles the DB write using the existing Supabase client

### 4. Action Buttons After Save

**File: `src/pages/admin/CallFlowBuilderPage.tsx`**

- Detect when a message contains "Configuration saved" or the save confirmation pattern
- Render action buttons below that message:
  - "View Client" -- navigates to `/admin/tenants`
  - "Edit Mappings" -- navigates to `/admin/mappings`
  - "Build Another" -- triggers `handleStartOver()`

---

## Technical Details

### Save Config JSON Format (emitted by AI in code fence)

```text
:::SAVE_CONFIG:::
{
  "client_name": "Smith & Associates",
  "crm_type": "clio",
  "pre_call": ["CRM lookup", "Screen pop"],
  "during_call": ["Contact info", "Case details", "Disposition codes"],
  "post_call": ["Create CRM record", "Slack notification", "Email summary"],
  "notifications": ["Slack", "Email"],
  "crm_api_key": "...",
  "crm_api_url": "...",
  "slack_webhook_url": "...",
  "webhook_url": "..."
}
:::END_CONFIG:::
```

### CRM Type Mapping

The tenants table uses an enum `crm_type`. Alex's CRM options map to:
- Clio -> `clio`
- Workiz -> `workiz`
- Salesforce -> `salesforce`
- HubSpot -> `hubspot`
- Other/None -> `other`

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/ai-call-flow/index.ts` | Add steps 7-9 to system prompt (implementation phase) |
| `src/pages/admin/CallFlowBuilderPage.tsx` | Add config save detection, DB write logic, post-save action buttons |

### No New Tables or Migrations

All data saves to the existing `tenants` table which already has `crm_type`, `crm_api_key`, `crm_api_url`, `slack_webhook_url`, `webhook_url`, `notification_triggers`, and `custom_mappings` columns.

