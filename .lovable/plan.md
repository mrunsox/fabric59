

# Add "Invite Team Member" Flow for Admins

## Overview

Add an "Invite Member" button to the Team Members section in Settings that lets admins invite new users by email. The invited user receives a signup link, and upon signup they are automatically added to the organization.

## Current State

- The Team Members table in Settings shows existing org members with permission checkboxes
- `useInviteMember` hook exists but requires a pre-existing `userId` -- no way to invite by email
- No invite UI exists anywhere in the app
- Profile Settings page already exists at `/admin/profile` (accessible via sidebar avatar) -- no changes needed there

## Changes

### 1. New: Invite Member Dialog Component

**File: `src/components/settings/InviteMemberDialog.tsx`**

A dialog with:
- Email input field
- Role selector (member, admin)
- "Send Invite" button

On submit:
- Calls a new edge function that uses Supabase Admin API to create an invite (or create the user with a temporary password and send a password reset email)
- Inserts a row into `organization_members` linking the new user to the current org
- Shows success/error toast

### 2. New: Edge Function for Admin User Creation

**File: `supabase/functions/invite-member/index.ts`**

- Accepts: `email`, `role`, `organizationId`
- Validates the caller is an org admin (checks JWT)
- Uses `supabase.auth.admin.inviteUserByEmail(email)` to create the user and send a magic link
- Inserts the user into `organization_members` with the specified role
- Returns success/error

### 3. Update: Settings Page Team Members Section

**File: `src/pages/admin/SettingsPage.tsx`**

- Add an "Invite Member" button next to the Team Members card title
- Wire it to open the `InviteMemberDialog`
- After successful invite, refresh the members list

### 4. Profile Settings Visibility (already done)

The Profile page at `/admin/profile` is already accessible to all authenticated users via the sidebar footer avatar click. No changes needed -- but worth noting this path for your awareness:

**Sidebar footer (avatar area) -> clicks through to `/admin/profile`**

This page lets users update: display name, phone, timezone, avatar URL, and password.

---

## Technical Details

### Edge Function: `invite-member`

```typescript
// Validates caller is org admin
// Uses SUPABASE_SERVICE_ROLE_KEY for admin operations
// supabase.auth.admin.inviteUserByEmail(email) creates user + sends email
// Then inserts organization_members row
```

### InviteMemberDialog Component

- Uses existing `Dialog` UI component
- Email validation with basic regex
- Role selection: `<Select>` with "Member" and "Admin" options
- Calls the edge function via `supabase.functions.invoke('invite-member', ...)`
- On success: closes dialog, invalidates team members query, shows toast

### Settings Page Update

- "Invite Member" button added to the CardHeader of the Team Members card
- Only visible to org owners/admins (already gated by `isOrgAdmin`)

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/invite-member/index.ts` | New -- edge function to invite users via admin API |
| `src/components/settings/InviteMemberDialog.tsx` | New -- dialog component for inviting team members |
| `src/pages/admin/SettingsPage.tsx` | Add "Invite Member" button to Team Members card |

