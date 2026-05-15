
# Premium polish + dead-end repair

Three coordinated workstreams against the canonical workspace shell at `/w/:workspaceId/*`. Surgical, no scope creep into marketing/auth shells, no schema changes.

## 1. URL display + breadcrumb truth

Current breadcrumb (`Fabric59 Ops / Main workspace / Home`) shows the right pieces but the section label is hard-coded from the URL slug and several pages render their own duplicate H1 ("Main Workspace") which doubles with the eyebrow ("WORKSPACE"). Also the browser tab title doesn't reflect the current section.

Changes:
- `WorkspaceShell.WorkspaceChrome`: derive the section label from `WORKSPACE_NAV` (already done) and append a third crumb for detail pages (`Campaigns / Acme Q3`) by reading a small `useBreadcrumbTrail()` context that detail pages publish into.
- Add `<SEOHead>` per workspace surface so the document title becomes `{Section} · {Workspace} · Fabric59`.
- Make the workspace switcher pill copy the canonical workspace URL on shift-click, and show the bare `id` only as a `title` tooltip — no UUID in the visible chrome.
- Collapse the duplicated `WORKSPACE / Main Workspace` eyebrow+H1 on `WorkspaceHomePage` into a single premium header (eyebrow handled by breadcrumb, H1 = workspace name only).

## 2. Ultra-premium nav bar + sidebar

Goals: Linear/Vercel-grade density, motion, and hierarchy. Light-mode pure white per project memory; cyan #0EA5E9 primary kept.

Sidebar (`WorkspaceShell.WorkspaceSidebar`):
- Group the 15 items into 3 silent sections with 10px section labels: **Build** (Home, Campaigns, Guides, Forms, Templates, Clients), **Operate** (Runs, Agents, Supervisor, QA), **Intelligence** (Analytics, Integrations, Knowledge, Assistant), with Settings pinned at the bottom.
- Active item: 1px inset ring + soft cyan glow (`shadow-[0_0_0_1px_hsl(var(--primary)/0.25),0_8px_24px_-12px_hsl(var(--primary)/0.35)]`), animated 120ms.
- Add per-item kbd hint on hover (`G then C` style) using a small `useCommandHint` map; wire `g h / g c / g g / g f / g t / g r / g a / g s` global shortcuts via a single `useKeyboardNav(workspaceId)` hook.
- Workspace switcher promoted from breadcrumb into a dedicated sidebar header card (avatar monogram + workspace name + role chip + chevron). Breadcrumb keeps Org / Section only.
- Collapsed (icon) mode: tooltips already exist; add subtle 200ms width transition and keep section dividers as 1px hairlines.

Top bar:
- Add a global `⌘K` Command Palette (CommandDialog from shadcn) wired to: every `WORKSPACE_NAV` destination, every workspace in scope, recent campaigns/guides/forms (last 10 from existing hooks), and the create actions on Home. This single addition kills most "where do I go?" dead ends.
- Notification bell stays; add a profile/account menu (avatar → Profile, Switch workspace, Sign out) — currently absent in the canonical shell.

## 3. Dead-end audit & repair

Run a route-by-route audit script and fix everything it surfaces. Initial scan from the codebase already shows:

| Dead end | Fix |
|---|---|
| Home → "New template" links to `/w/:id/templates` (not a real create flow) | Point to `templates?new=1`, open the template create drawer on mount |
| `WorkspaceShell` "Workspace not found" CTA goes to `/admin/workspaces` | Add primary "Switch workspace" picker inline + secondary "Create workspace" |
| `WorkspaceCampaignNewPage` documents that save still navigates to legacy `/admin/campaigns/:id` | Patch `CampaignIntakePage` save handler to detect `/w/:id/campaigns/new` origin and navigate to `/w/:id/campaigns/:campaignId` |
| `LegacyWorkspaceRedirect` silently lands on `/w/:id/home` with no breadcrumb of where the user came from | Add a one-time toast "Moved to canonical workspace home" with a "Why?" link to docs |
| Empty `RecentList` on Home is a flat blank card | Replace with 3 contextual starter actions (Import CSV, Use template, Try sample data) — no dead end if zero data |
| Breadcrumb `Organization` link goes to `/org` which is retired | Re-point to `/admin` |
| Workspace switcher dropdown shows only names; no "Create new workspace" terminator | Append "+ Create workspace" item → `/admin/workspaces?new=1` |
| Sidebar Settings → no sub-IA, lands on a single page | Add in-page tabs (General / Members / Billing / Danger zone) so Settings isn't a "wall" |

Plus a programmatic sweep:
- Add `scripts/audit-routes.ts` (node, no runtime cost) that walks `App.tsx` Route children, asserts every route either renders a component or is a `<Navigate>` whose target is itself routed. Fail CI on orphan targets.
- Extend `src/test/regressions/canonicalSurfaces.test.ts` with a "no dead links" matrix: render each `WORKSPACE_NAV` destination + every `<Link to="…">` discovered via `ts-morph` and assert `useRoutes` resolves.

## 4. Tests + docs

- New: `src/test/regressions/workspaceShellPolish.test.tsx` — breadcrumb section text, command palette opens on `⌘K`, switcher renders Create item, keyboard shortcut `g c` navigates to campaigns.
- Extend: `launchRedirectMatrix.test.tsx` (already added) — keep green.
- New: `scripts/audit-routes.ts` + `npm test:routes` script wired to Vitest run.
- Doc: append a "Workspace shell — premium polish" section to `docs/dashboard-surface-extraction.md` covering nav grouping, command palette, shortcut map, and the no-dead-end policy.

## Technical details

```text
src/
  shells/WorkspaceShell.tsx          # grouped sidebar, profile menu, ⌘K palette mount
  components/workspace/
    WorkspaceCommandPalette.tsx      # NEW — CommandDialog + nav/workspace/recent providers
    WorkspaceBreadcrumb.tsx          # NEW — context-driven 3-segment crumb
    WorkspaceSwitcherCard.tsx        # NEW — sidebar header card
  hooks/
    useKeyboardNav.ts                # NEW — g+key shortcut router
    useBreadcrumbTrail.ts            # NEW — per-page crumb publisher
  pages/workspace/WorkspaceHomePage.tsx   # collapse duplicate H1, smarter empty state, fix New template link
  pages/admin/CampaignIntakePage.tsx      # workspace-aware post-save navigation
  pages/workspace/WorkspaceSettingsPage.tsx # tabbed sub-IA
  test/regressions/workspaceShellPolish.test.tsx  # NEW
  scripts/audit-routes.ts                # NEW
```

Design tokens: reuse `--primary` (#0EA5E9), `--background` (white), add `--ring-soft: 14 165 233 / 0.25` and `--shadow-glow: 0 8px 24px -12px hsl(var(--primary) / 0.35)` in `index.css`. No new color families.

## Out of scope (explicit)

- Marketing pages, login/signup, onboarding shell visuals (already iterated last loop).
- RLS, schema, edge functions.
- Org/admin-shell sidebar (separate surface; can be a follow-up with the same primitives once approved here).

## Acceptance

1. `/w/:id/home` shows: `Fabric59 Ops / Main workspace / Home` in breadcrumb, single "Main workspace" H1, no duplicate eyebrow.
2. `⌘K` opens palette, typing "camp" jumps to Campaigns; `g h` returns home.
3. Sidebar shows three labeled groups with active-state glow; collapsed mode keeps groupings.
4. `npm run test` green, including new `workspaceShellPolish` and `audit-routes` checks.
5. Audit script reports zero unreachable routes and zero `<Link>` targets that 404.
