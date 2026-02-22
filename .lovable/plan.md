

# Fix Member Names + Add Permission Selection to Invite Dialog

## Problem 1: Alphanumeric Member Names

The Team Members table shows "d06a7151" because:
- The `profiles` table has no `email` column
- The `handle_new_user` trigger only inserts the user ID, not their email
- The hook falls back to `user_id.slice(0, 8)` when `display_name` is null

### Fix

1. **Add `email` column to `profiles` table** via migration
2. **Update the `handle_new_user` trigger** to copy `NEW.email` into the profiles row
3. **Backfill existing profiles** with emails from `auth.users` (one-time migration)
4. **Update `useTeamPermissions`** to read `email` from profiles and display it properly (show `display_name` if set, otherwise show `email`)
5. **Update `invite-member` edge function** to set the email on the profile when creating/adding a user

## Problem 2: No Permission Selection During Invite

The Invite Member dialog currently only captures email and role. It needs checkboxes for each tab/feature permission so the admin can pre-assign access.

### Fix

1. **Update `InviteMemberDialog`** to include a checkbox grid for all permissions (from `PERMISSION_KEYS`). When role is "admin", all are checked and disabled (admins get full access). When role is "member", the admin picks which tabs to grant.
2. **Update `invite-member` edge function** to accept a `permissions` array and insert rows into `user_permissions` for each selected permission.

## Files Changed

| File | Change |
|------|--------|
| Database migration | Add `email` column to `profiles`, update `handle_new_user` trigger to copy email, backfill existing rows |
| `supabase/functions/invite-member/index.ts` | Accept `permissions` array, insert into `user_permissions`, set email on profile |
| `src/components/settings/InviteMemberDialog.tsx` | Add permission checkboxes grid, pass selected permissions to edge function |
| `src/hooks/useTeamPermissions.ts` | Read `email` from profiles, display email or display_name instead of truncated UUID |

## Technical Details

### Migration SQL

```sql
ALTER TABLE public.profiles ADD COLUMN email text;

-- Update trigger to copy email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

-- Backfill existing profiles
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;
```

### Edge Function Changes

The `invite-member` function will:
- Accept an additional `permissions: string[]` parameter
- After inserting the org membership, insert one `user_permissions` row per selected permission
- Upsert the profile with the invited email address

### InviteMemberDialog Changes

- Import `PERMISSION_KEYS` from `useTeamPermissions`
- Add state: `selectedPermissions: string[]`
- Render a checkbox grid below the Role selector
- When role is "admin", auto-check all and disable toggles (admins have full access)
- When role is "member", let the admin toggle each permission
- Pass `permissions` array in the edge function call body

### useTeamPermissions Changes

- Query `profiles` with `select("id, display_name, email")`
- Display logic: show `display_name` if available, otherwise show `email`, otherwise show truncated ID as last resort

