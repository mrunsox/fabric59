
# SaaS Architecture Transformation Plan

## Progress Tracker

### ✅ Phase A: Foundation (Database + Auth) - COMPLETE
1. ✅ Database migration: Created `organizations`, `organization_members`, `five9_domains` tables
2. ✅ Updated `tenants` with `five9_domain_id` and `organization_id`
3. ✅ Added new RLS policies with organization scoping
4. ✅ Created `is_org_member()` and `get_user_org_ids()` helper functions

### ✅ Phase B: Authentication - COMPLETE
5. ✅ Sign up page with organization creation (`/signup`)
6. ✅ Login page (`/login`)
7. ✅ Auth context provider (`AuthContext.tsx`)
8. ✅ Protected route wrapper (`ProtectedRoute.tsx`)
9. ✅ Onboarding flow (`/onboarding`)

### ✅ Phase C: Domain Management - COMPLETE
10. ✅ Five9 Domains page (list/add/edit)
11. ✅ Domain detail page with workflow settings
12. ✅ Updated navigation with Domains + org switcher

### ⬜ Phase D: Tenant Updates
13. ⬜ Update Tenant form to require domain selection
14. ⬜ Update Tenants page with domain filtering
15. ⬜ Update edge functions to validate domain context

### ⬜ Phase E: Polish
16. ⬜ Organization settings page
17. ⬜ Team member management
18. ⬜ Org switcher (for users in multiple orgs)

---

## Architecture Summary

```text
SaaS Platform
  └── Organization (Agency Account)
        └── Five9 Domain 1
        │     ├── Workflow Settings
        │     ├── Tenant A
        │     └── Tenant B
        │
        └── Five9 Domain 2
              └── Tenant C
```

## Database Schema

### Tables Created
- `organizations` - SaaS customer accounts with plan/status
- `organization_members` - User-org relationship with roles (owner/admin/member)
- `five9_domains` - Connected Five9 accounts with workflow settings
- `tenants` - Updated with `organization_id` and `five9_domain_id`

### RLS Functions
- `is_org_member(_user_id, _org_id)` - Check if user belongs to org
- `get_user_org_ids(_user_id)` - Get all org IDs for a user

### Security Model
- Platform admins can see all data (existing `has_role()`)
- Org members can only see their organization's data
- Org owners/admins can manage domains and tenants
- Org members have read-only access

## Files Created/Modified

### Phase A
- `supabase/migrations/` - Database schema + RLS policies
- `src/types/database.ts` - New TypeScript types
- `src/hooks/useTenants.ts` - Updated for new fields
- `src/hooks/useDomains.ts` - Five9 domains CRUD
- `src/hooks/useOrganization.ts` - Organization management

### Phase B
- `src/contexts/AuthContext.tsx` - Auth + org context
- `src/components/auth/ProtectedRoute.tsx` - Route protection
- `src/pages/auth/LoginPage.tsx` - Login form
- `src/pages/auth/SignupPage.tsx` - Signup + org creation
- `src/pages/onboarding/OnboardingPage.tsx` - First-time setup
- `src/App.tsx` - Updated routes
