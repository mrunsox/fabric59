

# Combined Plan: Call Log Reporting + Campaign Archive/Deprovisioning

## Feature 1: White-Label Gated Call Log Reporting

### Overview
Build a disposition-gated call log reporting system where admins control which dispositions each partner organization can see, and partners can view/export/schedule reports.

### Database Changes

**Table: `disposition_access`**
- `id` (uuid, PK)
- `organization_id` (uuid, NOT NULL) -- which partner org
- `disposition_name` (text, NOT NULL) -- allowed disposition
- `created_by` (uuid) -- admin who granted access
- `created_at` (timestamptz)
- UNIQUE constraint on (organization_id, disposition_name)
- RLS: admins/master_admin can manage; org members can SELECT their own org's rows

**Table: `call_log_cache`**
- `id` (uuid, PK)
- `organization_id` (uuid, NOT NULL)
- `five9_domain_id` (uuid)
- `call_data` (jsonb) -- timestamp, campaign, agent, customer, phone, duration, disposition
- `call_timestamp` (timestamptz) -- indexed for fast range queries
- `fetched_at` (timestamptz)
- RLS: org members can view their own org's cached logs

**Table: `scheduled_reports`**
- `id` (uuid, PK)
- `organization_id` (uuid, NOT NULL)
- `created_by` (uuid)
- `frequency` ("daily" | "weekly" | "monthly")
- `date_range_type` ("previous_day" | "previous_week" | "previous_month" | "custom")
- `filters` (jsonb) -- campaign, agent, disposition filters
- `export_format` ("pdf" | "xlsx" | "csv")
- `five9_report_id` (text) -- ID returned from Five9 API
- `status` ("active" | "paused" | "cancelled")
- `last_run_at` (timestamptz)
- `created_at` / `updated_at`
- RLS: org owners/admins can manage; org members can view

### Edge Functions

**`five9-reporting`** (new)
- Action: `getCallLogs` -- Calls Five9 Statistics API to fetch call detail records for a date range, filtered by allowed dispositions
- Action: `createScheduledReport` -- Calls Five9 API to create a scheduled report configuration
- Action: `deleteScheduledReport` -- Removes a scheduled report from Five9
- Action: `getScheduledReports` -- Lists active Five9 scheduled reports

**`report-export`** (new)
- Action: `exportCSV` -- Generates CSV from call log data
- Action: `exportXLSX` -- Generates XLSX (using a lightweight Deno-compatible library or manual XML generation)
- Action: `exportPDF` -- Generates PDF table (using a simple HTML-to-PDF approach or jsPDF-compatible Deno library)

### Frontend Components

**Admin: Disposition Gating Config**
- New section in Settings page OR a dedicated page
- Table showing all Five9 dispositions with checkboxes per organization
- "Select All" / "Deselect All" per org
- Save updates the `disposition_access` table

**Partner: Reports Page (`/admin/reports`)**
- New nav item "Reports" in the Operations group
- Date range picker (start/end date using existing Calendar component)
- Filter dropdowns: Campaign, Agent, Disposition (only showing allowed dispositions)
- Search box for customer name / phone number
- Paginated data table showing: Timestamp, Campaign, Agent, Customer Name, Phone, Duration, Disposition
- Export buttons: PDF, XLS, CSV (each calls the export edge function)
- "Schedule Report" button opening a modal

**Schedule Report Modal**
- Frequency selector (daily/weekly/monthly)
- Date range type (previous day, previous week, etc.)
- Filter presets (same filters as the main view)
- Export format selector
- Submits to Five9 API via edge function, saves record in `scheduled_reports`

**Scheduled Reports Management Tab**
- Table of active scheduled reports
- Pause/Cancel/Delete actions
- Last run timestamp

### New Files
| File | Purpose |
|------|---------|
| `src/pages/admin/ReportsPage.tsx` | Main reports page with filters, table, exports |
| `src/components/reports/CallLogTable.tsx` | Paginated call log data table |
| `src/components/reports/ReportFilters.tsx` | Date range + filter controls |
| `src/components/reports/ScheduleReportModal.tsx` | Modal for creating scheduled reports |
| `src/components/reports/DispositionGatingConfig.tsx` | Admin config for allowed dispositions per org |
| `src/hooks/useCallLogs.ts` | Hook to fetch/filter call logs via edge function |
| `src/hooks/useDispositionAccess.ts` | Hook to manage disposition access table |
| `src/hooks/useScheduledReports.ts` | Hook for scheduled reports CRUD |
| `supabase/functions/five9-reporting/index.ts` | Five9 reporting API integration |
| `supabase/functions/report-export/index.ts` | CSV/XLSX/PDF export generation |

### Modified Files
| File | Change |
|------|--------|
| `src/App.tsx` | Add `/admin/reports` route |
| `src/components/layout/AdminLayout.tsx` | Add "Reports" nav item to Operations group |

