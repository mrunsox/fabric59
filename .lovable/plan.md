

# Five9 Inbound Campaign Setup -- Intake Form + Automated Build

## Overview

Build a comprehensive Campaign Setup module that lets your onboarding team fill out a single, thorough intake form with every variable needed to stand up a Five9 inbound campaign. On submit, the system auto-creates what it can via the Five9 SOAP API and tracks remaining manual items in a live checklist.

## How It Works

1. **Onboarding team opens /admin/campaigns and clicks "New Campaign"**
2. **They fill out a detailed, section-by-section intake form** covering every variable: campaign name, client name, ANIs, DNIS, schedule, prompts, dispositions, connectors, decision tree, skill/user assignments, and notes
3. **On submit**, the system saves the intake to the database, then auto-provisions Five9 objects (campaign, skill, profile, DNIS, dispositions) via SOAP API
4. **The Campaign Detail page** shows a read-only summary of the intake alongside a live checklist where automated items are already checked off, and manual items can be ticked as the team completes them in Five9

## Intake Form Design (Thorough and Intuitive)

The form uses collapsible card sections (matching the existing Card/Accordion patterns in the app). Each section has a clear header, helper text explaining what the fields are for, and smart defaults where possible.

### Section 1: Campaign Basics
- **Campaign Name** (required) -- e.g. "Alberta Driving Consultants"
- **Client Name** (required, free text) -- new client, not a dropdown since they are not yet active
- **Campaign Description** (optional textarea)
- **White-Label Partner?** (toggle with tooltip: "Enable if this campaign is for a white-label partner")

### Section 2: Phone Numbers and Routing
- **ANI / Caller ID Numbers** -- dynamic multi-input (add/remove rows), with placeholder guidance: "e.g. +14035551234"
- **DNIS Numbers** -- dynamic multi-input with inline note: "US customers get US numbers, CA customers get CA numbers"
- **Transfer Display Number** -- single input with helper: "The number that displays to the recipient during a call transfer"

### Section 3: Schedule and Coverage
- **Coverage Type** -- radio group: "24/7" or "Scheduled"
- If Scheduled:
  - **Weekday Hours** -- start/end time pickers
  - **Weekend Hours** -- start/end time pickers, with a "No weekend coverage" toggle
  - **After-Hours Handling** -- radio group: VM | Overflow Queue | Disconnect | Transfer to External Number
  - If "Transfer to External Number": phone number input appears

### Section 4: Prompts (Fetched from Five9)
All prompt fields are **dropdowns populated from the Five9 `getPrompts` API**, showing existing prompts on the domain. Each has a "None" option.

- **IVR Greeting** (dropdown)
- **Whisper Prompt** (dropdown)
- **Hold Music** (dropdown)
- **IVR Hold/Announcement Message** (dropdown)
- **VM Greeting** -- toggle between "Select existing prompt" (dropdown) and "Upload custom" (file upload for audio). This is the only field that supports upload since custom VM greetings are common.

Helper text at the top: "These are the prompts already configured on your Five9 domain. Select the appropriate prompt for each section."

### Section 5: Dispositions
- **Existing Dispositions** -- multi-select fetched from Five9
- **New Dispositions** -- text input (comma-separated) for ones that need creating
- **Enable Disposition Email?** (toggle)
  - If yes: Email Template name, Recipients, Reply-To address, From address
  - Inline note for blocked items: "Waiting for Roman" (auto-populated from checklist defaults)
- **Disposition Menu Grouping** (optional text)

### Section 6: Connectors and Scripts
- **Backend Document Connector** -- toggle + URL input
- **Website Connector** -- URL input
- **Script Connector** -- name or URL input
- Helper text: "Connectors link external resources to the campaign for agent reference"

### Section 7: Agent Decision Tree / Worksheet
A structured Q&A builder for the agent script:
- Each node: Question text + list of answer options
- Each answer routes to: another question, or an action (Transfer, Disposition, Escalate)
- "Add Question" button adds nodes; drag-to-reorder or arrow buttons for ordering
- Stored as JSON in the intake data
- Collapsible tree preview below the builder shows the flow visually
- Helper text: "Build the step-by-step script agents follow during calls. Each question can branch based on the caller's response."

