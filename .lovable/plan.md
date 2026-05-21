## Fix two-tier nav — overlap, clipping, and transition jank

### What's broken

1. **OrgRail overlays the WorkspaceSidebar.** OrgRail renders as a normal flex sibling that grows `w-14 → w-56` on hover. But shadcn's `Sidebar` (the WorkspaceSidebar) is positioned `fixed left-0`, so it doesn't shift when OrgRail expands — the expanding rail just paints on top of it. Result: first 3-4 characters of every workspace nav label are hidden ("ome", "mpaigns", "ides" in the screenshot).
2. **Two `bg-sidebar` rails sit on top of each other** with no visual separation, so even at rest the user sees a strange double-dark column.
3. **Transition feels janky** because `transition-[width]` on a flex sibling reflows everything to its right on every mouseenter/leave, while the fixed shadcn sidebar stays put — visual contents jitter.
4. The org rail and the workspace sidebar both render their own "Fabric59" logo + brand mark, doubling chrome.

### Fix — overlay rail, reserved gutter

Make OrgRail an **always-56px reserved gutter** that expands to 224px as a floating overlay (z-index above the workspace sidebar). Nothing else in the layout reflows on hover. This is exactly the Supabase pattern.

**`src/shells/OrgRail.tsx`**
- Wrap the rail in an outer `<div className="relative w-14 shrink-0 hidden lg:block" />` so the layout always reserves 56px and nothing reflows.
- Inner panel becomes `absolute inset-y-0 left-0 w-14 hover:w-56 z-50 bg-sidebar border-r shadow-[2px_0_8px_rgba(0,0,0,0.04)] transition-[width] duration-150 ease-out`.
- Drop the inner Fabric59 wordmark — keep only the icon. The workspace sidebar already owns the brand lockup.
- Tighten hover area: add `aria-expanded` driven by `:hover` is fine, but extend the hover hit-zone by a small invisible right-side guard so the rail doesn't collapse the instant the pointer crosses into the secondary sidebar (`after:absolute after:inset-y-0 after:-right-1 after:w-1`).
- Replace per-label `opacity` fade with a single `[&_[data-label]]:opacity-0 hover:[&_[data-label]]:opacity-100 transition-opacity duration-100` for snappier text reveal.
- Add `data-state="collapsed"` / `"expanded"` via a `group` modifier so the active-indicator pill stays in sync.

**`src/shells/WorkspaceShell.tsx`**
- No structural change — `<OrgRail />` already sits left of `<WorkspaceSidebar />` inside the flex row. Once OrgRail reserves a real 56px slot, shadcn's fixed sidebar (`left-0`) gets visually pushed right by the SidebarProvider wrapper.
- Issue: shadcn `Sidebar` is `fixed left-0`, which means it still starts at viewport-left, not at left:56. Fix by wrapping the shadcn sidebar + content in a `<div className="flex-1 min-w-0 relative pl-0">` and setting `--sidebar-offset: 56px` on `SidebarProvider`, then overriding the Sidebar fixed wrapper via the `className` prop on `<Sidebar>` to `left-14` (and `group-data-[collapsible=offcanvas]:left-[calc(...)]` preserved). The sidebar's gap-spacer div stays as-is so main content lines up correctly.
- Remove the duplicate Fabric59 icon from `WorkspaceSidebar`'s `SidebarHeader` — OrgRail owns the brand lockup. Replace it with a slim workspace switcher chip (just the workspace initial in a square) so the header still has presence when collapsed.

**`src/components/layout/AdminShell.tsx`**
- No structural change needed — there's no secondary sidebar at `/admin/*`, so the overlay rail behaves cleanly. Just make sure the main column has `pl-0` (the 56px gutter is already reserved by OrgRail's outer wrapper).
- Consider giving the rail a permanent expanded state on `/admin/*` since there's no secondary nav competing for space. Two options:
  - **A — Keep hover-collapse everywhere.** Consistent feel across `/admin` and `/w/:id`. Rail is always 56px at rest.
  - **B — Auto-expand on `/admin/*`, hover-collapse only inside workspaces.** More discoverable for org-level work but creates a layout shift when entering/leaving a workspace.
  - I'd default to **A** for consistency; flag if you prefer B.

### Transition polish
- Shorten width transition from 200ms → 150ms with `ease-out`.
- Add `will-change: width` only while hovering (via `hover:will-change-[width]`) to avoid layer-promotion cost at rest.
- Remove the per-NavLink `transition-opacity` and let the parent's single fade drive all labels in lockstep — eliminates the "labels appear at different times" effect.

### Files touched
- `src/shells/OrgRail.tsx` — overlay model, drop wordmark, faster transition
- `src/shells/WorkspaceShell.tsx` — push shadcn Sidebar right by 56px via override className, drop duplicate Fabric59 in WorkspaceSidebar header
- `src/components/layout/AdminShell.tsx` — minor: ensure main column doesn't double-pad the 56px gutter

### Out of scope
- No changes to nav contents, route map, page bodies, design tokens, or mobile drawer behavior. Mobile (<lg) still hides OrgRail and uses the sheet-style WorkspaceSidebar.

### Open question
Pick rail behavior at `/admin/*`: **A** hover-collapsed (consistent) or **B** auto-expanded (more discoverable, but layout shifts when entering a workspace)? Default A unless you say otherwise.