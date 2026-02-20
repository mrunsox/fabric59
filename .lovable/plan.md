
# Fix: test-five9-connection Uses Wrong API Version (v2 vs v13)

## Root Cause — Definitive

The `test-five9-connection` edge function calls Five9's **v2** endpoint:
```
https://api.five9.com/wsadmin/v2/AdminWebService
```

The `five9-provisioning` edge function (which works, fetching 67 live extensions) calls Five9's **v13** endpoint:
```
https://api.five9.com/wsadmin/v13/AdminWebService
```

Both functions have correct username normalization (hyphen → space). The credentials are correct — confirmed by the working `five9-provisioning` test. The v2 endpoint is either deprecated or has different authentication behavior, causing it to reject the same credentials that v13 accepts without issue.

This is why:
- Fetching extensions / users via `five9-provisioning` (v13) works perfectly
- "Test Connection" in the Add Domain dialog (which calls `test-five9-connection` → v2) fails with "Authentication Failed"

## The Fix

One-line change in `supabase/functions/test-five9-connection/index.ts` — update the SOAP URL from v2 to v13:

```typescript
// Before (line 92)
const soapResponse = await fetch("https://api.five9.com/wsadmin/v2/AdminWebService", {

// After
const soapResponse = await fetch("https://api.five9.com/wsadmin/v13/AdminWebService", {
```

## Why This Is Safe

- v13 is the same endpoint already proven to authenticate and respond correctly with these credentials
- The SOAP body (`getContactFields`) is a valid v13 call — the namespace `xmlns:ser="http://service.admin.ws.five9.com/"` is the same across all versions
- No credential changes. No database changes. No new secrets
- The function logic (fault detection, status update, error classification) remains identical

## File to Modify

| File | Change |
|---|---|
| `supabase/functions/test-five9-connection/index.ts` | Change SOAP URL from `v2` to `v13` on line 92 |

The edge function redeploys automatically.
