
# Fix: "Add Domain" Button Hidden for Master Admin Users

## Root Cause

In `DomainsPage.tsx` line 71:

```typescript
const canManage = orgRole === "owner" || orgRole === "admin";
```

This only checks `orgRole` from the user's org membership. When a **master admin** accesses the Domains page, they have no `membership` record in the org (they access orgs from the top level), so `orgRole` is `null` — meaning `canManage` evaluates to `false` and both the "Add Domain" button in the header and the "Add your first domain" button in the empty state are hidden.

## The Fix

Pull `isMasterAdmin` and `isLoading` from `useAuth` and include it in the `canManage` check:

```typescript
const { organization, orgRole, isMasterAdmin, isLoading } = useAuth();

const canManage = isLoading ? false : (orgRole === "owner" || orgRole === "admin" || isMasterAdmin);
```

This ensures:
- While auth is still loading → button stays hidden (no flash of wrong state)
- Master admins → always see the Add Domain button
- Org owners/admins → see the Add Domain button as before
- Regular members → still cannot see the button

## File to Modify

| File | Change |
|---|---|
| `src/pages/admin/DomainsPage.tsx` | Add `isMasterAdmin` and `isLoading` to `useAuth()` destructure; update `canManage` to include `isMasterAdmin` |

One-line fix, no database changes, no new components needed.
