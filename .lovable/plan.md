

# Fix Master Admin Navigation Flow

## Problem Summary

The master admin (`pauljoseph@24hvirtual.com`) is correctly authenticated and the `master_admin` role is properly detected in the database. However, the user gets stuck in an infinite loading state on `/onboarding` because:

1. When accessing `/admin`, the `ProtectedRoute` detects no organization and redirects to `/onboarding`
2. The `OnboardingPage` requires `organization` to be present to render the form
3. Since master admin has no organization, the page shows a loading spinner forever

## Solution

Update the `ProtectedRoute` to skip the onboarding redirect for master admins, allowing them to access the `/master` dashboard directly.

---

## Changes Required

### 1. Update ProtectedRoute.tsx

Add master admin check to bypass organization requirement:

```typescript
// src/components/auth/ProtectedRoute.tsx
export function ProtectedRoute() {
  const { isAuthenticated, isLoading, organization, isMasterAdmin } = useAuth();
  const location = useLocation();

  if (isLoading) {
    // ... loading spinner
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Master admins can bypass organization requirement
  // They should access /master routes instead
  if (isMasterAdmin && !organization) {
    return <Navigate to="/master" replace />;
  }

  // If user is authenticated but has no organization, redirect to onboarding
  if (!organization && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
```

### 2. Update SystemAccessPage.tsx

The current flow is correct - it already redirects to `/master` on successful master admin login. No changes needed.

### 3. Update OnboardingPage.tsx (Optional Safety)

Add a check to redirect master admins away from onboarding:

```typescript
// At the top of OnboardingPage component
const { organization, user, isMasterAdmin } = useAuth();
const navigate = useNavigate();

// Redirect master admins to their dashboard
useEffect(() => {
  if (isMasterAdmin && !organization) {
    navigate("/master", { replace: true });
  }
}, [isMasterAdmin, organization, navigate]);
```

---

## Expected Flow After Fix

### Master Admin Login via /system-access
1. User navigates to `/system-access` (hidden URL)
2. Enters credentials for pauljoseph@24hvirtual.com
3. System validates master_admin role
4. Redirects to `/master` dashboard
5. Master admin can view all organizations, users, and system stats

### Regular User Login
1. User navigates to `/login`
2. Enters credentials
3. If no organization → redirects to `/onboarding`
4. If has organization → redirects to `/admin`

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/auth/ProtectedRoute.tsx` | Add `isMasterAdmin` check to bypass onboarding redirect |
| `src/pages/onboarding/OnboardingPage.tsx` | (Optional) Add safety redirect for master admins |

---

## Testing Plan

1. Navigate to `/system-access`
2. Login with pauljoseph@24hvirtual.com
3. Verify redirect to `/master` dashboard
4. Verify master dashboard shows platform stats (Organizations, Users, Domains, Tenants)
5. Navigate to `/master/organizations` - verify all orgs visible
6. Navigate to `/master/users` - verify all users visible

