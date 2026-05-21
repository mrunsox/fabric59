## Two-tier nav convergence — one AppShell, two vertical rails

### Target model

```text
┌────┬─────────────────┬───────────────────────────────────┐
│ RAIL│ Workspace nav   │                                   │
│ 56px│ (only on /w/:id)│   Page content                    │
│ org │ ~240px          │                                   │
│ scop│                 │                                   │
└────┴─────────────────┴───────────────────────────────────┘
```

- **Org rail** — collapsed 56px icon strip, expands to ~220px on hover. Always visible inside the app. Items: Overview, Workspaces, Connectors, Reports, Notifications, Billing, Settings. Org switcher pinned at top, profile/sign-out at bottom.
- **Workspace sidebar** — ~240px persistent. **Renders only when path matches `/w/:workspaceId/*`**. Mirrors today's `WORKSPACE_NAV_GROUPS` (Build / Operate / Intelligence / Settings).
- **No workspace home dashboard.** `WorkspaceHomePage` is retired. The KPI counters (Clients / Campaigns / Guides / Forms / Templates) it rendered move into a slim `WorkspaceContextBar` shown above content on every `/w/:id/*` page.

When on `/admin/*` (no workspace context), the secondary sidebar **stays hidden** — content gets full width. (Locked: option #1, Supabase-like.)

### Files added

- `src/shells/AppShell.tsx` — single shell. Mounts under both `/admin` and `/w/:workspaceId` route trees. Wraps everything in one `SidebarProvider` and renders `<OrgRail />` + (conditionally, via `useMatch("/w/:workspaceId/*")`) `<WorkspaceSidebar />` + top bar + `<Outlet />`. Workspace routes are wrapped in `<WorkspaceProvider>` like today.
- `src/shells/OrgRail.tsx` — shadcn `Sidebar collapsible="icon"`. Icon-only when collapsed; hover on the rail container expands to label strip (CSS `:hover` width transition, no JS state). Org switcher dropdown in header, NotificationBell + account menu in footer.
- `src/shells/WorkspaceSidebar.tsx` — extracted from current `WorkspaceShell`'s inner `WorkspaceSidebar`. Reads `workspaceId` from `useParams`, renders `WORKSPACE_NAV_GROUPS` + `WORKSPACE_NAV_PINNED` exactly as today.
- `src/components/workspace/WorkspaceContextBar.tsx` — slim header strip: workspace name + 5 KPI counters (uses the same `useWorkspaceCampaigns/Guides/Templates/Forms/Clients` hooks as `WorkspaceHomePage`, with `isDemoName` filtering). Rendered by `AppShell` above `<Outlet />` whenever a workspace is active.

### Files deleted

- `src/pages/workspace/WorkspaceHomePage.tsx`
- `src/components/layout/AdminShell.tsx`
- `src/shells/WorkspaceShell.tsx` (kept only as a thin re-export of `AppShell` if other code outside `App.tsx` still imports it — based on the search, only `App.tsx` does, so it gets removed)

### Routing changes (`src/App.tsx`)

- Replace `<Route path="/admin" element={<AdminShell />}>` with `<Route path="/admin" element={<AppShell />}>`. All `/admin/*` children unchanged.
- Replace `<Route path="/w/:workspaceId" element={<CanonicalWorkspaceShell />}>` with `<Route path="/w/:workspaceId" element={<AppShell />}>`. All `/w/:workspaceId/*` children unchanged **except**:
  - Remove `<Route path="home" element={<WorkspaceHomePage />} />`
  - Add `<Route path="home" element={<Navigate to="../campaigns" replace />} />` (back-compat for bookmarks).
  - Update `WorkspaceIndexRedirect` to point at `campaigns` instead of `home` (or just have it redirect to the workspace's primary surface — keep current implementation but change its target).
- Cleanups from previous slice (carry over so this lands clean):
  - Remove `/admin/clients/:id/workspace` route + delete `ClientWorkspacePage.tsx` (pure pass-through).
  - Collapse `/admin/legal-connect/overview` → `<Navigate to="/admin/legal-connect" replace />`, drop import + delete `LegalConnectOverviewPage.tsx`.
  - Fix `/admin/agent-dashboard` redirect target: `/w/:workspaceId/agents` → `/w/:workspaceId/agent` (cockpit, not roster).

### Tests / locks

- Update `src/test/regressions/workspaceShellPolish.test.tsx` to assert against `AppShell` + `WorkspaceSidebar` rendering on `/w/:id/*`.
- Add a regression in `src/test/regressions/adminDashboardSlice.test.tsx`:
  - `/admin` renders org rail only (no workspace sidebar).
  - `/w/:id/campaigns` renders org rail + workspace sidebar + `WorkspaceContextBar`.
  - `/w/:id/home` → 308 to `/w/:id/campaigns`.
- Update `src/data/surfaceAudit.ts` to drop the retired surfaces (`home`, `clients/:id/workspace`, `legal-connect/overview`).

### Out of scope

- No edits to any workspace page body (Forms / Guides / Campaigns / Agent Cockpit content unchanged).
- No DB, auth, or design-token changes. Keep cyan `#0EA5E9` primary, Linear-style premium aesthetic.
- No marketing or `SuperadminShell` changes.
- No nav-item additions or removals — only the shell structure changes.
