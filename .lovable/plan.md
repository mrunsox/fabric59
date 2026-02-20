

# Auto-Populate Agents and Clients from Five9

## Problem

Two issues to solve:

1. **`getAllUsers` returns empty** -- The XML parser in `five9-provisioning` looks for `<generalInfo>` blocks, but the Five9 v13 `getUsersGeneralInfo` response wraps each user in `<return>` elements, not `<generalInfo>`. The `getExtensions` action works because it just grabs all `<extension>` tags globally -- it doesn't need block-level grouping.

2. **No auto-sync** -- When a Five9 domain is connected, nothing populates the `agents` or `tenants` (clients) tables. The user must manually provision every agent and manually create every client.

## Solution

### Part 1: Fix the XML Parsing Bug

In `supabase/functions/five9-provisioning/index.ts`, change the `getAllUsers` regex from:

```
/<generalInfo>(.*?)<\/generalInfo>/gs
```

to:

```
/<return>(.*?)<\/return>/gs
```

This matches the actual Five9 API response structure and will return all 67+ users.

### Part 2: Add a "Sync from Five9" Action

Create a new `syncFromFive9` action in the `five9-provisioning` edge function that:

1. Calls `getUsersGeneralInfo` to fetch all Five9 users
2. Calls `getSkills` to fetch all Five9 skills
3. Returns both datasets so the frontend can upsert them

### Part 3: Trigger Sync on Successful Connection

In `DomainsPage.tsx`, after a domain connection succeeds (status = "success"), automatically call the sync action. The sync will:

- **Agents**: Upsert each Five9 user into the `agents` table, matching on `five9_username` to avoid duplicates. Only inserts new agents; existing ones are left untouched.
- **Clients**: Upsert each Five9 skill as a client in the `tenants` table, matching on `name` to avoid duplicates. New skills are inserted with `crm_type: 'other'` and `status: 'active'`.

### Part 4: Add Manual Sync Button

Add a "Sync from Five9" button on the Agents page (near the Live Five9 Roster) that triggers the same sync logic on demand, so admins can re-sync at any time without reconnecting the domain.

## Files to Modify

| File | Change |
|---|---|
| `supabase/functions/five9-provisioning/index.ts` | Fix `<generalInfo>` to `<return>` regex; add `syncFromFive9` action |
| `src/pages/admin/DomainsPage.tsx` | After successful connection, call sync to populate agents + clients |
| `src/pages/admin/AgentsPage.tsx` | Add "Sync from Five9" button |
| `src/hooks/useFive9Sync.ts` (new) | Hook that calls the sync action and upserts agents + tenants |

## Technical Details

The sync hook will:

```text
1. Call five9-provisioning with action: "syncFromFive9"
2. Receive { users: [...], skills: [...] }
3. For each user:
   - Check if agents table has a row with matching five9_username
   - If not, INSERT into agents (first_name, last_name, email, role, extension, five9_username, status: "active")
4. For each skill:
   - Check if tenants table has a row with matching name
   - If not, INSERT into tenants (name, crm_type: "other", status: "active", organization_id)
5. Refresh both queries via React Query invalidation
```

The role for each agent is inferred from their extension range using the existing `inferRole` logic already in `useFive9Users.ts`.

