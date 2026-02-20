

# Integrations Library for Five9 Fabric

## Overview

Create a new "Integrations" page accessible from the admin sidebar that serves as a marketplace-style library of all available third-party integrations. Each integration card will show the app name, logo, category, description, supported actions (what data can be pushed/pulled), API type, and a connection status. This is a catalog-first approach -- the library surfaces what is available and what each integration can do in the context of a Five9-powered call center.

## Integration Categories and Catalog

The library will be organized into these categories, each containing integrations relevant to call center operations:

### CRM / Practice Management (core call center integrations)
| Integration | API Type | Actions | Use Case |
|---|---|---|---|
| Clio (Manage + Grow) | REST (OAuth2) | Create/lookup contacts, create matters, log activities, push intake leads | Legal intake from Five9 calls |
| Salesforce | REST (OAuth2) | Create leads, contacts, cases, log call activities | General CRM intake |
| ServiceTitan | REST (API Key) | Create bookings, lookup customers, create jobs | Home services dispatching |
| Workiz | REST (API Key) | Create jobs, leads, lookup clients | Field service dispatching |
| Jobber | REST (OAuth2) | Create requests, clients, quotes | Field service scheduling |
| Housecall Pro | REST (API Key) | Create jobs, customers, estimates | Residential services |
| Smokeball | REST (OAuth2) | Create matters, contacts, intake | Legal practice management |
| MyCase | REST (OAuth2) | Create cases, contacts, intake | Legal case management |
| PracticePanther | REST (OAuth2) | Create matters, contacts, billing entries | Legal PM |
| Filevine | REST (API Key) | Create projects, contacts, log activities | Legal case management |
| CosmoLex | REST (API Key) | Create matters, contacts, time entries | Legal PM with accounting |
| HubSpot | REST (OAuth2) | Create contacts, deals, tickets, log calls | Marketing + Sales CRM |
| Zoho CRM | REST (OAuth2) | Create leads, contacts, deals | General CRM |
| Microsoft Dynamics 365 | REST (OAuth2) | Create leads, contacts, cases | Enterprise CRM |
| Zendesk | REST (API Key) | Create tickets, contacts, log calls | Support CRM |

### Communication / Messaging
| Integration | API Type | Actions | Use Case |
|---|---|---|---|
| Slack | REST (OAuth2/Webhook) | Post call summaries, intake alerts, agent notifications | Team notifications |
| Microsoft Teams | REST (OAuth2) | Post messages, create channels, call notifications | Team collaboration |
| Twilio | REST (API Key) | Send SMS confirmations, follow-up texts | Client follow-up |
| RingCentral | REST (OAuth2) | Transfer calls, send SMS, voicemail transcription | Telephony bridge |
| Zoom | REST (OAuth2) | Schedule meetings, send invite links post-call | Virtual consultations |
| Google Chat | REST (OAuth2) | Post messages, intake alerts | Team messaging |

### Productivity / Scheduling
| Integration | API Type | Actions | Use Case |
|---|---|---|---|
| Google Workspace (Calendar) | REST (OAuth2) | Create calendar events, schedule appointments | Appointment booking |
| Microsoft 365 (Outlook) | REST (OAuth2) | Create events, send emails, schedule follow-ups | Appointment + email |
| Calendly | REST (API Key) | Create scheduling links, check availability | Self-service booking |
| Asana | REST (OAuth2) | Create tasks, assign follow-ups | Task management |
| Monday.com | REST (API Key) | Create items, update boards | Project tracking |

### Document / Storage
| Integration | API Type | Actions | Use Case |
|---|---|---|---|
| Google Drive | REST (OAuth2) | Upload call recordings, intake forms, documents | File storage |
| Dropbox | REST (OAuth2) | Upload/share documents, call recordings | Cloud storage |
| OneDrive | REST (OAuth2) | Upload documents, share files | Microsoft storage |
| DocuSign | REST (OAuth2) | Send signature requests post-call | E-signatures |
| Adobe Sign | REST (OAuth2) | Send signing requests | E-signatures |
| HelloSign | REST (OAuth2) | Send signature requests | E-signatures |
| NetDocuments | REST (OAuth2) | Upload/organize legal documents | Legal DMS |

