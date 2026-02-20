
# Slack Integration + Settings Connector Panel

## Current State

- **Slack**: No Slack connection in the workspace. No `slack-agent` edge function exists. Both `useProvisioning.ts` (step 3) and `useDeprovisioning.ts` (step 3) have `await delay(1200)` stubs that immediately mark Slack steps as complete without doing anything real.
- **Settings page**: Has sections for Five9, Resend/Email, and Google Workspace credentials but no Slack section at all.
- **AGENT_ROLES**: Already has `slackChannels` arrays per role (e.g. `['#english-support', '#all-agents']`) — ready to use.
- **agents table**: Already has a `slack_user_id` column ready to be populated.

---

## Step 1 — Connect Slack Workspace

Before any code runs, the Slack connector must be linked to this project via the Lovable connector gateway. This will make `SLACK_API_KEY` and `LOVABLE_API_KEY` available as edge function environment variables.

The user will be prompted to authorize their Slack workspace via OAuth. The bot will be automatically present in all public channels.

---

## Step 2 — New Edge Function: `supabase/functions/slack-agent/index.ts`

A self-contained Deno edge function that handles two actions via the connector gateway at `https://connector-gateway.lovable.dev/slack/api`.

**`inviteUser` action** (called during onboarding):
1. `POST /users.lookupByEmail` with agent email → get Slack `user_id`
2. For each channel name in `channels[]`: resolve channel name → ID via `GET /conversations.list`, then `POST /conversations.invite`
3. If user not found in Slack workspace: post a notification message to `#all-agents` (or first available channel) saying the agent has been onboarded and needs a Slack invite
4. Returns `{ success: true, slackUserId }` or `{ success: false, error, notFound: true }`

**`removeUser` action** (called during offboarding):
1. `POST /users.lookupByEmail` → get Slack `user_id` (or use stored `slack_user_id` from agent record)
2. `GET /users.conversations?user={userId}` → list all channels the user is in
3. `POST /conversations.kick` for each channel
4. Graceful degradation — if user not found in Slack, treat as `skipped` (not error)

**Channel name→ID resolution**: Uses `conversations.list` with pagination to build a `name→id` map. Caches nothing (stateless function), just resolves on each call.

**config.toml**: Add `[functions.slack-agent]` with `verify_jwt = false`.

---

## Step 3 — Replace Stubs in `useProvisioning.ts`

Replace lines 79–82 (Slack stub) with a real invoke:

```typescript
// Step 3 — Slack invitation (real)
updateStep('slack-invitation', { status: 'active' });
try {
  const { data: slackData } = await supabase.functions.invoke('slack-agent', {
    body: {
      action: 'inviteUser',
      email,
      agentName: input.agentName,
      channels: input.role.slackChannels,
    },
  });
  updateStep('slack-invitation', {
    status: slackData?.success ? 'complete' : 'error',
    errorMessage: slackData?.error,
  });
  // Store slack_user_id so offboarding can use it later
  if (slackData?.slackUserId) {
    slackUserId = slackData.slackUserId;
  }
} catch {
  updateStep('slack-invitation', { status: 'error', errorMessage: 'Slack unavailable' });
}
```

Also add `slackUserId` to the `agents` insert so it's persisted for offboarding.

---

## Step 4 — Replace Stub in `useDeprovisioning.ts`

Replace lines 139–142 (Slack stub) with:

```typescript
// Step 3 — Slack removal (real)
updateStep('slack-removal', { status: 'active' });
try {
  const { data: slackData } = await supabase.functions.invoke('slack-agent', {
    body: {
      action: 'removeUser',
      email: agentData?.email || request.email,
      slackUserId: agentData?.slack_user_id || undefined,
    },
  });
  updateStep('slack-removal', {
    status: (slackData?.success || slackData?.skipped) ? 'complete' : 'error',
    errorMessage: slackData?.error,
  });
} catch {
  updateStep('slack-removal', { status: 'error', errorMessage: 'Slack unavailable' });
}
```

---

## Step 5 — Add Slack Section to `SettingsPage.tsx`

Add a new **Slack Integration** card below the Google Workspace section in the Integration Credentials card. This card will:

- Show the Slack connection **status** (connected / not connected) by checking if `SLACK_API_KEY` is available — the edge function can expose a `status` check action, or we simply show a static "Connected via Lovable Connector" badge once the connection is linked
- Show the **bot display name** being used (fetch from `auth.test` Slack API call)
- Show a **channel mapping table** — read-only list of each role and its assigned Slack channels pulled from `AGENT_ROLES`
- Provide a **"Test Connection"** button that calls the `slack-agent` function with `action: 'test'` which calls Slack's `auth.test` endpoint and returns workspace name + bot name
- Show a **"Reconnect Slack"** link/button that opens the Lovable connector settings if the token is invalid

The Slack section sits inside the existing "Integration Credentials" card under a new `<Separator />` after Google Workspace, with the same visual pattern (label in muted uppercase, content below).

---

## Files to Create/Modify

| File | Action | Change |
|------|--------|--------|
| `supabase/functions/slack-agent/index.ts` | Create | New Slack edge function — `inviteUser`, `removeUser`, `test` actions via connector gateway |
| `supabase/config.toml` | Modify | Add `[functions.slack-agent]` with `verify_jwt = false` |
| `src/hooks/useProvisioning.ts` | Modify | Replace Slack stub with real `slack-agent` invoke; save `slack_user_id` |
| `src/hooks/useDeprovisioning.ts` | Modify | Replace Slack stub with real `slack-agent` invoke using stored `slack_user_id` |
| `src/pages/admin/SettingsPage.tsx` | Modify | Add Slack Integration section with connection status, channel mapping, and test button |

---

## Important Notes

- The Slack connector uses a **bot token** — the bot is auto-present in all public channels, so no manual channel invites for the bot are needed
- `conversations.invite` invites a **user** to a channel (the bot invites the agent) — this works for public channels automatically
- If the agent does not yet have a Slack account (common for new hires), the function gracefully falls back to posting a `#all-agents` notification rather than failing
- Offboarding `conversations.kick` silently succeeds even if the user isn't in the channel
- The `slack_user_id` stored during onboarding speeds up offboarding by skipping the email lookup step

---

## Sequence: First Run

1. User clicks "Connect Slack" prompt → authorizes workspace → `SLACK_API_KEY` becomes available
2. Edge function deployed automatically
3. During next agent provision → Slack step calls `inviteUser` → real result shown in stepper
4. During offboarding → Slack step calls `removeUser` → real result shown in stepper
5. Settings page shows Slack status badge + channel mapping table
