

# Integrations Page Enhancements + Build Outline Update

## Overview

Three enhancements to the Integrations Library, plus updating the Build Outline to track all integration-related work.

## 1. Test the Integrations Page

Manual verification of search, category tabs, and detail dialog. No code changes needed -- this is a QA step after implementation.

## 2. Real Brand Logos for Integration Cards

Replace generic Lucide icons with actual brand SVG logos for recognizable integrations.

### Approach
- Download official SVG logos for ~20 well-known brands (Salesforce, Slack, HubSpot, Clio, etc.) and save them to `public/integration-logos/`
- Add an optional `logoUrl` field to the `Integration` interface in `integrations-catalog.ts`
- Update `IntegrationCard.tsx` and `IntegrationDetailDialog.tsx` to render `<img>` when `logoUrl` is present, falling back to the existing Lucide icon otherwise
- Logos will be sized to 20x20px on cards and 24x24px in the detail dialog

### Files to Modify
| File | Change |
|---|---|
| `src/data/integrations-catalog.ts` | Add optional `logoUrl?: string` to `Integration` interface; set logo paths for ~20 entries |
| `src/components/integrations/IntegrationCard.tsx` | Render `<img>` when `logoUrl` exists, else render Lucide icon |
| `src/components/integrations/IntegrationDetailDialog.tsx` | Same logo rendering logic |

### New Files
| File | Description |
|---|---|
| `public/integration-logos/*.svg` | ~20 brand SVG logos (Salesforce, Slack, HubSpot, Clio, Workiz, ServiceTitan, Zoom, Teams, Google Drive, Dropbox, DocuSign, Stripe, QuickBooks, Zapier, Make, Asana, Zendesk, Twilio, OpenAI, Monday.com) |

## 3. "Connected" Status on Integration Cards

Show which integrations are already active based on tenant data (CRM type and webhook URLs).

### Approach
- In `IntegrationsPage.tsx`, fetch tenants using the existing `useTenants` hook
- Build a `Set<string>` of connected integration IDs by checking:
  - `tenant.crm_type` matches an integration slug (e.g., `clio`, `workiz`, `salesforce`)
  - `tenant.slack_webhook_url` is set -> mark `slack` as connected
  - `tenant.zapier_webhook_url` is set -> mark `zapier` as connected
  - Same for `make_webhook_url`, `n8n_webhook_url`, `pabbly_webhook_url`
- Pass `isConnected` boolean to `IntegrationCard`
- Display a green "Connected" badge on the card when active, replacing or supplementing the existing status badge

### Files to Modify
| File | Change |
|---|---|
| `src/pages/admin/IntegrationsPage.tsx` | Import `useTenants`, compute connected set, pass `isConnected` prop |
| `src/components/integrations/IntegrationCard.tsx` | Accept `isConnected` prop, show green "Connected" badge |

## 4. Update Build Outline

Add an "Integrations Library" category to `buildMap.ts` tracking all integration features.

### File to Modify
| File | Change |
|---|---|
| `src/data/buildMap.ts` | Add new "Integrations Library" category with items for catalog page, search/filter, detail dialog, brand logos, connected status, and future configure flows |

### New entries:

- **Integrations Catalog Page** -- Marketplace-style grid of 55+ integrations (done)
- **Search and Category Filters** -- Real-time search and tab-based category filtering (done)
- **Integration Detail Dialog** -- Full details with supported actions and docs links (done)
- **Brand Logos** -- Real SVG logos for recognizable integrations (in-progress)
- **Connected Status Badges** -- Show which integrations are active per tenant (in-progress)
- **Integration Configure Flow** -- End-to-end setup wizard for each integration (planned)
- **Live API Connection Testing** -- Test integration credentials before saving (planned)

## Technical Notes

- The `logoUrl` field is optional so integrations without a downloaded logo gracefully fall back to the Lucide icon
- The connected status check runs client-side against already-fetched tenant data (no new API calls)
- SVG logos will be stored in `public/` for direct URL access without bundling overhead

