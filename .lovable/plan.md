

# Real-Time User Dashboard Updates

## Current State

The User Dashboard loads data once on mount via `useEffect` and never refreshes. If someone adds an agent or client in another tab or another user adds one, the stats stay stale until a page reload.

## What Will Change

### Add Realtime Subscriptions to UserDashboardPage

**File: `src/pages/admin/UserDashboardPage.tsx`**

1. **Enable Realtime on `agents` and `tenants` tables** -- A database migration will add both tables to the `supabase_realtime` publication so Postgres changes are broadcast.

2. **Subscribe to changes** -- After the initial data load, set up two Realtime channels:
   - `dashboard-agents`: listens for INSERT, UPDATE, DELETE on the `agents` table. On any change, re-fetch agent stats and recent agents.
   - `dashboard-tenants`: listens for INSERT, UPDATE, DELETE on the `tenants` table. On any change, re-fetch tenant stats and recent tenants.

3. **Cleanup on unmount** -- Unsubscribe from both channels when the component unmounts.

4. **Refactor data fetching** -- Extract the current fetch logic into reusable `fetchAgentData()` and `fetchTenantData()` functions so they can be called both on mount and when a realtime event fires.

### Database Migration

A single SQL migration to enable realtime:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.agents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tenants;
```

### No Other File Changes

The realtime subscription is self-contained within the dashboard page. No new components, hooks, or routes needed.

---

## Technical Details

The realtime subscription pattern:

```typescript
const channel = supabase
  .channel('dashboard-agents')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'agents' }, () => {
    fetchAgentData();
  })
  .subscribe();
```

Both channels will be created inside the same `useEffect` that does the initial fetch, with cleanup via `supabase.removeChannel(channel)` in the effect's return function.

### Files Changed

| File | Change |
|------|--------|
| `src/pages/admin/UserDashboardPage.tsx` | Add realtime subscriptions for agents and tenants tables, refactor fetch into reusable functions |
| Database migration | `ALTER PUBLICATION supabase_realtime ADD TABLE public.agents, public.tenants` |

