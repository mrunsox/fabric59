
# Fix Mapping Builder Page Layout and Remaining Contrast Issues

## Problems Identified

From the screenshot, there are two main issues:

### 1. Right Panel Getting Cut Off
The Target CRM panel on the far right is being clipped - the type badges (showing "st" for string) are cut off at the edge. This is caused by:
- The main content area uses `overflow-hidden` which clips content
- The page uses negative margin `-m-6` which pushes content outside the viewport
- The panel width doesn't account for the badge content properly

### 2. Remaining Contrast Issues
Some text elements are still missing proper contrast classes:
- Category headers in collapsible triggers are not explicitly styled with `text-foreground`
- The field path text under field labels needs better visibility

---

## Solution

### Layout Fixes

**MappingBuilderPage.tsx**
- Change `overflow-hidden` to `overflow-auto` on the main content container
- Ensure the layout properly contains all three panels without clipping
- Fix the height calculation to account for all content

**TargetFieldsPanel.tsx & SourceFieldsPanel.tsx**
- Add `flex-shrink-0` to the Badge components to prevent them from being compressed
- Ensure field items have `overflow-hidden` only on text content, not badges

### Contrast Fixes

**SourceFieldsPanel.tsx**
- Add `text-foreground` to the CollapsibleTrigger text
- Ensure all text elements have explicit color classes

**TargetFieldsPanel.tsx**
- Add `text-foreground` to the CollapsibleTrigger text
- Ensure category names are clearly visible

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/admin/MappingBuilderPage.tsx` | Fix overflow and layout issues |
| `src/components/mapping-builder/SourceFieldsPanel.tsx` | Add contrast classes to category headers |
| `src/components/mapping-builder/TargetFieldsPanel.tsx` | Add contrast classes and fix badge clipping |

---

## Detailed Changes

### MappingBuilderPage.tsx

**Line 216** - Adjust the root container to prevent clipping:
```tsx
// Current
<div className="flex flex-col h-[calc(100vh-8rem)] -m-6 animate-fade-in">

// Updated - use min-h instead and adjust margins
<div className="flex flex-col h-[calc(100vh-8rem)] -mx-6 -mt-6 animate-fade-in">
```

**Line 292** - Change overflow handling:
```tsx
// Current
<div className="flex flex-1 overflow-hidden">

// Updated - allow horizontal scroll if needed, or use overflow-x-auto
<div className="flex flex-1 min-w-0 overflow-hidden">
```

### SourceFieldsPanel.tsx

**Line 117** - Add text-foreground to CollapsibleTrigger:
```tsx
// Current
<CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-accent rounded-lg text-sm font-medium">

// Updated
<CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-accent rounded-lg text-sm font-medium text-foreground">
```

### TargetFieldsPanel.tsx

**Line 147** - Add text-foreground to CollapsibleTrigger:
```tsx
// Current
<CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-accent rounded-lg text-sm font-medium capitalize">

// Updated
<CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-accent rounded-lg text-sm font-medium capitalize text-foreground">
```

**Line 185-190** - Ensure Badge doesn't get clipped:
```tsx
// Current
<Badge
  variant="outline"
  className={cn("text-xs", categoryColors[category])}
>
  {field.type}
</Badge>

// Updated - add flex-shrink-0 to prevent compression
<Badge
  variant="outline"
  className={cn("text-xs flex-shrink-0", categoryColors[category])}
>
  {field.type}
</Badge>
```

Also update **line 163-165** for the field item container:
```tsx
// Current
<div
  key={field.path}
  className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent cursor-grab active:cursor-grabbing group transition-colors"

// Updated - ensure proper overflow handling
<div
  key={field.path}
  className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent cursor-grab active:cursor-grabbing group transition-colors overflow-hidden"
```

### Same updates for SourceFieldsPanel.tsx

**Line 150-155** - Add flex-shrink-0 to Badge:
```tsx
<Badge
  variant="outline"
  className={cn("text-xs flex-shrink-0", categoryColors[category])}
>
  {field.type}
</Badge>
```

---

## Visual Result

After these fixes:
- The right panel will display completely without clipping
- Type badges (string, email, etc.) will be fully visible
- Category headers will have proper contrast
- All text will be clearly readable against dark backgrounds
- The three-panel layout will fit properly within the viewport

---

## Summary

The layout issue is caused by `overflow-hidden` on the parent container combined with negative margins. By adjusting the overflow behavior and ensuring badges don't compress, the right panel will display correctly. The contrast fixes add explicit `text-foreground` classes to remaining text elements that were missing proper color definitions.
