

## Fix: CampaignHealthPanel build error

**Error:** `CampaignHealthPanel.tsx` passes `events` and `isLoading` props to `EventLogViewer`, but `EventLogViewer` only accepts `{ clientId? }` and fetches its own data internally.

**Root cause:** `CampaignHealthPanel` was designed to filter events by `campaignRouteId`, but `EventLogViewer` is self-contained and only filters by `clientId`.

### Fix

Refactor `CampaignHealthPanel.tsx` to render its own scoped event table inline instead of reusing `EventLogViewer`. The campaign panel needs campaign-route-level filtering, which `EventLogViewer` does not support.

Inline implementation:
- Use `useFive9EventLog({ client_id: clientId })`
- Filter results client-side where `matched_route_id === campaignRouteId` (or fall through if column unset)
- Render a compact table: When · Event · Status · Correlation
- Show "No events yet — run a test" empty state with link to the Simulation tab
- Loading skeleton while fetching

No prop changes to `EventLogViewer`, no other files affected. This keeps the campaign-scoped view distinct from the global client view, consistent with the campaign/client separation refactor.

### Files

- **Edit** `src/components/campaign-overlay/CampaignHealthPanel.tsx` — replace `<EventLogViewer events=... isLoading=... />` usage with inline filtered table

