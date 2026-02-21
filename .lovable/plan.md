

# Landing Page Overhaul

## Overview

Major update to the landing page covering: bigger logo icon, redesigned footer with UNSOX branding, updated hero content, revised feature cards and platform features to match Fabric59's actual services, and contact/legal links.

---

## 1. Make Logo Icon Bigger in Header

**File: `src/pages/LandingPage.tsx`**
- Change `<Fabric59Logo iconSize="sm" />` to `iconSize="md"` so the icon renders at h-9/w-9 instead of h-6/w-6.

---

## 2. Redesigned Footer

**File: `src/pages/LandingPage.tsx`**

Replace the current minimal footer with a richer layout:

- **Left side**: Fabric59 icon + "(c) 2026 Fabric59" + separator + "An UNSOX Digital Solution" text + animated orange heart emoji/icon
  - The heart uses a CSS `pulse` animation by default and a `pop` (scale-up bounce) on hover
  - The heart is wrapped in an `<a>` linking to `https://unsox.com`
- **Center/Right nav links**: Login, Build Outline, Terms, Security, Contact (mailto:hi@fabric59.com)
- Clean horizontal layout with responsive stacking on mobile

**File: `src/index.css`** (or inline Tailwind)
- Add a `heart-pop` keyframe animation for the hover effect (scale 1 -> 1.3 -> 1 bounce)

---

## 3. Updated Hero Heading and Subtitle

**File: `src/pages/LandingPage.tsx`**

Change the hero content from Five9-specific messaging to match the platform's broader capabilities:

- **Badge**: "Five9 Integration Platform" (instead of "Build and Managed Services")
- **Headline**: "Automate. Integrate. Scale." with "Integrate." in primary cyan
- **Subtitle**: "The all-in-one platform for Five9 agent lifecycle management, CRM field mapping, and 55+ integrations -- built for BPOs and contact centers."

---

## 4. Revised Feature Cards (2-column)

**File: `src/pages/LandingPage.tsx`**

Replace the current "Launch Your Call Center" and "Scale Your Client Onboarding" cards with content that matches the actual platform features:

| Card | Title | Description |
|---|---|---|
| 1 | Agent Onboarding and Offboarding | Provision agents across Five9, Google Workspace, and Slack in one click. Automate deprovisioning with grace periods, data transfers, and full audit trails. |
| 2 | CRM Integration and Field Mapping | Visual drag-and-drop builder to map Five9 contact fields to any CRM. Support for Clio, Workiz, Salesforce, HubSpot, and more with transformation logic built in. |

---

## 5. Revised Platform Features Section (4-column)

**File: `src/pages/LandingPage.tsx`**

Update heading to: **"Built for Five9 teams that need to move fast"**

Updated cards:

| Card | Icon | Title | Description |
|---|---|---|---|
| 1 | UserCog | Agent Lifecycle | One-click provisioning and deprovisioning across Five9, Google Workspace, and Slack with automated credential delivery. |
| 2 | GitBranch | Field Mapping Builder | Visual canvas to connect Five9 contact fields to any CRM with drag-and-drop simplicity and custom transforms. |
| 3 | Plug | 55+ Integrations | Pre-built connectors for Salesforce, HubSpot, Slack, Twilio, Zapier, and dozens more -- ready to configure. |
| 4 | BarChart3 | Monitoring and Alerts | Real-time API logs, error tracking, and a built-in test console for every integration request. |

---

## Technical Details

- Orange heart icon uses lucide `Heart` icon with `fill="currentColor"` and `text-orange-500` styling
- Heart animation: default `animate-pulse`, on hover switches to a custom `animate-heart-pop` keyframe (scale bounce 1 -> 1.4 -> 1)
- Footer uses a responsive flex layout with `flex-wrap` for mobile
- All content changes are in `src/pages/LandingPage.tsx` only (plus a small CSS addition for the heart pop animation)
- No new files or dependencies needed

