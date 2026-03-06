

# Sort Outline: Unfinished Categories First

## Change

In `src/pages/OutlinePage.tsx`, sort the `buildMap` categories before rendering so that categories with any unfinished items (planned/in-progress) appear at the top, and fully-completed categories sink to the bottom.

## Implementation

Single change in `OutlinePage.tsx` — create a sorted copy of `buildMap` before the categories `.map()`:

```ts
const sortedCategories = [...buildMap].sort((a, b) => {
  const aComplete = a.items.every(i => i.status === "done");
  const bComplete = b.items.every(i => i.status === "done");
  if (aComplete === bComplete) return 0;
  return aComplete ? 1 : -1;
});
```

Then replace `buildMap.map(...)` with `sortedCategories.map(...)` in the JSX.

This is a display-only sort — the source data in `buildMap.ts` stays unchanged, so progress calculations remain correct.

