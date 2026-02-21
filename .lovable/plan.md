

# Add Dispositions as a Standalone Sidebar Nav Item

## Overview

Add a new "Dispositions" link in the admin sidebar navigation, positioned directly under "Clients". This will be a standalone page where the user first selects a domain, then uses the existing dispositions interface.

## Changes

### 1. New Page: `src/pages/admin/DispositionsPage.tsx`

A standalone page that:
- Fetches all domains for the current organization using the existing `useDomains` hook
- Shows a domain selector dropdown at the top
- Once a domain is selected, renders the existing `DispositionsTab` component with that domain's ID
- Shows a helpful empty state when no domain is selected yet

### 2. Update Sidebar Navigation: `src/components/layout/AdminLayout.tsx`

Add a new nav entry right after "Clients":

```
{ name: "Dispositions", href: "/admin/dispositions", icon: ListPlus, permission: "domains" }
```

The order becomes: ... Clients, Dispositions, Integrations ...

### 3. Add Route: `src/App.tsx`

Add the route inside the admin layout:

```
<Route path="dispositions" element={<DispositionsPage />} />
```

### 4. Keep the Tab in Domain Detail (optional)

The Dispositions tab inside the Domain Detail page stays as-is -- it's still useful for quick access when already viewing a specific domain.

## Files Changed

| File | Change |
|------|--------|
| `src/pages/admin/DispositionsPage.tsx` | New -- standalone page with domain selector + DispositionsTab |
| `src/components/layout/AdminLayout.tsx` | Add "Dispositions" nav entry after "Clients" |
| `src/App.tsx` | Add `/admin/dispositions` route |

