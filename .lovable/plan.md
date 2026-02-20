

# Add "Sync from Five9" Buttons to Agents and Clients Pages

## Overview

Add a visible "Sync from Five9" button on both the Agents page and the Clients (Tenants) page so admins can trigger a sync at any time. The Agents page already has one in the header -- we will keep it there. For the Clients page, we will add a matching button next to the "Add Client" button.

## Changes

### 1. Clients Page -- Add Sync Button
**File**: `src/pages/admin/TenantsPage.tsx`

- Import `useFive9Sync` hook and `useAuth` context
- Import `RefreshCw` icon from lucide-react
- Add a "Sync from Five9" button in the header next to the existing "Add Client" button
- The button calls `syncFromFive9(organization?.id)` and shows a spinning icon while syncing
- After sync completes, React Query cache invalidation (already built into the hook) will refresh the table automatically

### 2. Agents Page -- Already Done
The Agents page (`AgentsPage.tsx`) already has a "Sync from Five9" button at line 100-111. No changes needed here.

## Visual Result

**Clients page header will look like:**
```
Clients                                    [Sync from Five9]  [+ Add Client]
Manage client integrations...
```

Both buttons use the same `useFive9Sync` hook which calls the server-side edge function and invalidates both `["agents"]` and `["tenants"]` caches, so both pages stay in sync regardless of which button is pressed.

## Files to Modify

| File | Change |
|---|---|
| `src/pages/admin/TenantsPage.tsx` | Add `useFive9Sync` + `useAuth`, add "Sync from Five9" button next to "Add Client" |

