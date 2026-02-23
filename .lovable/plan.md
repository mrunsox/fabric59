

# Replace Duplicate "55+ Integrations" Card

## Problem

The platform features grid has two cards covering integrations: "55+ Integrations" (card #3) and "Integration Hub" (card #12). They are redundant. The user wants to remove "55+ Integrations" and replace it with a different feature card.

## Replacement Card

**Disposition Email Engine** (Mail icon)
> "Route branded emails per disposition outcome. Configure per-disposition recipients, templates, and reply-to addresses with a built-in HTML email template depository."

This highlights the disposition email routing and email template management features that are already built (DispositionEmailTable, EmailTemplatesSection, WhiteLabelPartnerSelector) but not yet represented in the feature grid.

## Technical Details

### File: `src/pages/LandingPage.tsx`

1. Replace the `Plug` import usage for the "55+ Integrations" card with `Mail` from lucide-react (add `Mail` to the import).
2. Replace the "55+ Integrations" card (lines 84-89) with:

```ts
{
  icon: Mail,
  title: "Disposition Email Engine",
  description:
    "Route branded emails per disposition outcome. Configure per-disposition recipients, templates, and reply-to addresses with a built-in HTML email template depository.",
},
```

3. Update `softwareLD.featureList`: replace "55+ Integrations" with "Disposition Email Engine" (if it exists in the list).

No other files, dependencies, or database changes needed. Grid stays at 12 cards (4x3).

