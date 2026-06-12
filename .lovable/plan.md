## Problem

On `/admin` (and any long admin page) the **Platform Admin** entry and **Sign out** button at the bottom of the org rail are unreachable — you'd have to scroll to the bottom of the page to see them. On short pages like `/admin/workspaces` they happen to be visible, which is why the bug is intermittent.

Root cause: `src/shells/OrgRail.tsx` wraps the rail in a `relative` div with no fixed height, then positions the inner `<aside>` as `absolute inset-y-0`. The aside therefore matches the full main-content height instead of the viewport, pushing the footer (Platform Admin + Sign out) far below the fold.

## Fix

Make the rail viewport-pinned, not content-pinned.

In `src/shells/OrgRail.tsx`:

1. Change the outer wrapper to be the sticky element:
   - From `className="relative hidden lg:block w-14 shrink-0 z-50"`
   - To `className="hidden lg:block w-14 shrink-0 z-50 sticky top-0 h-screen"`
2. Change the inner `<aside>` from `absolute inset-y-0 left-0 ...` to `relative h-full left-0 ...` so it fills the sticky wrapper instead of escaping it. Keep the hover-expand width transition, shadow, and overflow rules unchanged.

This keeps the Supabase-style overlay expand-on-hover behavior intact (still `w-14 hover:w-56`, still floats above the workspace secondary sidebar via `z-50`) while guaranteeing the footer with **Platform Admin** (visible to `isMasterAdmin`) and **Sign out** is always within the viewport.

## Verification

- Load `/admin` (long Overview page) and confirm the bottom of the rail shows the shield "Platform Admin" entry and the "Sign out" button without scrolling. Click Platform Admin → lands on `/superadmin`. Click Sign out → signs out.
- Load `/admin/workspaces`, `/admin/connectors`, and `/w/:id/campaigns` and confirm: rail still expands on hover, workspace secondary sidebar still appears beside it, no layout reflow, no clipping.
- Run the full regression suite (`AdminShell`, `dashboardConsolidation`, `canonicalScopeAlignment`, `navRouting`) and report green.

## Out of scope

No changes to the route map, navigation config, `/superadmin` guarding, or any other dashboard surface — this is a one-file CSS-positioning fix.
