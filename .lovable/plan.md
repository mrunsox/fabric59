

# Fix: Tour Keeps Reappearing After Dismissal

## Root Cause

The `profiles` table has no rows for the current user. When "Skip Tour" is clicked, the code calls `supabase.from("profiles").update(...)` which silently updates zero rows since there's no matching row. On next render, the check finds no data again and shows the tour.

## Fix

### File: `src/components/onboarding/GuidedTour.tsx`

Two changes:

1. **Use localStorage as immediate fallback** -- On dismiss, write `tour_completed_{tourKey}` to localStorage. On mount, check localStorage first before querying the database. This gives instant, reliable dismissal.

2. **Use `upsert` instead of `update`** -- When persisting to the database, use `upsert` so it creates the profile row if it doesn't exist, rather than silently failing on a missing row.

Updated logic:

- **On mount**: Check `localStorage` for the key `tour_completed_{tourKey}`. If found, don't show. Otherwise query `profiles` table.
- **On dismiss/skip**: Set `localStorage` key immediately, then `upsert` to `profiles` table with the updated `onboarding_completed` JSON.

This two-layer approach (localStorage + database) ensures the tour never reappears even if the database write fails.

## Files Changed

| File | Change |
|------|--------|
| `src/components/onboarding/GuidedTour.tsx` | Add localStorage check/write + switch `update` to `upsert` |

