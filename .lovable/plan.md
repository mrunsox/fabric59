
# Dashboard Switcher for pauljoseph@24hvirtual.com

## Current Situation

Paul (`pauljoseph@24hvirtual.com`) is confirmed as `master_admin` in the database but has **zero organization memberships**. This means:

- He can access `/master` (System Admin dashboard) fine
- When he tries to visit `/admin`, `ProtectedRoute` detects `isMasterAdmin && !organization` and immediately redirects him back to `/master`
- He is effectively locked out of the Admin (Organization) dashboard

## Goal

Give Paul frictionless access to **both** dashboards with a visible switcher — so he can jump between "System Admin" and "Admin" views without signing in/out or manually editing the URL.

---

## What Needs to Change

### 1. Fix `ProtectedRoute` — Allow Master Admins into `/admin`

Currently:
```
if (isMasterAdmin && !organization) → redirect to /master
```

The fix: remove this block entirely. Master admins **should** be allowed to pass through to `/admin` — they will simply see the admin dashboard without an organization context (which is fine since they have full DB access via RLS).

**File:** `src/components/auth/ProtectedRoute.tsx`

### 2. Update `AuthContext` — Master Admins Can Load Orgs

Right now, `loadOrganizations` is only called for the current user's memberships. Paul has none, so `organization` stays `null`. We need to allow Paul to optionally load **all** organizations (for the org picker in AdminLayout). This is already possible since master admins can SELECT all orgs via RLS.

We'll add a `loadAllOrganizationsForMasterAdmin()` path in `AuthContext` that fetches all orgs when `isMasterAdmin === true` and the user has no memberships. This lets Paul pick an org from the switcher in AdminLayout and operate in that context.

**File:** `src/contexts/AuthContext.tsx`

### 3. Add Dashboard Switcher to Both Layouts

A `DashboardSwitcher` component visible only to master admins, placed in the sidebar footer of both `AdminLayout` and `MasterLayout`. It renders two buttons:

```
┌─────────────────────────────────┐
│ Switch Dashboard                 │
│  [⚙ System Admin]  [🏢 Admin]  │
└─────────────────────────────────┘
```

- Active dashboard is highlighted
- Inactive one is a clickable link

**New file:** `src/components/layout/DashboardSwitcher.tsx`

### 4. Integrate Switcher into Both Layouts

- `MasterLayout.tsx` — add `<DashboardSwitcher current="master" />` in the sidebar footer above the sign-out button
- `AdminLayout.tsx` — add `<DashboardSwitcher current="admin" />` in the sidebar footer, visible only when `isMasterAdmin` is true

---

## Technical Details

### ProtectedRoute change (simple)
Remove the redirect block:
```tsx
// REMOVE THIS:
if (isMasterAdmin && !organization) {
  return <Navigate to="/master" replace />;
}
```
Master admins will land on `/admin` without an org. The AdminLayout already handles `organization?.name` gracefully with `|| "Loading..."` fallback, so no crash.

### AuthContext change
In `loadOrganizations`, after checking memberships — if the user is a master admin and has no memberships, fetch all orgs from the `organizations` table and set them as available choices. Paul can then pick one from the org switcher in AdminLayout.

```typescript
// After memberships check — if master_admin and no memberships:
if (!memberships || memberships.length === 0) {
  const isMaster = await checkMasterAdmin(userId); // already runs separately
  if (isMaster) {
    const { data: allOrgs } = await supabase.from("organizations").select("*");
    // set allOrgs as available organizations so the switcher populates
  }
}
```

Since master admins already have SELECT on all organizations via RLS (`Master admin can manage all organizations` policy), this query will succeed.

### DashboardSwitcher Component
```tsx
// src/components/layout/DashboardSwitcher.tsx
interface Props { current: "master" | "admin" }

// Renders two pill buttons using react-router Link
// Only shown when isMasterAdmin === true
```

---

## Files to Modify/Create

| File | Change |
|------|--------|
| `src/components/auth/ProtectedRoute.tsx` | Remove master admin redirect block |
| `src/contexts/AuthContext.tsx` | Load all orgs when master admin has no memberships |
| `src/components/layout/DashboardSwitcher.tsx` | New component — dashboard toggle buttons |
| `src/components/layout/MasterLayout.tsx` | Add `<DashboardSwitcher current="master" />` |
| `src/components/layout/AdminLayout.tsx` | Add `<DashboardSwitcher current="admin" />` |

---

## User Experience After This Change

1. Paul logs in → lands on `/admin` (or `/master`, same as before, depending on where he came from)
2. In either sidebar he sees a "Switch Dashboard" section with two buttons
3. Clicking "System Admin" takes him to `/master`
4. Clicking "Admin" takes him to `/admin` — now allowed without crashing
5. The org switcher in AdminLayout will be pre-populated with all organizations so Paul can select which org context to browse under
