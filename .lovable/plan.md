
# Fabric59 Branding Implementation Plan

## Overview

This plan rebrands the application from "Five9 Fabric" to **Fabric59**, including creating a custom logo and icon, updating all UI text references, and setting up the favicon.

---

## Brand Identity

### Visual Concept
The Fabric59 logo will feature a modern, geometric design combining:
- **"F"** letterform stylized with woven/fabric-inspired lines
- **"59"** integrated into the design
- Primary cyan/blue color from the existing theme (`hsl(199, 89%, 48%)`)
- Clean, professional SaaS aesthetic

### Logo Variants
1. **Full Logo**: "Fabric59" wordmark with icon
2. **Icon Only**: Square/rounded icon for favicon and small displays
3. **Light/Dark versions**: Optimized for both backgrounds

---

## Files to Create

| File | Purpose |
|------|---------|
| `public/fabric59-logo.svg` | Full logo with wordmark |
| `public/fabric59-icon.svg` | Icon-only version for favicon |
| `src/components/brand/Fabric59Logo.tsx` | Reusable logo component |
| `src/components/brand/Fabric59Icon.tsx` | Reusable icon component |

---

## Files to Modify

### 1. index.html
- Update `<title>` to "Fabric59"
- Update meta descriptions and OG tags
- Update favicon reference to use new icon

### 2. src/pages/auth/LoginPage.tsx
- Replace Zap icon with Fabric59Icon
- Update description from "Five9 Fabric" to "Fabric59"

### 3. src/pages/auth/SignupPage.tsx
- Replace Zap icon with Fabric59Icon  
- Update description text

### 4. src/components/layout/AdminLayout.tsx
- Replace Zap icon and "Five9 Fabric" text with Fabric59 branding
- Update "Integration Hub" subtitle

### 5. src/components/layout/MasterLayout.tsx
- Update branding in sidebar header

### 6. src/pages/onboarding/OnboardingPage.tsx
- Update text references from "Five9 Fabric" to "Fabric59"
- Keep "Five9 Domain" terminology (this refers to the external Five9 service, not the app name)

### 7. src/index.css
- Update comment from "Five9 Integration Fabric" to "Fabric59"

### 8. src/pages/master/MasterDashboardPage.tsx
- Update "Five9 Domains" label to "Domains" for cleaner display

---

## Logo Design Specification

The icon will be generated using AI image generation and will feature:

```
Design Elements:
- Geometric woven pattern forming abstract "F"
- Number "59" subtly integrated
- Rounded corners for modern feel
- Works at small sizes (16x16 favicon)
- Primary color: Cyan (#0EA5E9)
- Dark background compatible
```

---

## Text Changes Summary

| Location | Before | After |
|----------|--------|-------|
| Page title | "Lovable App" | "Fabric59" |
| Login description | "Five9 Fabric account" | "Fabric59 account" |
| Signup description | "Start connecting Five9 with your CRMs" | "Start connecting your CRMs" |
| Sidebar brand | "Five9 Fabric" | "Fabric59" |
| Sidebar subtitle | "Integration Hub" | "Integration Hub" |
| Onboarding complete | "Five9 Fabric account" | "Fabric59 account" |
| CSS comment | "Five9 Integration Fabric" | "Fabric59 Design System" |

---

## Implementation Order

1. **Create logo components** - SVG logo and icon files
2. **Create React components** - Reusable Fabric59Logo and Fabric59Icon
3. **Update index.html** - Title, meta tags, favicon
4. **Update auth pages** - LoginPage, SignupPage
5. **Update layouts** - AdminLayout, MasterLayout
6. **Update onboarding** - OnboardingPage
7. **Update CSS comments** - index.css

---

## Technical Notes

### SVG Logo Design
The logo will be created as inline SVG for:
- Sharp rendering at all sizes
- Easy color customization via CSS variables
- No external file dependencies for critical UI

### Favicon Implementation
- Generate favicon from the icon SVG
- Support both .ico and .svg formats
- Include apple-touch-icon for iOS

### Brand Consistency Going Forward
All future UI additions should:
- Use `<Fabric59Icon />` for small brand marks
- Use `<Fabric59Logo />` for full branding
- Reference brand colors from CSS variables
