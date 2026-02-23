

# Redesign Footer with Multi-Column Layout

## Overview

Replace the current single-row footer with a richer, multi-column footer inspired by the provided code. The footer will feature the Fabric59 brand, organized link sections, social links, and the existing UNSOX Digital attribution with the heart animation.

## New Footer Structure

```text
+---------------------------------------------------------------+
| Fabric59 Logo + Tagline  | Platform     | Legal    | Connect  |
| "Integration Hub"        | Pricing      | Terms    | Email    |
|                           | Build Outline| Security | LinkedIn |
|                           | Login        | Privacy  | Twitter  |
|                           | Sign Up      |          |          |
+---------------------------------------------------------------+
| (c) 2026 Fabric59. All rights reserved.                       |
| An UNSOX Digital Solution [heart]                              |
+---------------------------------------------------------------+
```

## Technical Details

### File: `src/pages/LandingPage.tsx` (lines 721-768)

Replace the current footer with a new multi-column layout:

**Top section** -- 4 columns on desktop, stacked on mobile:
1. **Brand column**: Fabric59Icon + "Fabric59" name + "Integration Hub" subtitle
2. **Platform column**: Pricing (#pricing anchor), Build Outline (/outline), Login (/login), Sign Up (/signup)
3. **Legal column**: Terms (/terms), Security (/security), Contact (mailto:hi@fabric59.com)
4. **Connect column**: Email (mailto:hi@fabric59.com with Mail icon), LinkedIn (placeholder URL), Twitter/X (placeholder URL)

**Bottom section** -- horizontal divider, then:
- Left: "(c) 2026 Fabric59. All rights reserved."
- Right: "An UNSOX Digital Solution" with the existing orange heart link to unsox.com

### File: `src/index.css`

Add `heartPulse` keyframe animation to support the hover effect from the provided code:

```css
@keyframes heartPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.5); }
}
```

### Icons

Already imported: `Mail`, `Heart`. Will add `Linkedin` and `Twitter` (or `ExternalLink`) from lucide-react for social links.

### Notes
- Social link URLs will use placeholder hrefs (e.g., `https://linkedin.com/company/fabric59`) -- the user can update these later.
- The existing heart animation classes (`animate-pulse`, `animate-heart-pop`) will remain; the CSS keyframe is added as a fallback for the inline style approach from the provided code.
- The footer keeps the existing `role="contentinfo"` and `aria-label` accessibility attributes.

## Files Modified

| File | Change |
|------|--------|
| `src/pages/LandingPage.tsx` | Replace footer section (lines 721-768) with multi-column layout |
| `src/index.css` | Add `heartPulse` keyframe animation |

