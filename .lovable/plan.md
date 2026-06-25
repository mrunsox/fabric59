# Show Assureway as a real client + campaign (no demo affordances)

Two issues to fix:

1. **Clients page is empty even though Assureway loaded.** The `tenants` table only allows SELECT for admins / master-admin / ops / org-owners. Regular workspace members can't read the row, so the card never appears.
2. **Re-sync / Load buttons keep the "demo" feel.** Once Assureway exists, it should look like a normal client and a normal campaign — no special buttons in the header.

## Changes

### 1. RLS: workspace members can read their workspace's tenants
Add a SELECT policy on `public.tenants` mirroring the campaigns policy:

```sql
CREATE POLICY "tenants readable by workspace members"
ON public.tenants FOR SELECT
USING (
  workspace_id IS NOT NULL
  AND is_workspace_member(auth.uid(), workspace_id)
);
```

No other policies change. Existing admin/org-owner ALL policies stay.

### 2. Clients page: render Assureway as a normal card
- After the RLS fix, `useWorkspaceClients` will return Assureway and the existing card grid renders it (no UI change needed beyond removing the seed button when it exists).
- Show `Load Assureway client` button **only when the clients list is empty**. Hide it entirely once any client exists — no "Re-sync" affordance.

### 3. Campaigns page: drop the seed button entirely
- Remove `SeedAssurewayButton` from `WorkspaceCampaignsPage`. Header keeps only `New campaign`.
- Main Reception campaign already shows in the table; no other change.

### 4. Client detail entry point
- Verify the card on Clients page links to `/w/:wsId/clients/:tenantId` so clicking Assureway opens its detail (which already lists its campaigns).

## Files touched
- `supabase/migrations/<new>.sql` — add SELECT policy on `tenants`.
- `src/pages/workspace/WorkspaceClientsPage.tsx` — conditionally render seed button (empty-state only).
- `src/pages/workspace/WorkspaceCampaignsPage.tsx` — remove seed button from header.

## Out of scope
- Renaming `tenants` → `clients` schema.
- Changes to the seed content itself.
- Removing the seed hook (kept as the one-click way to populate the canonical Assureway guide/flow/form into a new workspace).
