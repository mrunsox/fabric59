

# Add `tested` Flag to buildMap.ts + Merge with localStorage in OutlinePage

## Changes

### 1. Update `BuildItem` interface in `src/data/buildMap.ts`
- Add optional `tested?: boolean` field to `BuildItem`
- Go through every feature item and set `tested: true` on features that have been visually verified as working during testing (the ones we navigated to and confirmed render correctly)
- Features not yet verified keep no `tested` flag (defaults to `false`)

### 2. Update `src/pages/OutlinePage.tsx` merge logic
- On initialization, compute effective tested state by merging:
  1. **Defaults from buildMap**: scan all items, any with `tested: true` become the base
  2. **localStorage overrides**: layer on top, so manual toggles (checked or unchecked) take priority
- The merge logic: for each `category:item` key, use the localStorage value if it exists, otherwise fall back to the buildMap `tested` flag
- This means: if a dev marks something tested in code, it shows checked by default. If someone manually unchecks it in the UI, that override persists in localStorage.

### Technical Details

**`src/data/buildMap.ts`**:
```typescript
export interface BuildItem {
  name: string;
  description: string;
  status: ItemStatus;
  tested?: boolean;  // new optional field
}
```
Then add `tested: true` to every item confirmed working.

**`src/pages/OutlinePage.tsx`** -- update the `useState` initializer:
```typescript
const [tested, setTested] = useState<Record<string, boolean>>(() => {
  // Build defaults from buildMap
  const defaults: Record<string, boolean> = {};
  buildMap.forEach(cat =>
    cat.items.forEach(item => {
      if (item.tested) defaults[`${cat.name}:${item.name}`] = true;
    })
  );
  // Merge localStorage overrides on top
  try {
    const overrides = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return { ...defaults, ...overrides };
  } catch {
    return defaults;
  }
});
```

No other files change. The toggle and persistence logic stays the same -- localStorage always wins for any key that has been manually toggled.
