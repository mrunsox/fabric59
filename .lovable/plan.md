
# Fix Table Text Contrast in DomainsPage

## Problem Identified

The text in the "Domain" and "Display Name" columns is barely visible because:
1. The table cells don't have explicit text color classes
2. The text is inheriting a color that doesn't contrast well with the dark card background
3. Looking at the screenshot, the text appears extremely faded/dark on the dark background

---

## Solution

Add explicit `text-foreground` classes to the table cells to ensure proper contrast with the dark card background.

---

## File to Modify

| File | Change |
|------|--------|
| `src/pages/admin/DomainsPage.tsx` | Add `text-foreground` class to domain name and display name cells |

---

## Changes

### Line 178 - Domain Name
**Current:**
```tsx
<span className="font-medium">{domain.domain}</span>
```

**Updated:**
```tsx
<span className="font-medium text-foreground">{domain.domain}</span>
```

### Line 181 - Display Name Cell
**Current:**
```tsx
<TableCell>{domain.display_name}</TableCell>
```

**Updated:**
```tsx
<TableCell className="text-foreground">{domain.display_name}</TableCell>
```

---

## Visual Result

After the fix:
- Domain names will display in light text (96% lightness) on the dark card
- Display names will also use the proper foreground color
- Both columns will have clear, readable text matching the design system

---

## Summary

The fix adds explicit `text-foreground` Tailwind classes to ensure the table cell text uses the proper CSS variable (`--foreground: 210 40% 96%`) which provides good contrast against the dark card background (`--card: 222 47% 9%`).
