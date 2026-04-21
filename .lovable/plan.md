

# Add expandable nav rail with labels

The current sidebar is a fixed 64px icon-only rail. Add a toggle that expands it to ~224px with full labels next to each icon, and remember the user's preference.

## What changes

`src/components/layout/AdminShell.tsx`

- Add `expanded` state, initialized from `localStorage` key `fabric59:nav:expanded` (default: `false`).
- When expanded: rail width becomes `w-56` (224px), icons stay left-aligned with the section label rendered to the right; tooltips disappear (labels are visible).
- When collapsed: current 64px icon-only behavior stays exactly as is.
- Add a small **toggle button** at the bottom of the rail (above the Sign Out button) using `PanelLeftClose` / `PanelLeftOpen` from lucide. Tooltip: "Collapse" / "Expand".
- Main content offset switches between `lg:pl-16` (collapsed) and `lg:pl-56` (expanded) so nothing jumps under the rail.
- Logo header gets a small label "Fabric59" rendered next to the icon when expanded.
- Smooth `transition-[width,padding]` on the rail and main column.
- Persist `expanded` to `localStorage` on every change so the choice sticks across reloads and routes.
- Mobile (`lg:hidden`): toggle is hidden — mobile always uses the existing slide-in drawer at full collapsed width.

## Files

**Edited (1):**
- `src/components/layout/AdminShell.tsx` — add expand/collapse state, toggle button, conditional widths, label rendering

**No new files, no DB changes, no other components touched.**

## Acceptance

- A toggle button appears at the bottom of the left rail on desktop
- Clicking it expands the rail to show full section labels next to each icon
- Clicking again collapses back to the icon-only rail
- The choice persists across page reloads
- Mobile drawer behavior is unchanged

