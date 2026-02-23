

# Add 8th Platform Feature Card for Even Grid

## Overview

The platform features grid currently has 7 cards (4 + 3), leaving the second row uneven. Add one more card to create a clean 4x2 layout.

## New Card

**Integration Hub** (Plug icon)
> "Connect to 55+ tools including Salesforce, HubSpot, Slack, QuickBooks, and more. Pre-built connectors with OAuth flows and real-time sync status monitoring."

This card highlights the integrations catalog -- a major feature already built into the app (IntegrationsPage, integrations-catalog.ts) but not yet represented in the feature grid.

## Technical Details

### File: `src/pages/LandingPage.tsx`

1. Add `Plug` to the lucide-react import (line ~17-30).
2. Append one new entry to the `platformFeatures` array (after the Multi-Department Campaigns card at line 137):

```ts
{
  icon: Plug,
  title: "Integration Hub",
  description:
    "Connect to 55+ tools including Salesforce, HubSpot, Slack, QuickBooks, and more. Pre-built connectors with OAuth flows and real-time sync status monitoring.",
},
```

3. Update `softwareLD.featureList` to include "Integration Hub".

No other files, dependencies, or database changes needed.