### Section 8: Skill and User Assignment
- **Skill Name** -- auto-suggested from campaign name, editable
- **Assign Users** -- multi-select populated from Five9 `getAllUsers`
- **Add Skill to IVR Routing?** (toggle)

### Section 9: Final Notes
- **Additional Notes** (textarea) -- for anything not covered above
- **Priority** -- radio: Normal / Urgent
- **Target Go-Live Date** (date picker)

### Form Footer
- **"Save as Draft"** button -- saves progress, can return later
- **"Submit and Build"** button -- validates, saves, kicks off API provisioning

### UX Details
- Each section is a collapsible Card with a numbered header and completion indicator (checkmark when all required fields in that section are filled)
- Form state persists to the database as a draft on every section change (auto-save with debounce)
- Validation uses zod schemas with clear error messages
- Responsive: stacks vertically on mobile, comfortable spacing on desktop
- Section helper text in muted color below each header explains purpose

## What Happens on Submit

1. Save intake to `campaign_setups` table (status: "submitted")
2. Auto-create a tenant record from the Client Name field
3. Redirect to Campaign Detail page
4. Execute automated Five9 API calls in sequence:
   - `createInboundCampaign`
   - `createSkill`
   - `createCampaignProfile`
   - `addSkillsToCampaign`
   - `addDNISToCampaign` (for each DNIS number)
   - `createDispositions` (for any new ones)
   - `addDispositionsToCampaign`
5. Each success checks off the corresponding checklist item
6. Manual items remain as clickable checkboxes

## Campaign Detail Page (Post-Submit)

Two-panel layout:
- **Left (65%)**: Read-only summary of all intake data, organized by section, with an "Edit" button to return to the form
- **Right (35%)**: Live checklist sidebar with all ~40 items grouped by category, showing done/pending/blocked status. Automated items show green checkmarks. Manual items are interactive checkboxes. Blocked items show the blocker text (e.g. "Waiting for Roman").

A completion progress bar at the top shows overall percentage.

## Campaign List Page

Table with columns: Campaign Name, Client Name, Status (draft/submitted/provisioning/live/archived), Checklist Progress (e.g. "28/40"), Target Go-Live, Created date. Click to open detail page.

## Database Changes

### New table: `campaign_setups`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, default gen_random_uuid() |
| organization_id | uuid | FK-style reference to organizations |
| five9_domain_id | uuid | Nullable, FK-style to five9_domains |
| campaign_name | text | Required |
| client_name | text | Required, free text |
| campaign_type | text | Default "inbound" |
| intake_data | jsonb | All form field values |
| checklist_state | jsonb | Per-item done/pending/blocked status |
| status | text | draft, submitted, provisioning, live, archived |
| notes | text | Additional notes |
| priority | text | normal, urgent |
| target_go_live | timestamptz | Nullable |
| created_by | uuid | User who created |
| created_at | timestamptz | Default now() |
| updated_at | timestamptz | Default now() |

RLS policies:
- Org admins/owners can manage (insert/update/delete) campaigns in their org
- Org members can view campaigns in their org
- Master admin and platform admins have full access

### Storage bucket: `campaign-assets`
For custom VM greeting audio uploads only. RLS: authenticated users in the same org can upload/read.

## Edge Function Changes

**`supabase/functions/five9-provisioning/index.ts`** -- Add 6 new actions:

| Action | SOAP Method | Purpose |
|--------|-------------|---------|
| `getPrompts` | `getPrompts` | Fetch existing prompts from the domain |
| `createInboundCampaign` | `createInboundCampaign` | Create campaign object |
| `createSkill` | `createSkill` | Create a new skill |
| `createCampaignProfile` | `createCampaignProfile` | Create campaign profile |
| `addSkillsToCampaign` | `addSkillsToCampaign` | Link skill to campaign |
| `addDNISToCampaign` | `addDNISToCampaign` | Add DNIS numbers |

