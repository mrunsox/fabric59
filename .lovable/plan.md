

# Fix Remaining Color Contrast Issues Across Admin Pages

## Problem Analysis

From the screenshot, several text elements still have insufficient contrast on the Tenants page and likely other admin pages:

### Issues Identified

| Element | Location | Current Issue |
|---------|----------|---------------|
| Page title "Tenants" | TenantsPage header | Missing explicit `text-foreground` class |
| Large stat value (number) | StatCard component | `text-3xl font-bold` inherits color without explicit class |
| Tenant names in table | TenantsPage table render | `<p className="font-medium">` missing text color |
| Table headers | DataTable component | `text-muted-foreground` still appearing too dark |
| Breadcrumb "Tenants" | AdminLayout header | Font weight on current page name needs `text-foreground` |

---

## Root Cause

The issue is that while `--muted-foreground` was improved to 75% lightness, some elements are:
1. Not inheriting `text-foreground` properly from parent containers
2. Missing explicit color classes entirely
3. The card components use `text-card-foreground` which needs to cascade down

---

## Solution

Add explicit `text-foreground` classes to key text elements across multiple files, and ensure table headers are more visible.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/ui/stat-card.tsx` | Add `text-foreground` to value and explicit classes to other text |
| `src/pages/admin/TenantsPage.tsx` | Add `text-foreground` to page title and table cell text |
| `src/components/ui/data-table.tsx` | Change table header from `text-muted-foreground` to `text-foreground/80` |
| `src/components/layout/AdminLayout.tsx` | Add `text-foreground` to breadcrumb current page name |

---

## Detailed Changes

### 1. StatCard Component (stat-card.tsx)

**Line 53-54** - Add text color to title and value:
```tsx
// Current
<p className="text-sm font-medium text-muted-foreground">{title}</p>
<p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>

// Updated
<p className="text-sm font-medium text-muted-foreground">{title}</p>
<p className="mt-2 text-3xl font-bold tracking-tight text-foreground">{value}</p>
```

### 2. TenantsPage (TenantsPage.tsx)

**Line 163** - Add text color to page title:
```tsx
// Current
<h1 className="text-2xl font-bold">Tenants</h1>

// Updated
<h1 className="text-2xl font-bold text-foreground">Tenants</h1>
```

**Line 78** - Add text color to tenant name in table:
```tsx
// Current
<p className="font-medium">{tenant.name}</p>

// Updated
<p className="font-medium text-foreground">{tenant.name}</p>
```

### 3. DataTable Component (data-table.tsx)

**Lines 42-44, 74-76, 97-99** - Change table header color to brighter variant:
```tsx
// Current
<TableHead
  key={column.key}
  className={cn("text-muted-foreground font-medium", column.className)}
>

// Updated - use foreground with slight transparency for hierarchy
<TableHead
  key={column.key}
  className={cn("text-foreground/80 font-medium", column.className)}
>
```

### 4. AdminLayout (AdminLayout.tsx)

**Line 189** - Add text color to breadcrumb current page:
```tsx
// Current
<span className="font-medium">{currentPage?.name || "Dashboard"}</span>

// Updated
<span className="font-medium text-foreground">{currentPage?.name || "Dashboard"}</span>
```

---

## Additional Improvements

### Global CSS Enhancement

Update the `--card-foreground` value in dark mode to ensure it matches `--foreground`:

```css
/* In src/index.css */
.dark {
  --card-foreground: 210 40% 98%; /* Slightly brighter for cards */
}
```

This ensures all text inside cards inherits a visible color.

---

## Visual Result

After these changes:
- Page titles will be clearly visible with high contrast
- Stat card values (like "5" for Total Tenants) will be prominent
- Tenant names in the table will be easily readable
- Table headers will have adequate contrast (80% opacity foreground)
- Breadcrumb text will be clearly legible
- All text will maintain WCAG AA compliance

---

## Summary

The remaining contrast issues stem from text elements not having explicit color classes and relying on inheritance that doesn't always work correctly in dark mode. By adding explicit `text-foreground` classes to key elements like page titles, stat values, and table content, we ensure consistent visibility across the entire admin interface.

