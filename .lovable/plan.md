
# Fix: Hyphen Instead of Space in Five9 Username

## Root Cause

The issue has two contributing factors:

### Factor 1 — The `derivedDomain` fallback uses hyphens

In `DomainsPage.tsx` line 100–102:
```typescript
const derivedDomain = five9Username.includes("@")
  ? five9Username.split("@")[1]
  : newDisplayName.toLowerCase().replace(/\s+/g, "-");
```

When the username does **not** contain `@` (i.e., Five9 usernames in `Firstname Lastname` format like `"John Smith"`), this code derives the domain slug from the display name using `.replace(/\s+/g, "-")`. This is only used for the `domain` column — not the username — **but** it signals that the form doesn't properly guide non-email username formats.

### Factor 2 — The stored username may already be mangled

If a previous "Add Domain" attempt stored a username with a hyphen (e.g., `"john-smith"` instead of `"john smith"`), the `test-five9-connection` edge function reads it back from the database and sends it as-is via Basic Auth, causing Five9 to reject it with `"Fault occurred while processing"`.

### The Fix: Two-pronged

**1. Sanitize the username in the edge function** — strip any hyphens that appear where spaces should be in non-email usernames. Since email usernames contain `@`, any username without `@` that has a hyphen is likely a mangled space. Apply `username.replace(/-/g, ' ')` for non-email usernames only.

**2. Fix the stored username in the database** — add a note in the form UI clarifying the format, and ensure the username is trimmed before saving.

**3. Normalize username before `btoa()`** — in `test-five9-connection/index.ts`, normalize the username right before it's used for SOAP auth.

## Files to Modify

| File | Change |
|---|---|
| `supabase/functions/test-five9-connection/index.ts` | Normalize username: if it doesn't contain `@`, replace hyphens with spaces before the SOAP call |
| `src/pages/admin/DomainsPage.tsx` | Trim the username before saving, add helper text clarifying format (e.g., `"John Smith"` not `"john-smith"`) |

## The Normalization Logic

In `test-five9-connection/index.ts`, right after computing `testUsername`:

```typescript
const testUsername = username || domain.five9_username;

// Normalize: Five9 usernames with spaces are sometimes stored with hyphens
// Only apply to non-email usernames (emails contain @)
const normalizedUsername = testUsername.includes("@")
  ? testUsername
  : testUsername.replace(/-/g, " ");
```

Then use `normalizedUsername` in the SOAP `Authorization` header instead of `testUsername`.

This is a safe transformation because:
- Email-format usernames (containing `@`) are left untouched
- Non-email usernames (e.g. `"john-smith"`) get hyphens replaced with spaces (`"john smith"`)
- The change only affects the in-flight SOAP call, not what's stored in the database

## Also: Fix What's Already Stored

The domain currently in the database likely has `five9_username = "john-smith"` (hyphenated). The user can correct this via **Domain Settings → API Credentials tab** — updating the username field to `"john smith"` (with a space) and clicking "Save Credentials". The normalization fix in the edge function covers the existing stored value immediately without requiring manual correction, but we should also add the fix there.

## No Database Migration Required

This is a pure code fix. No schema changes, no new tables, no new secrets.