---

## Feature 2: Campaign Archive / Deprovisioning

### Overview
Build a campaign decommissioning workflow that snapshots full campaign config into an archive, then systematically deprovisions Five9 resources (DIDs, skills, agents, profile, connectors, IVR) with a step-by-step progress UI.

### Database Changes

**Table: `campaign_archives`**
- `id` (uuid, PK)
- `organization_id` (uuid, NOT NULL)
- `five9_domain_id` (uuid)
- `campaign_setup_id` (uuid) -- reference to original campaign_setups row
- `campaign_name` (text, NOT NULL)
- `client_name` (text)
- `config_snapshot` (jsonb) -- full intake_data + checklist + all associated config
- `deprovisioning_log` (jsonb) -- step-by-step results [{step, status, error, timestamp}]
- `archived_by` (uuid)
- `archived_at` (timestamptz, default now())
- `status` ("archived" | "restore_pending" | "restored")
- `restore_notes` (text)
- RLS: org owners/admins can manage; org members can view

### Edge Function Changes

**`five9-provisioning/index.ts`** (extend with new actions)
- `removeDNISFromCampaign` -- Remove specific DNIS from a campaign
- `removeSkillsFromCampaign` -- Decouple skills from a campaign
- `removeUsersFromSkill` -- Remove agents from a skill
- `stopCampaign` -- Set campaign state to NOT_RUNNING
- `getCampaignDetails` -- Fetch full campaign config (skills, DNIS, profile, dispositions) for snapshot

Each action maps to the corresponding Five9 SOAP API method.

### Frontend Components

**Archive Campaign Button**
- Added to `CampaignDetailPage.tsx` -- an "Archive" button (only visible for live/provisioned campaigns)
- Opens a confirmation dialog showing everything that will be deprovisioned

**Archive Confirmation Dialog**
- Lists all resources to be removed: DIDs, skills, agents on those skills, connectors, IVR references
- Fetches this data from Five9 API before displaying
- Double-confirm with "Type campaign name to confirm" pattern
- Triggers the archive workflow on confirm

**Archive Workflow Modal**
- Reuses the same stepper pattern as agent offboarding (`DeprovisioningWorkflowPanel`)
- Steps: Snapshot Config -> Release DNIS -> Decouple Skills -> Remove Agents from Skills -> Clear Campaign Profile -> Disconnect Connectors -> Detach IVR -> Stop Campaign -> Mark Archived
- Each step shows pending/active/complete/error status
- On completion, updates campaign_setups status to "archived" and inserts into `campaign_archives`

**Archived Campaigns Section**
- New tab or filter on `CampaignsPage.tsx` to show archived campaigns
- Click to view archive details (full config snapshot as read-only)
- "Restore" button (disabled with "Coming Soon" tooltip)
- Search/filter by client, date, campaign name

### New Files
| File | Purpose |
|------|---------|
| `src/components/campaigns/ArchiveConfirmDialog.tsx` | Confirmation dialog showing resources to be removed |
| `src/components/campaigns/ArchiveWorkflowModal.tsx` | Step-by-step deprovisioning progress modal |
| `src/components/campaigns/ArchivedCampaignDetail.tsx` | Read-only view of archived campaign snapshot |
| `src/hooks/useCampaignArchive.ts` | Hook for archive operations and workflow execution |
| `src/pages/admin/ArchivedCampaignsPage.tsx` | List of archived campaigns with search/filter |

### Modified Files
| File | Change |
|------|--------|
| `src/pages/admin/CampaignDetailPage.tsx` | Add "Archive Campaign" button |
| `src/pages/admin/CampaignsPage.tsx` | Add tab/link to archived campaigns |
| `src/App.tsx` | Add `/admin/campaigns/archived` route |
| `src/components/layout/AdminLayout.tsx` | (already updated for Reports) |
| `supabase/functions/five9-provisioning/index.ts` | Add deprovisioning SOAP actions |

---

## Implementation Order

1. **Database migrations** -- Create all 4 new tables (`disposition_access`, `call_log_cache`, `scheduled_reports`, `campaign_archives`) with RLS policies
2. **Campaign Archive edge function actions** -- Extend `five9-provisioning` with deprovisioning SOAP calls
3. **Campaign Archive UI** -- Archive button, confirmation dialog, workflow modal, archived list
4. **Five9 Reporting edge function** -- New `five9-reporting` function for call log data
5. **Report Export edge function** -- CSV/XLSX/PDF generation
6. **Call Log Reporting UI** -- Reports page, filters, table, exports
7. **Disposition Gating admin UI** -- Config page for managing allowed dispositions per org
8. **Scheduled Reports** -- Modal + management tab + Five9 scheduled report API integration
9. **Route and nav updates** -- Wire everything into App.tsx and AdminLayout

