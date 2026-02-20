
# Remove the Five9 Domain Field + Make Credentials Mandatory

## What Changes

The "Connect your Five9 Domain" step currently has 4 fields:
1. **Five9 Domain** (yourcompany.five9.com) — REMOVE THIS
2. Display Name — keep, required
3. Five9 Admin Username — keep, make **required**
4. Admin Password — keep, make **required**

Remove the "API Credentials (optional)" separator label — credentials are now mandatory, not optional. Update the card description to reflect logging in with an admin account.

## The `domain` Column Problem

The `five9_domains.domain` column is `NOT NULL` in the database. Since we're removing the field from the UI, the value needs to come from somewhere automatically. The cleanest approach: **derive the domain from the admin username email**.

- If the username is `paul.joseph@24hvirtual.com`, the stored domain becomes `24hvirtual.com`
- If the username has no `@`, fall back to the display name (slugified)

This is done in the `handleCreateDomain` function before the insert — no DB migration needed.

## File to Modify

**`src/pages/onboarding/OnboardingPage.tsx`**

Changes:
1. Remove the `domain` state variable (no longer needed as user input)
2. Remove the "Five9 Domain" input field from the form
3. Remove the "API Credentials (optional)" separator — replace with just a clean divider or nothing
4. Add `required` to `five9Username` and `five9Password` inputs
5. Update `handleCreateDomain` to derive `domain` from `five9Username.split('@')[1]` before insert
6. Update the card subtitle from "Enter your Five9 domain to start routing calls" to "Sign in with your Five9 admin account to connect your domain"

## Updated Form Layout

```text
┌─────────────────────────────────────────┐
│  🌐  Connect your Five9 Domain          │
│  Sign in with your Five9 admin account  │
│                                         │
│  Display Name                           │
│  [Main Call Center                   ]  │
│  A friendly name to identify this domain│
│                                         │
│  Five9 Admin Username                   │
│  [admin@yourcompany.com              ]  │
│                                         │
│  Admin Password                         │
│  [••••••••••••••••••••••••         👁] │
│  Used to sync agent skills and skills   │
│                                         │
│  [→  Connect Domain                  ]  │
└─────────────────────────────────────────┘
```

No database migration required — the `domain` field is still stored, just derived automatically from the username email rather than entered manually.
