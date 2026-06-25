# Promote Assureway to a real Client (with a Campaign)

The seed already creates a real `tenants` row (Assureway) and a real `campaigns` row (Main Reception) — but the UI still calls it a "demo client", which is what you're seeing on the Campaigns page. We'll rebrand the action so Assureway is treated as a first-class client, and make sure the entry point lives where clients are created.

## Changes

1. **Rename the seed action** (UI copy only — same backend behavior):
   - `SeedAssurewayButton` label: `Add Assureway demo client` / `Re-sync Assureway demo client` → `Load Assureway client` / `Re-sync Assureway`.
   - Toast strings in `useSeedAssurewaySample` (`"Adding Assureway demo client"`, etc.) → `"Loading Assureway client"` / `"Assureway client ready"`.
   - `aria-label` and test id updated accordingly (keep `data-testid="seed-assureway-button"` for test stability).

2. **Move the button to the Clients page as the primary location**:
   - Add `SeedAssurewayButton` to `WorkspaceClientsPage` header (next to `New client`), shown only when no Assureway tenant exists in this workspace; otherwise show `Re-sync Assureway` secondary.
   - Keep a secondary copy on `WorkspaceCampaignsPage` for now (so the empty-state journey still works), but reword to `Load Assureway sample campaign`.

3. **Make Assureway visible as a Client immediately after seeding**:
   - After `mutate()` success, navigate to `/w/:wsId/clients/:tenantId` (the new tenant) instead of the campaign detail, so the user lands on the Client record. Campaign remains reachable from the client page.
   - Invalidate `useWorkspaceClients` and `useWorkspaceCampaigns` queries on success (already partially done — verify both keys).

4. **Empty-state copy on Campaigns page**:
   - Update checklist/empty copy to say "Assureway is loaded as a client — open it to see its Main Reception campaign" when the seed has run.

## Technical notes

- No DB migration. The seed already writes to `tenants` (client) + `campaigns` + `guides`/`guide_versions` + `forms`/`form_versions`/`form_campaign_assignments`, workspace-scoped.
- Files touched: `src/components/dashboard/SeedAssurewayButton.tsx`, `src/hooks/seed/useSeedAssurewaySample.ts`, `src/pages/workspace/WorkspaceClientsPage.tsx`, `src/pages/workspace/WorkspaceCampaignsPage.tsx`.
- Update `src/test/regressions/phase11BuildIA.test.ts` label assertions to match new copy.

## Out of scope

- Schema rename of `tenants` → `clients` (still deferred).
- New campaign creation flow changes — `New campaign` button on Campaigns page already works for ad-hoc clients.
- Removing the seed entirely (kept as a fast-path to load the canonical Assureway content).
