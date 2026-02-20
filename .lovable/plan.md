
# Fixes: Three Issues

## Issue 1 — Navigation Orientation (No Code Change Needed)

The app already has an "Agents" tab in the left sidebar linking to `/admin/agents`. Integration Credentials are on the **Settings page** (`/admin/settings`) — scroll down to the "Integration Credentials" card with the key icon.

This will be documented in a quick-help banner on the Settings page so it's easier to find.

## Issue 2 — Five9 Username Field Accepts Any Text (Not Just Email)

**File:** `src/pages/admin/DomainDetailPage.tsx` — line 317

The username input field currently uses `type="email"`, which forces browser email validation and auto-correct. Five9 SOAP API accepts usernames in any format (often plain username strings, not emails). Fix: change to `type="text"` and update the placeholder/helper text to reflect this.

Additionally, the "Add Domain" dialog on `DomainsPage.tsx` only collects domain name and display name — no username/password at create time, which is correct (those go on the detail page). No change needed there.

## Issue 3 — Organization Tab / Users Management — Nothing is Clickable

**File:** `src/pages/master/OrganizationsOverviewPage.tsx` and `src/pages/master/UsersManagementPage.tsx`

Both master admin pages are currently read-only tables with no interactive elements. The rows show user UUIDs, org names, and roles — but nothing can be clicked, managed, or acted upon.

**Fix:** Add clickable row functionality and action buttons:

- **Organizations page**: Each row gets a "View Members" action that expands inline or links to a detail view. Add the ability to change an organization's plan/status. Make rows visually feel clickable (cursor-pointer, hover highlight).

- **Users Management page**: Show more useful data. Instead of raw UUIDs, attempt to show the email from the auth context (master admin can see all users). Add the ability to change a user's platform role (e.g. promote from `admin` to `master_admin` or demote). Make rows interactive.

Since the master admin has no email column available in the `user_roles` or `organization_members` tables (emails live in `auth.users` which is not directly queryable), we'll display the user ID truncated with a copy button, and note that email lookup requires the Lovable Cloud backend view.

For the Organization members, we'll add:
- A clickable row that expands to show member details
- A "Change Role" action dropdown (owner → admin → member)
- A "Remove Member" button

For Platform Roles (Users Management page):
- A "Change Role" dropdown per user
- A "Remove Role" button for non-master-admin entries

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/admin/DomainDetailPage.tsx` | Change username field from `type="email"` to `type="text"`, update placeholder and helper text |
| `src/pages/master/OrganizationsOverviewPage.tsx` | Make rows clickable, add expandable member list per org, add status/plan change actions |
| `src/pages/master/UsersManagementPage.tsx` | Add role change dropdown and remove actions to Platform Roles table |

## Implementation Details

### DomainDetailPage fix (simple)
- Line 317: `type="email"` → `type="text"`
- Line 318: placeholder `"admin@yourdomain.five9.com"` → `"yourusername"` 
- Line 322: helper text → `"Your Five9 administrator username"`

### OrganizationsOverviewPage (interactive rows)
- Wrap each `<TableRow>` with `onClick` to expand an inline panel showing members of that org
- Use a `selectedOrgId` state to track which org is expanded
- Show members in a sub-table below the selected row
- Add "Change Status" select dropdown per org row actions column

### UsersManagementPage (role management)
- Add "Actions" column to Platform Roles table
- Each row: a `Select` dropdown to change role + a "Remove" button (disabled for master_admin to prevent self-lock-out)
- Wire to `supabase.from("user_roles").update(...)` and `.delete(...)`
- Confirm before removing a role
