

# Comprehensive Color Contrast Fix Across the Site

## Problem Analysis

Looking at the screenshot and codebase, there are systemic color contrast issues affecting readability across multiple components and pages. The issues fall into these categories:

### 1. Select/Dropdown Components
The `SelectTrigger` component uses `bg-background` which in dark mode has very low contrast with text. The placeholder text uses implicit colors that don't contrast well.

### 2. Labels and Text
Labels using `text-muted-foreground` (defined as `215 20% 65%` in dark mode - a medium gray) on dark backgrounds create insufficient contrast, especially in headers and toolbars.

### 3. Panel Headers
Headers like "Five9 Fields", "Target CRM", "New Mapping" in the mapping builder are barely visible.

### 4. Input Fields
Input fields have `bg-background` which in dark mode is very dark (`222 47% 6%`), causing text to blend in.

---

## Solution Overview

Update the CSS custom properties and add explicit text color classes throughout the application to ensure WCAG AA compliant contrast ratios.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/index.css` | Adjust `--muted-foreground` and `--input` CSS variables for better contrast |
| `src/components/ui/select.tsx` | Add `text-foreground` class to SelectTrigger |
| `src/components/ui/input.tsx` | Add `text-foreground` class |
| `src/components/mapping-builder/SourceFieldsPanel.tsx` | Add `text-foreground` to header and field labels |
| `src/components/mapping-builder/TargetFieldsPanel.tsx` | Add `text-foreground` to header and field labels |
| `src/components/mapping-builder/MappingToolbar.tsx` | Add `text-foreground` to mapping name |
| `src/pages/admin/MappingBuilderPage.tsx` | Add `text-foreground` to labels |
| `src/components/ui/data-table.tsx` | Ensure table cells have proper text color |

---

## Detailed Changes

### 1. CSS Variable Adjustments (index.css)

Update dark mode variables for better contrast:

```css
.dark {
  /* Increase muted-foreground brightness from 65% to 75% */
  --muted-foreground: 215 20% 75%;
  
  /* Lighten input background for better visibility */
  --input: 217 33% 22%;
}
```

### 2. Select Component (select.tsx)

Add explicit text color to SelectTrigger:

```tsx
// Line 20 - Update SelectTrigger className
"flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus:outline-none..."
```

### 3. Input Component (input.tsx)

Add explicit text color:

```tsx
// Line 11 - Update Input className
"flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground ring-offset-background..."
```

### 4. SourceFieldsPanel (mapping-builder/SourceFieldsPanel.tsx)

Add text-foreground to header:

```tsx
// Line 76 - Update header text
<h3 className="font-semibold text-sm text-foreground">Five9 Fields</h3>

// Line 145 - Update field label
<p className="text-sm font-medium truncate text-foreground">{field.label}</p>
```

### 5. TargetFieldsPanel (mapping-builder/TargetFieldsPanel.tsx)

Add text-foreground to header and labels:

```tsx
// Line 95-96 - Update label
<label className="text-xs font-medium text-foreground mb-1.5 block">
  Target CRM
</label>

// Line 175 - Update field label
<p className="text-sm font-medium truncate text-foreground">
```

### 6. MappingToolbar (mapping-builder/MappingToolbar.tsx)

Add text-foreground to mapping name:

```tsx
// Line 38 - Update mapping name
<h2 className="font-semibold text-sm text-foreground">
  {mappingName || "Untitled Mapping"}
```

### 7. MappingBuilderPage (pages/admin/MappingBuilderPage.tsx)

Add text-foreground to labels:

```tsx
// Line 225 - Update label
<label className="text-xs font-medium text-foreground">Five9 Domain</label>

// Line 248 - Update label
<label className="text-xs font-medium text-foreground">Mapping</label>
```

### 8. Data Table (components/ui/data-table.tsx)

Add text-foreground to TableCell:

```tsx
// Line 117 - Update TableCell
<TableCell key={column.key} className={cn("text-foreground", column.className)}>
```

---

## Additional Pages to Review

These pages may also need contrast fixes:
- `TenantsPage.tsx` - Table text visibility
- `ApiLogsPage.tsx` - Table text visibility  
- `MappingsPage.tsx` - Card content text
- `DomainsPage.tsx` - Already partially fixed

---

## Visual Impact

After these changes:
- All text will be clearly visible with proper contrast ratios
- Labels will be readable against dark card backgrounds
- Input placeholders will be distinguishable but not overwhelming
- Table content will be easily scannable
- The overall dark theme aesthetic will be maintained while improving accessibility

---

## Technical Notes

The root cause is the CSS variable `--muted-foreground` being set to `215 20% 65%` (a medium gray at ~65% lightness), which doesn't provide sufficient contrast against dark backgrounds at ~6-9% lightness. By:
1. Increasing `--muted-foreground` to 75% lightness
2. Adding explicit `text-foreground` classes to key text elements

We ensure WCAG AA compliance (4.5:1 contrast ratio for normal text).

