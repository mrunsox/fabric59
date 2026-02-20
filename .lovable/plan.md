
# Fix: Apply Username Normalization to five9-provisioning

## Root Cause

The hyphen-to-space normalization fix was only applied to `supabase/functions/test-five9-connection/index.ts` previously. The `five9-provisioning/index.ts` function passes `FIVE9_USERNAME` directly into `btoa()` with zero transformation:

```typescript
// Line 41 — no normalization applied
const credentials = btoa(`${username}:${password}`);
```

So if the `FIVE9_USERNAME` secret contains `"24H-Virtual"` (with a hyphen) instead of `"24H Virtual"` (with a space), every single SOAP call this function makes — creating users, fetching all users, getting skills, deactivating users — fails with a Five9 authentication fault.

## The Fix

Apply the same normalization logic inside `soapCall()`, immediately before `btoa()`:

```typescript
// Normalize: non-email Five9 usernames (e.g. "24H-Virtual") may have hyphens
// instead of spaces. Replace hyphens with spaces for non-email usernames only.
const normalizedUsername = username.includes("@")
  ? username
  : username.replace(/-/g, " ");

const credentials = btoa(`${normalizedUsername}:${password}`);
```

This is identical to the fix already applied in `test-five9-connection/index.ts` at the same point in the auth flow.

## Why this is safe

- Email-format usernames (containing `@`) are untouched — hyphens in the domain part of an email address are valid and must not be altered.
- Non-email usernames (e.g. `"24H-Virtual"`, `"John-Smith"`) have hyphens replaced with spaces, matching Five9's expected format.
- The normalization only affects the in-flight Basic Auth header — nothing written back to the database or secrets store.
- This is a one-line logical change inside `soapCall()`, so it applies automatically to every action (`create`, `deactivate`, `getAllUsers`, `getSkills`, `addSkillsToUser`, `getUserInfo`, `getExtensions`) without any other changes.

## File to Modify

| File | Change |
|---|---|
| `supabase/functions/five9-provisioning/index.ts` | Add username normalization inside `soapCall()` before `btoa()` on line 41 |

No frontend changes. No database changes. No new secrets. No migration needed. The edge function will be redeployed automatically.
