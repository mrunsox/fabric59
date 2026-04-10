

# Marketing Pages Overhaul — Modern, Interactive, Feature-Rich

## Overview

Complete redesign of the marketing experience across 4 areas: (1) landing page with all backend features showcased, (2) interactive super mega menu header, (3) mega menu footer with lead magnets, and (4) transform /login and /signup into interactive landing pages with embedded auth.

## What Changes

### 1. Super Mega Menu Header
**File:** New `src/components/marketing/MegaMenuHeader.tsx`

Replace the current simple nav links with a full mega menu using Radix NavigationMenu (already installed). Four dropdown panels:

- **Platform** — 3-column grid showcasing: Agent Lifecycle, CRM Field Mapping, AI Call Flow Builder, Campaign Automation, Decision Tree Scripting, Legal Connect, Disposition Engine, Five9 Domain Management. Each item has icon + 1-line description + link.
- **Integrations** — Left column lists categories (CRM, Legal, Productivity, Communication), right column shows a scrolling logo grid of the 20 integration logos in `/public/integration-logos/`. Bottom CTA: "See all 55+ integrations."
- **Resources** — Lead magnets: "Five9 Automation Playbook" (PDF gated), "ROI Calculator" (interactive), "Migration Checklist" (gated), plus links to Build Outline, Security, FAQ.
- **Pricing** — Quick 3-tier comparison strip with CTAs, linking to #pricing section.

Mobile: Collapsible accordion version via Sheet/Drawer.

### 2. Landing Page Overhaul  
**File:** Rewrite `src/pages/LandingPage.tsx` (split into sub-components under `src/components/marketing/`)

New sections (all with framer-motion scroll animations):

- **Hero** — Animated gradient background with particle/grid effect. Rotating headline typewriter showing different use cases. Embedded mini-demo video placeholder or animated product mockup. Two CTAs + trust badges.
- **Logo Carousel** — Infinite-scroll ticker of integration logos (the 20 SVGs). "Works with 55+ tools."
- **Feature Showcase** — Interactive tabbed section (not static cards). 6 tabs: Agent Lifecycle, Field Mapping, Legal Connect, Campaign Engine, AI Call Flow, Reporting. Each tab reveals a product screenshot/mockup area + feature bullets + micro-animation.
- **Legal Connect Section** — NEW. Dedicated section for the Clio/MyCase integration pipeline we just built. Highlight: automated contact resolution, matter linking, disposition-driven CRM writebacks, webhook sync, policy engine.
- **Five9 Deep Integration Section** — NEW. Showcase: SOAP API provisioning, call variable management, pre-call lookup/screen-pop, Web Connector management, real-time agent sync.
- **Interactive Stats Counter** — Animated counting numbers: "55+ Integrations", "30+ SOAP Actions", "10+ CRM Providers", "<60s Agent Provisioning".
- **How It Works** — Redesigned as a horizontal stepper with connecting lines and animated icons.
- **Social Proof** — Testimonial cards (placeholder content for now) with avatar, name, role, quote.
- **Pricing** — Keep existing 3-tier but add toggle for monthly/annual, hover effects, feature comparison expandable.
- **FAQ** — Keep existing accordion but add search/filter.
- **CTA Banner** — Full-width gradient banner before footer: "Ready to automate your Five9 operations?" with email capture (lead magnet).

### 3. Mega Footer
**File:** New `src/components/marketing/MegaFooter.tsx`

Redesign the 4-column footer into a 5-column mega footer:

- **Brand Column** — Logo, tagline, social icons with hover effects, newsletter email signup (lead magnet).
- **Platform** — All major feature pages listed with icons.
- **Integrations** — Top integration categories with logo thumbnails.
- **Resources** — Lead magnets: Playbook PDF, ROI Calculator, Migration Checklist, Build Outline, API Docs link.
- **Company** — About, Security, Terms, Contact, Careers placeholder.

Bottom bar: Copyright, UNSOX Digital attribution, SOC2/security badges.

### 4. Login & Signup as Interactive Landing Pages
**Files:** Rewrite `src/pages/auth/LoginPage.tsx` and `src/pages/auth/SignupPage.tsx`

Transform from plain centered card into split-screen interactive landing pages:

**Login Page:**
- Left half: Animated product showcase — rotating feature highlights with icons and brief descriptions. Trust signals, customer count, security badges. Background animated gradient mesh.
- Right half: The existing login form card, slightly restyled to match.
- Mobile: Stacked — showcase collapses to a compact hero above the form.

**Signup Page:**
- Left half: Interactive "What you get" checklist with animated check marks appearing on scroll. Value proposition bullets. "Join 50+ contact centers" social proof.
- Right half: The existing signup form, kept functional as-is.
- Mobile: Same stacking pattern.

### 5. Shared Components Created
- `src/components/marketing/MegaMenuHeader.tsx` — Header with mega menu
- `src/components/marketing/MegaFooter.tsx` — Mega footer with lead magnets
- `src/components/marketing/LogoCarousel.tsx` — Infinite scroll integration logos
- `src/components/marketing/FeatureTabs.tsx` — Interactive tabbed feature showcase
- `src/components/marketing/StatsCounter.tsx` — Animated number counters
- `src/components/marketing/TestimonialCards.tsx` — Social proof section
- `src/components/marketing/LeadCaptureBar.tsx` — Email capture CTA banner

### 6. New Features Highlighted on Marketing Page
From the audit/implementation work, these backend capabilities will now be surfaced:
- Legal Connect (Clio + MyCase integration pipeline)
- Five9 SOAP provisioning (30+ actions)
- Pre-call lookup / screen-pop endpoint
- Call variable management
- Disposition-to-CRM action mapping
- Webhook sync with retry/dead-letter
- Policy engine (field-level allow/block/redact)
- AI-powered call flow builder
- E2E test console
- Agent context panel

### Files Summary

| Action | File |
|--------|------|
| New | `src/components/marketing/MegaMenuHeader.tsx` |
| New | `src/components/marketing/MegaFooter.tsx` |
| New | `src/components/marketing/LogoCarousel.tsx` |
| New | `src/components/marketing/FeatureTabs.tsx` |
| New | `src/components/marketing/StatsCounter.tsx` |
| New | `src/components/marketing/TestimonialCards.tsx` |
| New | `src/components/marketing/LeadCaptureBar.tsx` |
| Rewrite | `src/pages/LandingPage.tsx` |
| Rewrite | `src/pages/auth/LoginPage.tsx` |
| Rewrite | `src/pages/auth/SignupPage.tsx` |

No backend/DB changes needed. All auth functionality preserved as-is.

