

# Redesign ClientOverviewPage with Readiness · AI · Health blocks

Apply the same task-driven dashboard pattern from `UserDashboardPage` to the per-client view at `/admin/clients/:id`, scoped to a single client.

## What changes

`src/pages/admin/ClientOverviewPage.tsx` — replace the existing layout's hero/metrics with a focused 4-block stack:

1. **Header** — client name, status pill, quick links (Legal Connect · Five9 Overlay · Edit)
2. **Setup Progress** — `ReadinessChecklist` fed by `fetchClientReadiness(clientId)` for THIS client (not "any tenant in org")
3. **AI Guidance** — `AIGuidanceCard` with the same client readiness, top 3 next actions
4. **System Health** — `SystemHealthStrip` scoped to `organizationId` + `clientId` filter
5. **Live Operations** — compact strip: active campaign count, recent events (24h), open review items, last sync — each a link
6. **Quick Actions** — `QuickActionsGrid` with client-scoped hrefs (Create campaign for this client, Connect provider, Run readiness test, Open docs)
7. **Existing rich content** (integrations, agents roster, recent activity) — moved into a single collapsed `<Accordion>` "More details" at the bottom so the page leads with readiness, not tables

## Files

**Edited (1):**
- `src/pages/admin/ClientOverviewPage.tsx` — new block layout, reuses existing dashboard components

**No new files, no DB changes, no edge function changes** — all building blocks already exist from the prior dashboard refactor.

## Technical notes

- `ReadinessChecklist`, `AIGuidanceCard`, `SystemHealthStrip`, `QuickActionsGrid` accept the props they already expose
- `QuickActionsGrid` currently uses global hrefs — pass an optional `clientId` prop to rewrite hrefs to client-scoped routes (`/admin/clients/:id/legal-connect`, `/admin/clients/:id/five9-overlay`, etc.); add the prop with a 3-line conditional
- Live Operations strip uses existing queries already present on the page (active campaigns, recent events) — just re-rendered into the compact strip pattern
- Preserve all existing data fetches; only the visual composition changes
- Existing tabs/sub-sections become the accordion content — no functionality lost

## Acceptance

- `/admin/clients/:id` leads with Setup Progress + AI Guidance, not integration tables
- Readiness reflects the actual selected client (not a random tenant in the org)
- Quick Actions deep-link into client-scoped setup routes
- Existing detailed content remains accessible via "More details" accordion
- Page renders inside `AdminShell` with the Clients section sub-nav active

