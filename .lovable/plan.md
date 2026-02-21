
# Fix Tenant Edit Dialog Scroll + Alphabetical Client Selection

## Issues

1. The tenant edit dialog content overflows the screen when Slack Notifications and Workflow Automations sections are expanded. The dialog needs internal scrolling.
2. The client selection list in `ClientSelectDialog.tsx` is unsorted -- needs alphabetical ordering.

## Changes

### 1. Fix Tenant Edit Dialog Overflow

**File: `src/pages/admin/TenantsPage.tsx`**
- Add `max-h-[85vh]` and `overflow-y-auto` to both the Create and Edit `DialogContent` elements so the form scrolls within the dialog when content is tall.

### 2. Alphabetical Client Selection

**File: `src/components/integrations/ClientSelectDialog.tsx`**
- Add `.sort((a, b) => a.name.localeCompare(b.name))` to the `filtered` memo so clients are always listed A-Z.

## Technical Details

- The `DialogContent` max-height ensures the dialog never exceeds 85% of the viewport, with overflow scroll for the form content
- The alphabetical sort runs after filtering so the sorted order is maintained regardless of search input
- No new dependencies or files needed
