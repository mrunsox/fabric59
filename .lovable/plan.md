

# Industry-Specific Interview Questions for Alex

## Overview

Currently Alex asks the same generic questions (CRM, Pre-Call, During Call, Post-Call, Notifications) regardless of the industry selected. This update makes each question curated to the chosen industry, so a Legal firm sees case-related options while a Home Services company sees job/dispatch options.

## What Changes

### System Prompt Update

**File: `supabase/functions/ai-call-flow/index.ts`**

Replace the static steps 2-6 with industry-branched question sets. After the user picks their industry in step 1, Alex tailors every subsequent question.

#### Industry-Specific Options

**Step 2 -- CRM** (varies by industry):
- Legal: Clio, MyCase, PracticePanther, Salesforce, Other/None
- Home Services: Workiz, ServiceTitan, Housecall Pro, Jobber, Other/None
- Healthcare: Athenahealth, Epic, Salesforce Health Cloud, Other/None
- Insurance: Applied Epic, HawkSoft, Salesforce, AgencyZoom, Other/None
- Other: Salesforce, HubSpot, Zoho, Other/None

**Step 3 -- Pre-Call** (varies by industry):
- Legal: CRM lookup, Conflict check, Case type routing, VIP client flag, Queue announcement
- Home Services: CRM lookup, Job status check, Technician availability, Priority routing, Queue announcement
- Healthcare: Patient record lookup, Insurance verification, Provider routing, HIPAA greeting, Queue announcement
- Insurance: Policy lookup, Claims status check, Agent routing, Priority flag, Queue announcement
- Other: CRM lookup, Screen pop, Priority routing, Queue announcement, Other

**Step 4 -- During Call** (varies by industry):
- Legal: Contact info, Case type/practice area, Opposing party, Court dates, Consultation notes
- Home Services: Contact info, Job type/trade, Address/service area, Scheduling preference, Dispatch notes
- Healthcare: Patient demographics, Insurance info, Symptoms/reason, Preferred provider, Appointment notes
- Insurance: Policy number, Claim details, Coverage type, Incident date, Agent notes
- Other: Contact info, Case/job details, Disposition codes, Custom fields, Notes

**Step 5 -- Post-Call** (varies by industry):
- Legal: Create CRM record, Conflict check alert, Schedule consultation, Email intake summary, Trigger webhook
- Home Services: Create job/ticket, Dispatch technician, Schedule estimate, SMS confirmation, Trigger webhook
- Healthcare: Update patient record, Schedule appointment, Referral notification, Secure email summary, Trigger webhook
- Insurance: Create/update claim, Assign adjuster, Policy document request, Email summary, Trigger webhook
- Other: Create CRM record, Slack notification, Book follow-up, Email summary, Trigger webhook

**Step 6 -- Notifications** remains the same across all industries (Slack, Email, SMS, Calendar invite, None).

### No Frontend Changes

The frontend chip detection and multi-select logic remain unchanged. The chips are dynamically extracted from whatever options Alex presents, so industry-specific options will automatically appear as clickable chips.

### No Database Changes

The tenants table schema stays the same. The industry-specific options are stored in `custom_mappings` as arrays, which already supports arbitrary values.

## Technical Details

The system prompt will use a structured format like:

```
After the user selects their industry, tailor steps 2-6 based on it:

IF Legal:
  Step 2 CRM options: Clio, MyCase, PracticePanther, Salesforce, Other/None
  Step 3 Pre-Call options: CRM lookup, Conflict check, Case type routing, VIP client flag, Queue announcement
  ...

IF Home Services:
  Step 2 CRM options: Workiz, ServiceTitan, Housecall Pro, Jobber, Other/None
  ...
```

The CRM type mapping for the save config will be extended:
- MyCase, PracticePanther, Athenahealth, Applied Epic, HawkSoft, AgencyZoom, ServiceTitan, Housecall Pro, Jobber, Zoho -> `other`
- Clio -> `clio`, Workiz -> `workiz`, Salesforce -> `salesforce`

The credential collection in step 8 will also be industry-aware -- Alex only asks for credentials relevant to the selected CRM (e.g., if they picked ServiceTitan, Alex asks for a ServiceTitan API key and tenant ID).

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/ai-call-flow/index.ts` | Replace static steps 2-6 with industry-branched question sets in the system prompt |

