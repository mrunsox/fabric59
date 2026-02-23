

# Landing Page Sync: New Features, Campaign Setup, White-Label, and Pricing Section

## Problem

The landing page was written before Campaign Setup, White-Label Partner Branding, Per-Disposition Email Routing, Multi-Department Campaigns, Decision Tree Skip/Jump Logic, and the Email Template Depository were built. None of these appear on the landing page. There is also no pricing section.

---

## Changes

### 1. Add "Campaign Automation" to the Top 3 Feature Cards

Replace one of the existing hero cards or expand to 4 cards. The new card:

- **Title:** Campaign Automation
- **Icon:** Megaphone (from lucide)
- **Description:** "Build multi-department campaigns with per-disposition email routing, decision tree scripting with skip/jump logic, and white-label partner branding -- all from a single intake form."

The current 3 cards (Agent Onboarding, CRM Mapping, AI Call Flow) remain. This becomes a 4th card, changing the grid to `md:grid-cols-2 lg:grid-cols-4` for the hero cards.

### 2. Add New Platform Feature Cards

Add 4 new cards to the "Built for Five9 teams" grid (currently 8 cards, becomes 12 in a 4-column grid):

| Title | Icon | Description |
|-------|------|-------------|
| Campaign Automation | Megaphone | Multi-section intake form with auto-provisioning. Create campaigns, skills, profiles, and DNIS in Five9 with one click. |
| White-Label Branding | Palette | Run campaigns under your client's brand. Per-partner logos, colors, from/reply-to emails, and HTML email templates from a built-in depository. |
| Decision Tree Scripting | GitFork | Build agent call scripts with conditional branching, skip/jump logic, required data gates, time-based closings, and fallback persistence scripts. |
| Multi-Department Campaigns | Layers | One campaign, multiple departments. Tabbed configuration with per-department IVR routing, decision trees, and disposition email rules. |

### 3. Add Pricing Section

New section between "How It Works" and "FAQ" with anchor `#pricing`. Three-column card layout:

**Starter -- $197/mo**
- 1 Five9 domain
- Up to 25 agents
- CRM field mapping
- 10 integrations
- Email support
- CTA: "Get Started"

**Professional -- $497/mo** (highlighted/recommended)
- Up to 5 Five9 domains
- Unlimited agents
- AI Call Flow Builder
- Campaign automation
- White-label branding
- 55+ integrations
- Priority support
- CTA: "Get Started"

**Enterprise -- Custom**
- Unlimited domains
- Multi-tenant management
- Custom integrations
- Dedicated onboarding
- SLA and SSO
- CTA: "Contact Sales" (mailto:hi@fabric59.com)

### 4. Update FAQ

Add 2 new FAQ items:

- **"What is Campaign Automation?"** -- Explains multi-department campaigns, per-disposition email routing, decision tree scripting, and white-label branding.
- **"What does White-Label Branding include?"** -- Explains partner-branded disposition emails with custom logos, colors, from/reply-to addresses, and HTML template depository.

Update the existing pricing FAQ answer to reference the three tiers with actual prices instead of the current vague "flexible plans" language.

### 5. Update Header Navigation

Add a "Pricing" anchor link in the header nav between "How It Works" and "FAQ".

### 6. Update Structured Data

- Add pricing tiers to the `softwareLD` offers array (Starter $197, Professional $497, Enterprise contact)
- Add new features to the `featureList` array: "Campaign Automation", "White-Label Branding", "Decision Tree Scripting", "Multi-Department Campaigns"
- Add new FAQ items to `faqLD`

### 7. Update Footer

Add a "Pricing" link in the footer nav.

---

## Technical Details

### Files Modified

| File | Changes |
|------|---------|
| `src/pages/LandingPage.tsx` | Add campaign/white-label feature cards, pricing section, new FAQ items, nav links, structured data updates |

### No new files, no database changes, no new dependencies.

All changes are within the single `LandingPage.tsx` file -- updating data arrays and adding the pricing section JSX.

