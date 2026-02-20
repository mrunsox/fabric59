

# Fix: Auto-Populate Agents and Clients from Five9

## Problem

The Five9 domain is connected (status: "active"), but both the agents and tenants (clients) tables are empty -- 0 records each. The sync hook (`useFive9Sync.ts`) fetches data from Five9 correctly but then tries to INSERT into the database from the frontend client. The RLS policies on both tables require `admin` or `master_admin` roles, and the frontend Supabase client uses the anon key, so **all inserts are silently rejected**.

## Solution: Server-Side Sync

Move all database insert logic into the `five9-provisioning` edge function, which has access to the service role key and bypasses RLS entirely.

## Changes

### 1. Update `supabase/functions/five9-provisioning/index.ts`

Modify the existing `syncFromFive9` action to:

- After fetching users and skills from Five9, create a Supabase client using the **service role key**
- Accept an `organizationId` parameter from the frontend
- Query existing `agents` (by `five9_username`) and `tenants` (by `name`) to avoid duplicates
- Insert new agents with inferred roles based on extension ranges
- Insert new tenants (skills) with `crm_type: 'other'`, `status: 'active'`, and the provided `organization_id`
- Return `{ success: true, agentsAdded: N, tenantsAdded: N }` so the frontend can show accurate counts

The role inference logic (extension ranges to role names) will be duplicated server-side from the existing `useFive9Sync.ts`.

### 2. Simplify `src/hooks/useFive9Sync.ts`

Remove all client-side database operations. The hook becomes:

- Call `five9-provisioning` with `action: 'syncFromFive9'` and pass `organizationId`
- Show a toast with the result counts
- Invalidate React Query caches for `["tenants"]` and `["agents"]` so the UI refreshes immediately
- No more direct Supabase queries from the frontend

### 3. Fix `src/pages/admin/DomainsPage.tsx`

- **Await** the `syncFromFive9()` call before closing the dialog
- Show "Syncing agents and clients..." status while sync is in progress
- Only close the dialog after sync completes (or fails gracefully)

## Five9 API Reference Notes

From the Five9 Admin Web Services v13 documentation:

- `getUsersGeneralInfo` returns all users wrapped in `<return>` elements (already fixed in the current code)
- `getSkills` returns skill objects with `<name>` elements
- Both are called in parallel in the existing `syncFromFive9` action -- this stays the same

No changes to SOAP calls are needed. The XML parsing is already correct.

## Files to Modify

| File | Change |
|---|---|
| `supabase/functions/five9-provisioning/index.ts` | Add server-side DB upserts to `syncFromFive9` action using service role client |
| `src/hooks/useFive9Sync.ts` | Remove client-side inserts; add React Query invalidation |
| `src/pages/admin/DomainsPage.tsx` | Await sync call; update status messaging during sync |

## Expected Result

After connecting a Five9 domain (or clicking "Sync from Five9" on the Agents page), all Five9 users will appear in the Agents tab and all Five9 skills will appear in the Clients tab immediately.

