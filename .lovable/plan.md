

# Enhanced Disposition Assignment with Categories

## Overview

Upgrade the Dispositions page so you can control exactly which dispositions go to campaigns vs campaign profiles, and create disposition groups (categories) in campaign profiles before assigning dispositions under them.

## Current Behavior

All parsed dispositions are sent to ALL selected campaigns AND all selected campaign profiles identically. No support for disposition groups/categories.

## Proposed Changes

### 1. Per-Disposition Assignment Target

Add a new column to the parse preview table: **"Assign To"** with a dropdown per disposition row letting you choose:
- **Both** (default) -- add to selected campaigns AND profiles
- **Campaigns Only** -- only add to selected campaigns
- **Profiles Only** -- only add to selected campaign profiles

This way you control which dispositions go where.

### 2. Disposition Groups for Campaign Profiles

Add a new section in the "Assign to Campaigns & Profiles" card specifically for campaign profile disposition grouping:

- **"Create Disposition Groups"** area with a text input to type a group name and an "Add Group" button
- A list of created groups shown as collapsible cards
- Each disposition assigned to profiles gets a dropdown to select which group it belongs to (or "Ungrouped")
- Groups are created first in Five9 via the API, then dispositions are added under those groups

### 3. Updated Input Format (optional 4th field)

Extend the pipe-delimited format to optionally include a group name:

```
Name | Type | Description | Group
```

Example:
```
Appointment Set | FinalApplyToCampaigns | Scheduled | Sales Outcomes
Not Interested | FinalApplyToCampaigns | Declined | Sales Outcomes
Wrong Number | FinalApplyToContact | Bad number |
Callback | FinalApplyToCampaigns | Wants callback | Follow-Up
```

If a group is specified, it auto-populates the group assignment for campaign profiles.

### 4. Execution Flow

When "Create & Assign" is clicked:

1. Create all dispositions in Five9 (same as today)
2. For selected **campaigns**: call `addDispositionsToCampaign` with only the "Both" and "Campaigns Only" dispositions
3. For selected **campaign profiles**:
   a. First, create any new disposition groups via `modifyCampaignProfileDispositions` with `addDispositionGroups`
   b. Then, add dispositions to those groups (or ungrouped) via `modifyCampaignProfileDispositions` with `addDispositionCounts`

---

## Technical Details

### Edge Function Changes: `supabase/functions/five9-provisioning/index.ts`

Update the `addDispositionsToCampaigns` action to accept richer payload:

- `campaignDispositions: string[]` -- disposition names for campaigns
- `profileDispositions: Array<{ name: string, group?: string }>` -- disposition names with optional group for profiles
- `dispositionGroups: string[]` -- group names to create in profiles

For campaign profiles, the SOAP calls become:

**Step A -- Create groups:**
```xml
<ser:modifyCampaignProfileDispositions>
  <profileName>My Profile</profileName>
  <addDispositionGroups>Sales Outcomes</addDispositionGroups>
  <addDispositionGroups>Follow-Up</addDispositionGroups>
</ser:modifyCampaignProfileDispositions>
```

**Step B -- Add dispositions under groups:**
```xml
<ser:modifyCampaignProfileDispositions>
  <profileName>My Profile</profileName>
  <addDispositionCounts>
    <disposition>
      <name>Appointment Set</name>
    </disposition>
    <count>-1</count>
    <groupName>Sales Outcomes</groupName>
  </addDispositionCounts>
</ser:modifyCampaignProfileDispositions>
```

For ungrouped dispositions, omit the `<groupName>` element.

### Hook Changes: `src/hooks/useFive9Dispositions.ts`

Update `CreateDispositionsPayload` to include:
- `campaignDispositions` and `profileDispositions` instead of a single list
- `dispositionGroups: string[]`

Update mutation logic to pass the richer payload to the edge function.

### UI Changes: `src/components/domains/DispositionsTab.tsx`

- Add "Assign To" select column in the parse preview table (Both / Campaigns Only / Profiles Only)
- Add optional 4th pipe field for group name in parser
- Add "Disposition Groups" section with:
  - Text input + "Add Group" button to create groups
  - Auto-populated groups from parsed input
  - Per-disposition group dropdown for profile-targeted dispositions
- Update results panel to show group creation results

---

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/five9-provisioning/index.ts` | Update `addDispositionsToCampaigns` to handle groups and per-target dispositions |
| `src/hooks/useFive9Dispositions.ts` | Update payload types and mutation logic |
| `src/components/domains/DispositionsTab.tsx` | Add per-dispo target selector, group management UI, updated parser |

