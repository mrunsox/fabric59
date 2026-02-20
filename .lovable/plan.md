
# Update "Add Domain" Dialog to Match Onboarding Form

## The Problem

The "Connect Five9 Domain" dialog on the Admin → Five9 Domains page (`DomainsPage.tsx`) is out of sync with the updated onboarding flow. It still shows the old two-field form (Five9 Domain + Display Name), while onboarding was updated to collect **Display Name + Five9 Admin Username + Admin Password** and auto-derive the domain.

## What Changes

**File: `src/pages/admin/DomainsPage.tsx`**

### Form Fields

Remove the old `Five9 Domain` input entirely. Replace with the same three fields as onboarding:

1. **Display Name** — required (same as before)
2. **Five9 Admin Username** — required, new
3. **Admin Password** — required, new (with show/hide toggle)

### State Variables

Remove:
- `newDomain` state

Add:
- `five9Username` state
- `five9Password` state
- `showPassword` state (for the eye toggle)
- `connectionStatus` state: `"idle" | "testing" | "success" | "failed"`
- `connectionMessage` state

### Submit Logic (`handleAddDomain`)

Match the onboarding `handleCreateDomain` pattern exactly:

```
1. Derive domain from five9Username.split('@')[1] or slugify display name
2. Insert into five9_domains with five9_username + five9_password_encrypted
3. Show inline testing state inside the dialog
4. Call test-five9-connection edge function
5. On success → show green success + close dialog after 1.5s
6. On failure → show error + "Try Different Credentials" / "Save Anyway" buttons
```

### Dialog UI States

The dialog will have two visual states:

**State 1 — Form (default)**
```
┌──────────────────────────────────────────┐
│  Connect Five9 Domain                    │
│  Sign in with your Five9 admin account   │
│                                          │
│  Display Name                            │
│  [Main Call Center                    ]  │
│                                          │
│  Five9 Admin Username                    │
│  [admin@yourcompany.com               ]  │
│                                          │
│  Admin Password                          │
│  [••••••••••••••                     👁]│
│                                          │
│  [Cancel]              [Connect Domain]  │
└──────────────────────────────────────────┘
```

**State 2 — Testing / Result (after submit)**
```
┌──────────────────────────────────────────┐
│  🔌  Verifying Connection                │
│  Connecting to Five9 Admin Web Services  │
│                                          │
│   [spinner] Authenticating...            │  ← testing
│   ✅ Connected successfully              │  ← success
│   ❌ Authentication failed               │  ← failed                     │
│                                          │
│  [Try Again]    [Save Anyway]            │  ← only on failure
└──────────────────────────────────────────┘
```

### Dialog Description Update

Change from:
> "Add a new Five9 domain to your organization"

To:
> "Sign in with your Five9 admin account to connect your domain"

### Imports to Add

- `Eye`, `EyeOff`, `Wifi`, `CheckCircle`, `XCircle` from `lucide-react`
- `cn` from `@/lib/utils`

### Reset on Close

When the dialog closes (either by Cancel, success auto-close, or X button), reset all state: `newDisplayName`, `five9Username`, `five9Password`, `connectionStatus`, `connectionMessage`, `showPassword`.

## Files to Modify

| File | Change |
|---|---|
| `src/pages/admin/DomainsPage.tsx` | Replace dialog form fields, add credential state + connection test logic |

No edge function changes needed — `test-five9-connection` already handles this. No database migration needed — `five9_username` and `five9_password_encrypted` columns already exist.
