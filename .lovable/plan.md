

# Role-Based User Dashboard

## Current State

The building blocks are already in place:
- `user_permissions` table stores per-user, per-org permission grants
- `hasPermission()` in AuthContext checks permissions (owners/admins get everything)
- AdminLayout already filters the sidebar navigation based on permissions
- Settings page has a Team Members grid where admins toggle permissions per user

**What's missing**: A dedicated, simplified dashboard experience for non-admin members that adapts its landing view to their permissions (e.g., a supervisor sees agent stats front and center, a client manager sees client stats).

## What Will Be Built

### 1. User Dashboard Page

A new page at `/admin/dashboard` that renders a personalized home screen based on the logged-in user's permissions:

- **Agents-only users**: See agent stats (Total, Active, Pending, Deprovisioned), recent agent activity, and a quick-action button to provision a new agent
- **Clients-only users**: See client/tenant stats (Total, Active), recent client records, and a quick-action to add a new client
- **Both permissions**: See a combined view with both stat sections
- **Full admins/owners**: See everything (agents, clients, domains, integrations summary)

This page will query existing tables (`agents`, `tenants`) for stat counts and recent records.

### 2. Smart Landing Page Redirect

Update the admin index route so that:
- **Owners/Admins/Master Admins**: Land on the full dashboard (same as today -- TenantsPage or the new dashboard)
- **Members with limited permissions**: Land on `/admin/dashboard` which shows their personalized view

### 3. Dashboard Switcher Update

Update the DashboardSwitcher to show a "User Dashboard" option for non-admin members (instead of only showing the switcher for master admins). The switcher options become:
- **System Admin** (master admins only)
- **Admin Dashboard** (owners/admins)
- **My Dashboard** (all members -- their personalized view)

### 4. Sidebar Highlight

When a member lands on the User Dashboard, highlight it as the active item in the sidebar. Add a "My Dashboard" nav item at the top of the filtered navigation for non-admin members.

---

## Technical Details

### New File: `src/pages/admin/UserDashboardPage.tsx`

A new React component that:
- Uses `useAuth()` to get the current user's permissions
- Conditionally renders stat cards and recent-record tables based on `hasPermission("agents")` and `hasPermission("tenants")`
- Queries `agents` table for agent counts by status
- Queries `tenants` table for client counts by status
- Shows quick-action buttons that link to the relevant pages

### Modified File: `src/App.tsx`

- Add a new route: `<Route path="dashboard" element={<UserDashboardPage />} />`  inside the `/admin` layout

### Modified File: `src/components/layout/AdminLayout.tsx`

- Add a "My Dashboard" nav item at position 0 for non-admin members (permission: `null`, always visible)
- The href will be `/admin/dashboard`

### Modified File: `src/components/layout/DashboardSwitcher.tsx`

- Show the switcher for all authenticated users (not just master admins)
- For non-admin members: show "My Dashboard" (links to `/admin/dashboard`)
- For admins/owners: show "Admin Dashboard" (links to `/admin`)
- For master admins: keep existing "System Admin" + "Admin Dashboard" options

### Modified File: `src/components/auth/ProtectedRoute.tsx`

- Add logic: if a non-admin member navigates to `/admin` (the index), redirect them to `/admin/dashboard` instead

### No Database Changes

All data comes from existing `agents` and `tenants` tables with existing RLS policies.

### Files Changed

| File | Change |
|------|--------|
| `src/pages/admin/UserDashboardPage.tsx` | New -- personalized dashboard with permission-based stat cards |
| `src/App.tsx` | Add `/admin/dashboard` route |
| `src/components/layout/AdminLayout.tsx` | Add "My Dashboard" nav item for non-admin members |
| `src/components/layout/DashboardSwitcher.tsx` | Show switcher for all users, add "My Dashboard" option |
| `src/components/auth/ProtectedRoute.tsx` | Redirect non-admin members from `/admin` to `/admin/dashboard` |

