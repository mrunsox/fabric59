
# Fix Integrations Page Scroll, Tenant Integration Badges, and Configure Flow

## Overview

Three fixes for the Integrations page and Tenants page:

1. Fix the category tabs and grid overflowing the screen -- make the page scrollable within the main content area
2. Show active integrations as badges on each tenant row in the Tenants table
3. Change "Configure in Clients" button to open a client selection dialog, then navigate to that specific client in the Tenants tab

---

## 1. Fix Scroll Overflow on Integrations Page

**Problem**: When all category tabs are visible plus the grid of cards, the content extends beyond the viewport with no scroll.

**Root cause**: The `TabsList` uses `flex flex-wrap` which can grow tall, and the outer `div` has no height constraint. The `main` element in `AdminLayout.tsx` has no overflow handling.

**Fix** (two files):

### `src/pages/admin/IntegrationsPage.tsx`
- Wrap the `TabsList` in a horizontal `ScrollArea` so tabs scroll horizontally instead of wrapping and pushing everything down
- Change `flex flex-wrap` to `inline-flex` so tabs stay in a single row
- The page itself will naturally scroll via the browser since the main content area already allows it

### `src/components/layout/AdminLayout.tsx`
- Add `overflow-y-auto` to the `<main>` element and give it a calculated height (`h-[calc(100vh-4rem)]`) so it scrolls independently of the header

---

## 2. Show Active Integrations on Tenant Rows

**Problem**: The tenant table currently shows CRM type, status, API endpoint, and last updated -- but does not show which integrations (Slack, Zapier, Make, etc.) are active for each tenant.

**Fix**: Add a new column "Integrations" to the Tenants table between "API Endpoint" and "Last Updated".

### `src/pages/admin/TenantsPage.tsx`
- Add a new column called "Integrations" that renders small icon badges for each active integration:
  - Show CRM type badge (Clio, Workiz, Salesforce) if set and not "other"
  - Show Slack icon if `slack_webhook_url` is set
  - Show Zapier icon if `zapier_webhook_url` is set
  - Show Make icon if `make_webhook_url` is set
  - Show n8n icon if `n8n_webhook_url` is set
  - Show Pabbly icon if `pabbly_webhook_url` is set
  - Show a dash if none are active
- Each badge will be a small pill with the integration logo (from `public/integration-logos/`) or a text label

---

## 3. "Configure" Button Opens Client Selection Dialog

**Problem**: Clicking "Configure in Clients" on an integration detail dialog navigates directly to `/admin` without letting the user choose which client to configure.

**Fix**: Replace the direct navigation with a two-step flow:

### New Component: `src/components/integrations/ClientSelectDialog.tsx`
- A dialog/sheet that shows a searchable list of all tenants (clients)
- Each row shows the client name, CRM type, and whether this integration is already configured for them
- Clicking a client closes both dialogs and navigates to `/admin` with the tenant ID as a query param (e.g., `/admin?edit=<tenant-id>`)

### `src/components/integrations/IntegrationDetailDialog.tsx`
- Change `handleConfigure` for linked integrations to open the `ClientSelectDialog` instead of navigating directly
- Add state to track whether the client selection dialog is open
- Pass the current integration info to the client select dialog for context

### `src/pages/admin/TenantsPage.tsx`
- On mount, check for `?edit=<tenant-id>` query param
- If present, find that tenant and auto-open the edit dialog for it
- Clear the query param after opening

---

## Files Summary

| File | Change |
|---|---|
| `src/components/layout/AdminLayout.tsx` | Add scroll to main content area |
| `src/pages/admin/IntegrationsPage.tsx` | Horizontal scroll for tabs instead of wrapping |
| `src/pages/admin/TenantsPage.tsx` | Add "Integrations" column to table; handle `?edit=` query param to auto-open edit dialog |
| `src/components/integrations/IntegrationDetailDialog.tsx` | Open client selection dialog on "Configure" click |
| `src/components/integrations/ClientSelectDialog.tsx` | **New** -- searchable client list dialog for selecting which tenant to configure |
