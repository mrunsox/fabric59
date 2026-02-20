
# Three Improvements: Secrets, Error Messages & Google deleteUser

## Overview

This plan covers three coordinated changes:

1. **FIVE9_USERNAME + FIVE9_PASSWORD secrets** — Add them as backend secrets so the `five9-provisioning` edge function works for agent onboarding, and surface a clear "Setup Required" banner in Settings if they're missing.
2. **Better SOAP error messages** in the Connect Domain dialog — distinguish authentication failures vs. permission/AdminWebService access failures.
3. **Google deleteUser wiring** — Already implemented in `useDeprovisioning.ts` (steps 4 & 5 call `google-workspace` with `suspendUser` then `deleteUser`). The Google Workspace edge function (`google-workspace/index.ts`) already handles the `deleteUser` action. **This is already wired correctly** — no code changes needed here.

---

## Change 1: Add FIVE9_USERNAME + FIVE9_PASSWORD Secrets

### What & Why

The `five9-provisioning` edge function calls `getConfig('five9_username', Deno.env.get('FIVE9_USERNAME'))`. It checks the env secret first, then falls back to `app_config` in the database.

The Settings page already lets admins save `five9_username` and `five9_password` to `app_config` — so the database fallback path is already working. No secret needs to be added to the edge function environment itself unless the user wants the env-level override.

**What to add to Settings page:** A visible "Integration Status" panel that checks if `five9_username` and `five9_password` exist in `app_config` and shows a warning banner if they're missing, with a direct link to the Five9 credentials section.

### Files to Modify

- `src/pages/admin/SettingsPage.tsx` — Add a status banner at the top of the Integration Credentials card showing which credentials are missing/configured, with green checkmarks or orange warnings per service.

### Status Banner Design

```
┌─────────────────────────────────────────────────────────┐
│ Integration Status                                      │
│                                                         │
│  ✅ Five9 Admin API       Configured                    │
│  ⚠️  Email (Resend)       API key missing               │
│  ✅ Google Workspace      Configured                    │
│  ✅ Slack                 Connected via connector        │
└─────────────────────────────────────────────────────────┘
```

---

## Change 2: Better SOAP Error Messages in the Connect Domain Dialog

### What & Why

Currently, `test-five9-connection/index.ts` catches SOAP faults and returns the raw fault string: `"Five9 API error: Fault occurred while processing"`. This is unhelpful.

Five9 SOAP faults have two distinct root causes:
- **Wrong credentials** — Five9 returns HTTP 401 (already handled) or a SOAP Fault with message like "Fault occurred while processing" when Basic Auth is rejected at the SOAP level.
- **No AdminWebService permission** — Five9 returns a SOAP Fault with a message like "User does not have permission" or the generic fault when the account lacks the Admin API role.

### Fix in `supabase/functions/test-five9-connection/index.ts`

Enhance the SOAP fault section to detect the fault type and return a more specific `errorType` field:

```typescript
// Enhanced fault classification
let errorType: "auth" | "permission" | "unknown" = "unknown";
let friendlyMessage = `Five9 API error: ${faultMessage}`;

if (
  faultMessage.toLowerCase().includes("fault occurred while processing") ||
  faultMessage.toLowerCase().includes("authentication") ||
  faultMessage.toLowerCase().includes("invalid credentials") ||
  soapResponse.status === 401
) {
  errorType = "auth";
  friendlyMessage = "Authentication failed — wrong username or password.";
} else if (
  faultMessage.toLowerCase().includes("permission") ||
  faultMessage.toLowerCase().includes("not authorized") ||
  faultMessage.toLowerCase().includes("access denied")
) {
  errorType = "permission";
  friendlyMessage = "Connected, but this account lacks AdminWebService API permission. Ask your Five9 admin to enable it.";
}

return { success: false, status: "failed", message: friendlyMessage, errorType }
```

### Fix in `src/pages/admin/DomainsPage.tsx`

Update the "failed" state UI to show the specific error type with contextual help text:

```
┌──────────────────────────────────────────────────────────────┐
│  ❌  Authentication Failed                                   │
│                                                              │
│  Wrong username or password. Double-check your Five9         │
│  admin credentials and try again.                            │
│                                                              │
│  [Try Different Credentials]         [Save Anyway]           │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  ❌  Permission Denied                                       │
│                                                              │
│  Credentials are correct but this account doesn't have       │
│  AdminWebService API access. Ask your Five9 admin to         │
│  enable it for this user account.                            │
│                                                              │
│  [Try Different Credentials]         [Save Anyway]           │
└──────────────────────────────────────────────────────────────┘
```

---

## Change 3: Google deleteUser — Already Wired

After reviewing `useDeprovisioning.ts` lines 157–193, the Google `suspendUser` and `deleteUser` calls are **already implemented and wired**:

- Step 4 (`google-suspension`) calls `google-workspace` with `action: 'suspendUser'`
- Step 5 (`google-deletion`) calls `google-workspace` with `action: 'deleteUser'`

The `google-workspace/index.ts` edge function already handles `deleteUser`. No code changes needed.

**What IS needed** is that the Google Workspace credentials are configured in Settings (service account email, impersonation email, private key PEM). The status banner from Change 1 will surface this clearly.

---

## Technical Summary of Files Changed

| File | What Changes |
|---|---|
| `src/pages/admin/SettingsPage.tsx` | Add Integration Status banner with per-service check/warning indicators |
| `supabase/functions/test-five9-connection/index.ts` | Classify SOAP faults into `auth` vs `permission` error types with friendly messages |
| `src/pages/admin/DomainsPage.tsx` | Show error-type-specific failure UI and help text in the connect dialog |

No database migrations needed. No new secrets needed (Five9 credentials go through Settings → `app_config`).
