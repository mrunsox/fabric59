

# UI/UX & Copy Cleanup Sprint

## 1. Hyphen/Dash Cleanup (~35 files)
Scan all `.tsx` files for `—`, `–`, and decorative `-`. Rewrite sentences to use commas, colons, or short sentences. Keep hyphens only in compound words (e.g., "AI-powered", "real-time"), phone numbers, and URL slugs.

Key files: `ContactPage`, `SecurityPage`, `PrivacyPage`, `OutlinePage`, `BillingPage`, `NotificationsPage`, `CampaignDetailPage`, `AbandonRatePage`, `TestConsolePage`, `Report59UploadPage`, and ~25 others identified in the search.

## 2. `toTitleCase` Utility
Add `toTitleCase(input: string): string` to `src/lib/utils.ts`. Capitalizes significant words, keeps minor words lowercase (a, an, the, and, but, or, for, nor, at, by, from, in, of, on, to, up, with, as, into, over, onto, per, vs), preserves acronyms.

## 3. CSS Title Case for Headings
Add to `src/index.css` base layer:
```css
h1, h2, h3, h4, h5, h6 {
  text-transform: capitalize;
}
```
One line, instant site-wide effect.

## 4. Scroll-to-Top Button
- **New file:** `src/components/layout/ScrollToTopButton.tsx` with fixed bottom-left `ChevronUp` button, appears after 300px scroll, smooth-scrolls to top, primary color, rounded, shadow.
- Wire into `AdminLayout.tsx` and `LandingPage.tsx`.
- Existing `ScrollToTop` route-change reset is already in `App.tsx`.

## 5. OG Image / Social Share Metadata
- Replace the expiring Google Cloud Storage OG image URL in `index.html` with a stable self-hosted path (`/og-image.png`).
- Generate a 1200x630 branded OG image with Fabric59 logo and brand colors, saved to `public/og-image.png`.
- Ensure `og:image`, `og:title`, `og:description`, `twitter:card`, `twitter:image` are consistent and use absolute URLs.

## 6. Build Map Update
Add a "UI/UX Cleanup" category to `src/data/buildMap.ts` with items for this sprint.

## Files

| File | Action |
|------|--------|
| `src/lib/utils.ts` | Add `toTitleCase` function |
| `src/index.css` | Add `text-transform: capitalize` for h1-h6 |
| `src/components/layout/ScrollToTopButton.tsx` | New: scroll-to-top button |
| `src/components/layout/AdminLayout.tsx` | Add `<ScrollToTopButton />` |
| `src/pages/LandingPage.tsx` | Add `<ScrollToTopButton />` |
| `index.html` | Update OG image to stable path |
| `public/og-image.png` | Generated branded OG image |
| ~35 `.tsx` files | Rewrite dash punctuation |
| `src/data/buildMap.ts` | Add sprint items |