### Billing / Payments
| Integration | API Type | Actions | Use Case |
|---|---|---|---|
| Stripe | REST (API Key) | Create payment links, process payments | Payment collection |
| QuickBooks Online | REST (OAuth2) | Create invoices, log time entries | Accounting |
| LawPay | REST (API Key) | Create payment requests, trust accounting | Legal billing |
| TimeSolv | REST (API Key) | Log time entries, create invoices | Legal time tracking |

### Workflow Automation
| Integration | API Type | Actions | Use Case |
|---|---|---|---|
| Zapier | Webhook | Trigger on any event (intake, call, contact) | No-code automation |
| Make (Integromat) | Webhook | Trigger on any event | Visual automation |
| n8n | Webhook | Trigger on any event | Self-hosted automation |
| Pabbly Connect | Webhook | Trigger on any event | Budget automation |
| Power Automate | REST (OAuth2) | Trigger flows on events | Microsoft automation |

### AI / Legal Tech
| Integration | API Type | Actions | Use Case |
|---|---|---|---|
| ChatGPT / OpenAI | REST (API Key) | Summarize calls, draft follow-ups, extract entities | AI assistance |
| Casetext (CoCounsel) | REST (API Key) | Legal research from intake data | Legal AI research |
| Spellbook | REST (API Key) | Draft contracts from intake info | Contract drafting |
| Harvey AI | REST (API Key) | Legal document analysis | Legal AI |

## Implementation

### New Files to Create

1. **`src/pages/admin/IntegrationsPage.tsx`** -- Main integrations library page with:
   - Search bar to filter integrations by name
   - Category filter tabs (All, CRM, Communication, Productivity, etc.)
   - Grid of integration cards showing: icon/logo, name, category badge, short description, supported actions list, API type badge, and a "Configure" button
   - Each card will be purely presentational for now (no live connection logic yet), with a "Coming Soon" or "Available" status

2. **`src/data/integrations-catalog.ts`** -- Static data file containing the full catalog of ~50+ integrations with metadata:
   - `id`, `name`, `description`, `category`, `icon` (lucide icon name), `apiType`, `actions[]`, `docsUrl`, `status` (available/coming_soon/beta)

3. **`src/components/integrations/IntegrationCard.tsx`** -- Reusable card component for each integration

4. **`src/components/integrations/IntegrationDetailDialog.tsx`** -- Dialog that opens when clicking an integration card, showing full details: description, supported actions with descriptions, API documentation link, and setup instructions

### Files to Modify

5. **`src/App.tsx`** -- Add route `/admin/integrations` pointing to `IntegrationsPage`

6. **`src/components/layout/AdminLayout.tsx`** -- Add "Integrations" nav item with a `Plug` icon between "Tenants" and "Field Mappings"

## Technical Details

- The integrations catalog is a static TypeScript data file (no database table needed yet)
- Each integration entry includes: `id`, `name`, `slug`, `category`, `description`, `longDescription`, `apiType`, `authMethod`, `actions` (array of {name, description, direction: 'inbound'|'outbound'}), `docsUrl`, `logoIcon` (lucide icon), `status`
- Categories are filterable via tabs
- Search filters by name, description, and category
- The detail dialog shows what data can be sent to/from Five9 for each integration
- Card layout uses the existing shadcn Card component with consistent styling
- "Configure" button on each card will be a placeholder that shows a toast ("Integration setup coming soon") for now, except for integrations already built (Clio, Workiz, Salesforce, Slack, Zapier, Make, n8n, Pabbly) which will link to the tenant form

