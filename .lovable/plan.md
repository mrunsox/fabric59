

# Fix Domain Status, Contrast Issues, and Clean Up Workflow Tab

## Issues Identified

### 1. "Pending Verification" status never updates to "Active"
The `test-five9-connection` edge function updates the `api_connection_status` column to `"connected"` on success, but it never touches the `status` column. So `status` stays at its default `"pending_verification"` forever -- even after a successful connection.

**Fix**: Update the edge function to also set `status = 'active'` when the connection succeeds. Additionally, fix the existing database record directly (it currently has `status: pending_verification` with `api_connection_status: connected`).

### 2. Form label contrast issues (dark-on-dark)
The uploaded screenshot shows labels and helper text are barely visible against the dark card backgrounds. This is a systemic issue with the dark theme on the main content area.

### 3. Light background for main dashboard area
The user wants the main content area (everything to the right of the sidebar) to use a light background. The sidebar will stay dark. This means removing `className="dark"` from the AdminLayout root and instead scoping `dark` only to the sidebar.

### 4. What is the Workflow tab?
The "Workflow" tab (Call Handling + greeting) and "Branding" tab are placeholder configuration sections. They store optional metadata (greeting text, company name, brand color) in the domain's `workflow_settings` JSON column. They are not connected to Five9 -- they are local settings for future use. For now, they can remain as-is or be hidden. The plan keeps them but this is noted for the user.

## Changes

### A. Edge function: auto-set status to "active" on successful connection
**File**: `supabase/functions/test-five9-connection/index.ts`

Add `status: 'active'` to the success update block (around line 177-191):

```typescript
const updateData: Record<string, unknown> = {
  api_connection_status: "connected",
  last_connection_test: new Date().toISOString(),
  status: "active",  // <-- add this
};
```

### B. Fix existing database record
Run a migration to update the existing domain that is already connected but stuck on `pending_verification`:

```sql
UPDATE five9_domains
SET status = 'active'
WHERE api_connection_status = 'connected' AND status = 'pending_verification';
```

### C. Light background for main content area
**File**: `src/components/layout/AdminLayout.tsx`

- Remove `dark` from the root `<div>` class (`className="dark min-h-screen bg-background"` becomes `className="min-h-screen bg-gray-50"`)
- Wrap only the `<aside>` sidebar in `dark` class so it keeps its dark theme
- Update the top header bar to use light-compatible styling (`bg-white border-gray-200`)
- The main content `<Outlet />` renders with the default light theme variables

### D. Fix form contrast for light mode
Since the main area will now be light, form labels, inputs, and helper text will naturally have proper contrast using the existing light-mode CSS variables already defined in `index.css`. No additional CSS changes needed -- the light-mode variables already have dark text on light backgrounds.

## Files to Modify

| File | Change |
|---|---|
| `supabase/functions/test-five9-connection/index.ts` | Add `status: 'active'` to success update |
| Database migration | Fix existing stuck record |
| `src/components/layout/AdminLayout.tsx` | Light background for main area, dark stays on sidebar only |

## What the Workflow tab is for
The Workflow and Branding tabs store optional local configuration (default greeting, company name, brand color) in the domain's JSON settings. They are not connected to Five9 -- they are for future features like auto-populating agent scripts or branding agent-facing UIs. No changes are planned for these tabs in this update.
