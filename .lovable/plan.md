

# Optimize Admin Sidebar: Grouped Navigation with Collapsible Sections

## Problem

The sidebar currently lists 14 flat navigation items, making it feel overwhelming and hard to scan. Users have to visually parse everything to find what they need.

## Solution: Collapsible Nav Groups

Reorganize the 14 items into **4 logical groups** with collapsible headers. The group containing the active route stays open automatically. Other groups collapse to just their header, dramatically reducing visual noise.

### Proposed Grouping

```text
 My Dashboard              (always visible, top-level)
----------------------------------------------
 OPERATIONS                (collapsible group)
   Five9 Domains
   Agents
   Clients
   Dispositions
   Campaigns
----------------------------------------------
 CONFIGURATION             (collapsible group)
   Integrations
   Field Mappings
   Call Flow Builder
----------------------------------------------
 MONITORING                (collapsible group)
   API Logs
   Test Console
   Notifications
----------------------------------------------
 Settings                  (always visible, bottom)
 Build Outline             (always visible, bottom)
```

### Additional Optimizations

1. **Auto-expand active group** -- The group containing the current route is always open. Others collapse to just the group label, reducing the list from 14 visible items to as few as 6-7.

2. **Persistent collapse state** -- Remember which groups the user has manually opened/closed using localStorage so it persists across sessions.

3. **Subtle group labels** -- Small, uppercase, muted labels (like "OPERATIONS") act as section headers with a chevron toggle.

4. **Move "Settings" and "Build Outline" out of the scrollable list** -- Pin them to the bottom of the sidebar (above the user card) so they're always accessible without scrolling.

## Technical Details

### Changes to `AdminLayout.tsx`

- Replace the flat `navigation` array with a grouped structure:
  ```
  navigationGroups = [
    { label: null, items: [dashboard] },           // ungrouped top item
    { label: "Operations", items: [domains, agents, clients, dispositions, campaigns] },
    { label: "Configuration", items: [integrations, mappings, call-flow] },
    { label: "Monitoring", items: [logs, test-console, notifications] },
  ]
  bottomNav = [settings, outline]
  ```

- Use Radix `Collapsible` (already installed) for each group. The group auto-opens if it contains the active route. Clicking the group header toggles it.

- Store open/closed state in `localStorage` keyed by group label.

- Render `bottomNav` items in the footer section (above the org switcher), separated from the scrollable groups.

### Files Modified

| File | Changes |
|------|---------|
| `src/components/layout/AdminLayout.tsx` | Restructure navigation into collapsible groups, pin Settings/Outline to bottom |

No new dependencies or database changes needed. Uses the existing `Collapsible` component from Radix.

