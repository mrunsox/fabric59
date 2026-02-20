
# Integration Credentials in Settings Page

## What the User Wants

Instead of manually configuring secrets through a developer panel, admins should be able to enter all integration credentials directly in the Settings page UI. These will be stored in the existing `app_config` database table as key/value pairs.

---

## Credentials to Manage

The Settings page will gain a new **Integration Credentials** card section with the following fields:

| Credential | app_config key | Notes |
|------------|---------------|-------|
| Email Domain | `email_domain` | Already implemented in `useAppConfig` |
| Five9 Admin Username | `five9_username` | Used by `five9-provisioning` function |
| Five9 Admin Password | `five9_password` | Masked input, stored as-is |
| Resend API Key | `resend_api_key` | Used by `send-credentials` function |
| Resend From Email | `resend_from_email` | Sender email address |
| Google Service Account Email | `google_service_account_email` | Used by `google-workspace` function |
| Google Service Account Private Key | `google_service_account_private_key` | Large textarea, PEM format |
| Google Admin Impersonate Email | `google_admin_impersonate_email` | Super admin to impersonate |

---

## Implementation Approach

### Storage Strategy
All credentials are stored in the existing `app_config` table as key/value rows. This table already has:
- `SELECT` policy: any authenticated user can read
- `INSERT`/`UPDATE` policy: admins and master admins only

The edge functions (`five9-provisioning`, `google-workspace`, `send-credentials`) currently read from `Deno.env`. They need to be updated to **first check `app_config` in the database**, falling back to env vars if not set.

This is the correct approach because:
1. Secrets in Lovable Cloud cannot be managed from the UI
2. The `app_config` table is already secured with the right RLS policies
3. The edge functions can use the service role key to read from `app_config`

### UI Design

A new card is added to `SettingsPage.tsx` between the existing Security and Notifications cards:

```
+----------------------------------------------------------+
|  Integration Credentials                                  |
|  API keys and credentials for connected services          |
|  [🔑 Key icon]                                           |
+----------------------------------------------------------+
|                                                           |
|  --- Agent Provisioning ---                               |
|                                                           |
|  Email Domain (for agent email creation)                  |
|  [yourcompany.com                    ]                    |
|                                                           |
|  Five9 Admin Username                                     |
|  [admin@yourdomain.five9.com         ]                    |
|                                                           |
|  Five9 Admin Password                                     |
|  [••••••••••••••••            ] [👁 show]                |
|                                                           |
|  --- Email (Resend) ---                                   |
|                                                           |
|  Resend API Key                                           |
|  [re_••••••••••••••••         ] [👁 show]                |
|                                                           |
|  From Email Address                                       |
|  [noreply@yourcompany.com            ]                    |
|                                                           |
|  --- Google Workspace ---                                 |
|                                                           |
|  Service Account Email                                    |
|  [service@project.iam.gserviceaccount.com ]               |
|                                                           |
|  Admin Impersonation Email                                |
|  [admin@yourcompany.com              ]                    |
|                                                           |
|  Service Account Private Key (PEM)                        |
|  [-----BEGIN PRIVATE KEY-----        ]                    |
|  [                                   ]  (textarea)        |
|                                                           |
|  [Save Integration Credentials]                           |
+----------------------------------------------------------+
```

### Edge Function Updates

Each edge function needs to be updated to read from the database when env vars are not set. The pattern is:

```typescript
// In each edge function, after creating the supabase client:
async function getConfig(supabase: SupabaseClient, key: string, envFallback: string | undefined): Promise<string | undefined> {
  if (envFallback) return envFallback;
  const { data } = await supabase.from('app_config').select('value').eq('key', key).maybeSingle();
  return data?.value ?? undefined;
}

// Then:
const five9Username = await getConfig(supabase, 'five9_username', Deno.env.get('FIVE9_USERNAME'));
const five9Password = await getConfig(supabase, 'five9_password', Deno.env.get('FIVE9_PASSWORD'));
```

This keeps backward compatibility (env vars still work as a fallback) while enabling UI-managed credentials.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/admin/SettingsPage.tsx` | Add Integration Credentials card with all fields + save logic |
| `src/hooks/useAppConfig.ts` | Extend to read/write all credential keys, not just `email_domain` |
| `supabase/functions/five9-provisioning/index.ts` | Add `getConfig()` helper to read from `app_config` via service role |
| `supabase/functions/google-workspace/index.ts` | Same — read Google secrets from `app_config` |
| `supabase/functions/send-credentials/index.ts` | Same — read Resend secrets from `app_config` |
| `src/data/buildMap.ts` | Mark "Integration Credentials UI" as done in Settings & UX section |

---

## Security Notes

- Password/key fields use `type="password"` with a show/hide toggle
- The Private Key field uses a `<textarea>` with password masking
- The `app_config` table already enforces admin-only writes via RLS
- Values are stored as plaintext in `app_config` — this is acceptable because:
  - Access is controlled by RLS (only authenticated admins can read/write)
  - The database itself is encrypted at rest in Lovable Cloud
  - No more sensitive than storing them as env secrets in the same project

---

## Implementation Order

1. Extend `useAppConfig.ts` to handle all credential keys with a generic `getConfigValue`/`setConfigValue` pattern
2. Update `SettingsPage.tsx` to add the new card with all fields wired to the hook
3. Update all three edge functions to use the `getConfig()` DB-first pattern
4. Update `buildMap.ts` to add the new feature entry