## Navigation

Add "Campaigns" to AdminLayout sidebar between "Dispositions" and "Integrations":
- Icon: Megaphone
- Permission: "domains"

## New Files

| File | Purpose |
|------|---------|
| `src/types/campaign.ts` | Interfaces for intake data, checklist items, decision tree nodes |
| `src/hooks/useCampaignSetup.ts` | CRUD operations, Five9 API orchestration, checklist state management |
| `src/pages/admin/CampaignsPage.tsx` | Campaign list table |
| `src/pages/admin/CampaignIntakePage.tsx` | Intake form page |
| `src/pages/admin/CampaignDetailPage.tsx` | Detail view + live checklist |
| `src/components/campaigns/CampaignIntakeForm.tsx` | Multi-section collapsible form |
| `src/components/campaigns/CampaignChecklist.tsx` | Sidebar checklist component |
| `src/components/campaigns/DecisionTreeBuilder.tsx` | Nested Q&A decision tree editor |
| `src/components/campaigns/DecisionTreePreview.tsx` | Visual tree preview |
| `src/components/campaigns/PromptSelector.tsx` | Dropdown fetching Five9 prompts |
| `src/components/campaigns/MultiInput.tsx` | Reusable add/remove rows input for ANIs/DNIS |

## Changed Files

| File | Change |
|------|--------|
| `supabase/functions/five9-provisioning/index.ts` | Add 6 new SOAP actions |
| `src/components/layout/AdminLayout.tsx` | Add "Campaigns" nav item with Megaphone icon |
| `src/App.tsx` | Add routes: `/admin/campaigns`, `/admin/campaigns/new`, `/admin/campaigns/:id` |
| `src/data/buildMap.ts` | Add "Campaign Setup" category with all new items |
| Migration SQL | Create `campaign_setups` table with RLS + `campaign-assets` bucket |

## Checklist Items (All ~40, by Category)

| Category | Task | Auto? |
|----------|------|-------|
| **Objects** | Create Campaign | Yes |
| | Create Campaign Profile | Yes |
| | Create Skill | Yes |
| | Create Prompts (select existing) | From intake |
| | Create Connectors | Manual |
| | Create IVRs | Manual |
| **Important** | WL Partner? | From intake |
| | VM Configured? | From intake |
| | DNIS Tested? | Manual |
| **Campaign Profile** | Configure ANIs | Manual |
| | Configure Layout (Interaction fields) | Manual |
| | Configure Disposition Menu | Manual |
| | Associate Profile to Campaign | Yes |
| **Skill** | Add Users | Manual |
| | Add Skill to Campaign | Yes |
| | Add Skill in IVR Routing | Manual |
| **Campaign** | Add DNIS | Yes |
| | IVR Schedule -- Business Hours | Manual |
| | IVR Schedule -- After Hours | Manual |
| | Add Dispositions | Yes |
| | Add Connectors | Manual |
| | Add Script (embedded) | Manual |
| | Configure Worksheets | Manual |
| | Add Hold Music | Manual |
| | Add Whisper Prompt | Manual |
| **Connector** | Backend Document | Manual |
| | Website | Manual |
| | Script | Manual |
| **IVR** | IVR Greeting | Manual (prompt pre-selected) |
| | Announcement/Hold Message | Manual |
| | Configure VM | Manual |
| **Prompts** | Upload Whisper | Pre-selected from intake |
| | Upload IVR Greeting | Pre-selected from intake |
| | Upload VM Message | Pre-selected or uploaded |
| **Dispositions** | Enable Email | Manual (blocked: "Waiting for Roman") |
| | Select Email Template | Manual (blocked) |
| | Set Recipients | Manual (blocked) |
| | Set Reply-To | Manual (blocked) |
| | Set From Address | Manual (blocked) |
| | Configure in Disposition Menu | Manual |
| **Misc** | Add to Transfer Tracker | Manual |
| | Check DNIS Area Code | Manual |
| | Turn ON Campaign | Manual |
| | Test and Approve to go LIVE | Manual |

