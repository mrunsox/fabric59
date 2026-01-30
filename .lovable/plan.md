
# Fix Remaining Contrast Issues in Dropdown Components

## Problem Identified

Looking at the screenshot, the contrast issues are in the organization switcher dropdown in the sidebar:

| Element | Issue |
|---------|-------|
| Dropdown trigger button text ("24H Virtual") | The `outline` button variant has no explicit text color, only `hover:text-accent-foreground` |
| Dropdown menu item text | Relies on inherited `text-popover-foreground` but may not render correctly in context |
| User email in dropdown | Text color not explicitly defined |

## Root Cause

The `Button` component's `outline` variant is defined as:
```tsx
outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground"
```

Notice there's NO default text color - it only sets the hover state. This means text color is inherited, which doesn't work correctly in the sidebar context.

Similarly, `DropdownMenuItem` doesn't explicitly set text color.

---

## Solution

### 1. Fix Button Outline Variant

Add explicit `text-foreground` to the outline variant:

**File: `src/components/ui/button.tsx`**
```tsx
// Line 14
// From:
outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",

// To:
outline: "border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
```

### 2. Fix DropdownMenuItem Text Color

Add explicit `text-popover-foreground` to menu items:

**File: `src/components/ui/dropdown-menu.tsx`**
```tsx
// DropdownMenuItem (around line 71)
// From:
"relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 focus:bg-accent focus:text-accent-foreground"

// To:
"relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm text-popover-foreground outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 focus:bg-accent focus:text-accent-foreground"
```

### 3. Increase Popover Foreground Brightness

Update the `--popover-foreground` variable to be brighter:

**File: `src/index.css`**
```css
.dark {
  /* Line 74 - brighten popover text */
  --popover-foreground: 210 40% 98%;
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/ui/button.tsx` | Add `text-foreground` to outline variant |
| `src/components/ui/dropdown-menu.tsx` | Add `text-popover-foreground` to DropdownMenuItem |
| `src/index.css` | Brighten `--popover-foreground` to 98% |

---

## Additional Fix: AdminLayout User Section

The user card in the sidebar footer may also need explicit text colors:

**File: `src/components/layout/AdminLayout.tsx`**
- Lines 153-157: The org name and email already use `text-sidebar-foreground` which should be visible
- Line 128: The dropdown trigger text relies on button styling

---

## Visual Result

After these fixes:
- The organization dropdown trigger ("24H Virtual") will have proper text contrast
- Dropdown menu items will display with explicit foreground color
- All popover/dropdown text will be clearly visible against dark backgrounds
- The button outline variant will work correctly throughout the application

---

## Summary

The core issue is that several components rely on color inheritance rather than explicit classes. By adding:
1. `text-foreground` to the outline button variant
2. `text-popover-foreground` to dropdown menu items
3. Brightening the popover foreground CSS variable

We ensure consistent visibility across all dropdown and button contexts.
