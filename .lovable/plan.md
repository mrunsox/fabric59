

# Fix Missing "Team" Tab in Settings

## Root Cause

The "Team" tab visibility is controlled by:
```
const isOrgAdmin = membership?.role === "owner" || membership?.role === "admin";
```

This only checks the `membership` object, which can be `null` in two scenarios:
1. The user is a master/platform admin without an explicit org membership row
2. The membership data hasn't loaded yet (race condition between `loadOrganizations` and `checkMasterAdmin`)

Your account has `role: admin` in the `user_roles` table (platform admin) but the code doesn't factor `isMasterAdmin` into the `isOrgAdmin` check.

## Fix

**File: `src/pages/admin/SettingsPage.tsx`**

Update the `isOrgAdmin` calculation to also include `isMasterAdmin`:

```typescript
// Before
const { organization, membership, user } = useAuth();
const isOrgAdmin = membership?.role === "owner" || membership?.role === "admin";

// After
const { organization, membership, user, isMasterAdmin } = useAuth();
const isOrgAdmin = isMasterAdmin || membership?.role === "owner" || membership?.role === "admin";
```

This single-line change ensures that platform admins and master admins always see the Team tab, regardless of whether their `membership` object has loaded or exists.

## Files Changed

| File | Change |
|------|--------|
| `src/pages/admin/SettingsPage.tsx` | Add `isMasterAdmin` to destructuring and include it in `isOrgAdmin` check |
