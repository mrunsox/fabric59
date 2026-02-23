

# Remove White-Label Branding from Landing Page

## Overview

Strip all references to white-label branding from the public landing page. The feature exists in the backend but should not be marketed or shown to visitors.

## Changes (all in `src/pages/LandingPage.tsx`)

### 1. Hero Feature Card -- "Campaign Automation" description
Remove the phrase "white-label partner branding" from the description. Updated text:
> "Build multi-department campaigns with per-disposition email routing and decision tree scripting with skip/jump logic -- all from a single intake form."

### 2. Platform Features Grid
Remove the entire "White-Label Branding" card (Palette icon, lines 127-131). The grid goes from 12 cards back to 11.

### 3. Pricing -- Professional Tier
Remove "White-label branding" from the Professional features list.

### 4. FAQ Updates
- **"What is Campaign Automation?"** -- Remove "white-label partner branding" from the answer.
- **"What does White-Label Branding include?"** -- Remove this entire FAQ item.
- **"How much does Fabric59 cost?"** -- Remove "white-label branding" from the Professional description.

### 5. Structured Data
- Remove "White-Label Branding" from `softwareLD.featureList`.
- Remove "white-label branding" from the Professional offer description in `softwareLD.offers`.

### 6. Cleanup
Remove unused `Palette` import from lucide-react (if no other card uses it).

## Files Modified

| File | Change |
|------|--------|
| `src/pages/LandingPage.tsx` | Remove all white-label references from feature cards, pricing, FAQ, and structured data |

No database or backend changes needed.

