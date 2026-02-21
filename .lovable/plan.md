

# Dispositions Tab + Stop Master Admin Tour Popup

## Overview

Two changes:
1. Add a **Dispositions** tab to the Domain Detail page for bulk-creating Five9 dispositions and assigning them to campaigns/profiles
2. Stop showing the Admin tour popup to System Admin (master_admin) users

---

## 1. Dispositions Tab

### User Flow

1. Navigate to a domain's detail page and click the new **Dispositions** tab
2. Select a tenant from the dropdown (tenants linked to this domain's organization)
3. Paste dispositions in pipe-delimited format, one per line:
   ```
   Appointment Set | FinalApplyToCampaigns | Caller scheduled an appointment
   Not Interested | FinalApplyToCampaigns | Caller declined services
   Wrong Number | FinalApplyToContact | Invalid phone number
   ```
4. System parses and previews them in a table with validation
5. Select target campaigns and/or campaign profiles (fetched live from Five9)
6. Click **Create & Assign** to execute
7. Results panel shows success/failure per disposition

### Supported Disposition Types
- `FinalApplyToCampaigns` (default)
- `FinalApplyToContact`
- `AddActiveNumber`
- `DoNotDial`
- `NoneApplyToCampaigns`
- `NoneApplyToContact`

### Technical Changes

#### Edge Function: `supabase/functions/five9-provisioning/index.ts`

Add four new actions using Five9 Admin Web Services SOAP API:

- **`getCampaigns`**: Calls `<ser:getCampaigns/>` and returns campaign names
- **`getCampaignProfiles`**: Calls `<ser:getCampaignProfiles/>` and returns profile names
- **`createDispositions`**: For each disposition, calls `<ser:createDisposition>` with name, type, description. Processes sequentially, collects successes/failures (skips already-existing ones gracefully)
- **`addDispositionsToCampaigns`**: For each selected campaign, calls `<ser:addDispositionsToCampaign>` with the disposition names. For each selected profile, calls `<ser:modifyCampaignProfileDispositions>` with `addDispositionCounts`

#### New Hook: `src/hooks/useFive9Dispositions.ts`

- `useFive9Campaigns(domainId)` -- fetches campaigns via the edge function
- `useFive9CampaignProfiles(domainId)` -- fetches campaign profiles
- `useCreateDispositions()` -- mutation that creates dispositions and assigns to targets

#### New Component: `src/components/domains/DispositionsTab.tsx`

Self-contained tab with:
- Tenant selector dropdown
- Textarea for pasting dispositions in pipe-delimited format with format guide
- Parse preview table showing name, type, description with validation indicators
- Campaign multi-select checkboxes (fetched from Five9)
- Campaign Profile multi-select checkboxes (fetched from Five9)
- "Create & Assign" button
- Results summary panel showing per-disposition success/error status

#### Update: `src/pages/admin/DomainDetailPage.tsx`

- Add "Dispositions" TabsTrigger alongside existing tabs
- Add TabsContent rendering the DispositionsTab component
- Pass `domainId`, `canManage`, and organization ID as props

---

## 2. Stop Admin Tour for Master Admin

### Problem
When a master admin navigates to the Admin Dashboard (via the Dashboard Switcher), the AdminTour popup appears even though they don't need onboarding -- they are system-level operators.

### Fix

**File: `src/components/layout/AdminLayout.tsx`**

Conditionally render `<AdminTour />` only when the user is NOT a master admin. Import `useAuth` and check `isMasterAdmin`:

```
const { isMasterAdmin } = useAuth();
...
{!isMasterAdmin && <AdminTour />}
```

---

## Files Changed Summary

| File | Change |
|------|--------|
| `supabase/functions/five9-provisioning/index.ts` | Add `getCampaigns`, `getCampaignProfiles`, `createDispositions`, `addDispositionsToCampaigns` actions |
| `src/hooks/useFive9Dispositions.ts` | New -- hooks for campaigns, profiles, and disposition creation |
| `src/components/domains/DispositionsTab.tsx` | New -- full dispositions management UI |
| `src/pages/admin/DomainDetailPage.tsx` | Add Dispositions tab |
| `src/components/layout/AdminLayout.tsx` | Conditionally hide AdminTour for master admins |

