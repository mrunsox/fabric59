

# Generate Fabric59 Wordmark Logo with Woven Texture

## Overview

Create a full wordmark version of the Fabric59 logo that displays the icon alongside the "Fabric59" text in a horizontal layout, using AI image generation to achieve a polished woven texture aesthetic matching the existing icon.

---

## What We'll Create

### Wordmark Logo Asset
A horizontal logo featuring:
- The Fabric59 woven "F" icon on the left
- "Fabric59" text with woven/fabric texture treatment
- "Integration Hub" subtitle (optional variant)
- Optimized for headers, marketing pages, and hero sections
- Multiple size variants for different use cases

---

## Implementation Steps

### 1. Generate Wordmark Image via AI

Use the Lovable AI image generation to create a polished wordmark:

**Design Brief:**
- Horizontal layout (approx 400x100 or similar aspect ratio)
- Woven/interlaced "F" icon matching existing style
- "Fabric59" text with subtle fabric texture
- Cyan/teal primary color (#0EA5E9) on transparent or dark background
- Clean, modern SaaS typography
- Works on both light and dark backgrounds

### 2. Create Assets

| Asset | Size | Purpose |
|-------|------|---------|
| `fabric59-wordmark.png` | 400x100 | Standard header use |
| `fabric59-wordmark-light.png` | 400x100 | Light backgrounds |
| `fabric59-wordmark-dark.png` | 400x100 | Dark backgrounds |

### 3. Create Wordmark Component

**File:** `src/components/brand/Fabric59Wordmark.tsx`

A new React component that:
- Displays the generated wordmark image
- Supports size variants (sm, md, lg, xl)
- Works for headers, hero sections, and marketing pages
- Falls back to text + icon combo if image fails

### 4. Update Existing Logo Component

Enhance `Fabric59Logo.tsx` with:
- Option to use wordmark image vs icon + text
- New `variant` prop: "default" | "wordmark" | "icon-only"
- Consistent sizing across variants

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/assets/fabric59-wordmark.png` | Generated wordmark image |
| `public/fabric59-wordmark.png` | Copy for public access |
| `src/components/brand/Fabric59Wordmark.tsx` | Wordmark component |

## Files to Modify

| File | Change |
|------|--------|
| `src/components/brand/Fabric59Logo.tsx` | Add wordmark variant option |

---

## Component API

```tsx
// Wordmark for headers and marketing
<Fabric59Wordmark size="lg" />

// Updated logo with variant
<Fabric59Logo variant="wordmark" />
<Fabric59Logo variant="default" /> // icon + text (current)
<Fabric59Logo variant="icon-only" />
```

---

## Usage Examples

**Header/Navbar:**
```tsx
<Fabric59Wordmark size="md" />
```

**Marketing Hero:**
```tsx
<Fabric59Wordmark size="xl" className="mb-4" />
```

**Footer:**
```tsx
<Fabric59Wordmark size="sm" />
```

---

## AI Generation Prompt

The wordmark will be generated with this prompt:
```
Create a modern SaaS wordmark logo for "Fabric59". Design requirements:
- Horizontal layout, approximately 400x100 pixels
- On the left: the woven/interlaced "F" icon with subtle "59" integration
- On the right: "Fabric59" text in clean, modern sans-serif typography
- The text should have a subtle woven fabric texture overlay
- Primary color: Cyan/teal (#0EA5E9)
- Transparent background (or dark navy #0A1929)
- Professional, clean, minimalist SaaS aesthetic
- Text and icon should be visually balanced
- Optional: "Integration Hub" as smaller subtitle below main text
```

