

# Fabric59 Landing Page + Bold New Logo/Icon/Favicon

## Overview

Build a targeted hero-style landing page at `/` and redesign the Fabric59 logo, icon, and favicon to be bolder and more impactful.

---

## 1. Bold New Logo, Icon, and Favicon

The current icon is a PNG with a subtle "F" and small "59" text -- it lacks punch at small sizes. We will replace it with a bold, high-contrast SVG-based design.

### New Icon Design
- Bold geometric "F" letterform on a vibrant cyan (#0EA5E9) rounded-square background
- Thicker strokes, higher contrast, no small text (the "59" is too small to read at favicon size)
- Pure SVG so it stays crisp at every size

### Files to Create/Modify

| File | Change |
|---|---|
| `public/fabric59-icon.svg` | Replace with new bold SVG icon |
| `public/favicon.ico` | Generate from the new SVG |
| `index.html` | Update favicon link to use SVG: `<link rel="icon" type="image/svg+xml" href="/fabric59-icon.svg">` |
| `src/components/brand/Fabric59Icon.tsx` | Switch from PNG import to SVG path (`/fabric59-icon.svg`) |
| `src/components/brand/Fabric59Wordmark.tsx` | Keep PNG wordmark but ensure it pairs well with new icon |
| `src/components/brand/Fabric59Logo.tsx` | No changes needed (composes Icon + Wordmark) |

---

## 2. Landing Page

A public marketing page at `/` modeled after the reference image -- centered hero, bold heading, feature cards, and CTA buttons.

### Page Structure

**Header**
- Fabric59 logo (new bold icon + text) on the left
- Nav links: Features, Build Outline
- Login and "Get Started" buttons on the right

**Hero Section**
- Small pill badge: "Five9 Build and Managed Services"
- Bold headline: **"Your Five9. Built Right. Delivered Fast."**
- Subtitle paragraph about full-service Five9 setup
- Two CTA buttons: "Get Started" (primary) and "View Build Outline" (outline)

**Feature Cards (2-column grid)**
- "Launch Your Call Center" -- description + CTA
- "Scale Your Client Onboarding" -- description + CTA
- Dark card backgrounds with subtle cyan border hover effects

**Platform Features Grid**
- 4 cards highlighting key capabilities pulled from the build outline categories:
  - Agent Lifecycle Management
  - Field Mapping Builder
  - Integrations Library
  - Monitoring and Logs

**Footer**
- Fabric59 branding, copyright, links to Login / Build Outline

### Files

| File | Change |
|---|---|
| `src/pages/LandingPage.tsx` | **New** -- full landing page component |
| `src/App.tsx` | Change `/` route from `<Navigate to="/admin">` to render `<LandingPage />` |

---

## 3. Build Outline Update

Add entries to track the landing page and branding work.

| File | Change |
|---|---|
| `src/data/buildMap.ts` | Add "Branding and Landing" category with items for Landing Page, Bold Logo/Icon, and Favicon |

---

## Technical Notes

- The landing page is fully public (no auth required)
- Uses existing design tokens (primary cyan, dark card backgrounds, border colors)
- Responsive: single column on mobile, two columns for feature cards on desktop
- "Get Started" links to `/signup`, "Login" links to `/login`, "Build Outline" links to `/outline`
- SVG favicon provides crisp rendering across all browsers and sizes
