

# Fix Navigation Race Condition and Verify Mapping Builder

## Problem Identified

After completing onboarding, users cannot access the admin dashboard because:
1. `ProtectedRoute` checks `!organization` before `loadOrganizations` completes
2. The `isLoading` flag becomes `false` before organization data is available
3. This causes a redirect loop back to `/onboarding`

---

## Solution

Update the AuthContext to properly track organization loading state separately from auth loading state, and update ProtectedRoute to wait for both.

### Step 1: Update AuthContext

Add a separate `isOrgLoading` state to track organization data loading:

```typescript
// New state
const [isOrgLoading, setIsOrgLoading] = useState(true);

// In loadOrganizations
const loadOrganizations = async (userId: string) => {
  setIsOrgLoading(true);
  try {
    // ... existing logic
  } finally {
    setIsOrgLoading(false);
  }
};

// Export combined loading state
isLoading: isAuthLoading || isOrgLoading,
```

### Step 2: Update ProtectedRoute

Change the redirect logic to handle the case where organization is still loading:

```typescript
// Wait for BOTH auth and org to finish loading
if (isLoading) {
  return <Loader2 ... />;
}

// Only redirect if we've finished loading and still have no org
if (!organization && location.pathname !== "/onboarding") {
  return <Navigate to="/onboarding" replace />;
}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/contexts/AuthContext.tsx` | Add `isOrgLoading` state, don't set `isLoading` to false until org loads |
| `src/components/auth/ProtectedRoute.tsx` | No changes needed if AuthContext is fixed |

---

## Implementation Details

### AuthContext Changes

```typescript
// Add new state
const [isAuthLoading, setIsAuthLoading] = useState(true);
const [isOrgLoading, setIsOrgLoading] = useState(true);

// Update loadOrganizations
const loadOrganizations = async (userId: string) => {
  setIsOrgLoading(true);
  try {
    // ... existing code ...
  } catch (error) {
    console.error("Error loading organizations:", error);
  } finally {
    setIsOrgLoading(false);
  }
};

// In auth state change handler
if (currentSession?.user) {
  loadOrganizations(currentSession.user.id);
  checkMasterAdmin(currentSession.user.id);
} else {
  setOrganizations([]);
  setOrganization(null);
  setMembership(null);
  setIsMasterAdmin(false);
  setIsOrgLoading(false); // Not loading if no user
}
setIsAuthLoading(false);

// Export combined isLoading
isLoading: isAuthLoading || isOrgLoading,
```

---

## After Fix: Test Plan

1. Complete onboarding with a test account
2. Verify user is redirected to `/admin` successfully
3. Navigate to **Field Mappings** page
4. Click **Create Visual Mapping** button
5. Verify the React Flow canvas loads with:
   - Left panel showing Five9 fields
   - Right panel showing CRM fields (Clio)
   - Center canvas for drag-and-drop connections
6. Test creating a field mapping between Five9 and Clio fields

---

## Summary

The navigation issue is caused by a race condition where `isLoading` becomes false before organization data finishes loading. By tracking organization loading separately and ensuring both complete before proceeding, users will be able to access the admin dashboard after onboarding.

