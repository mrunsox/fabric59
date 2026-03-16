

# Merge Report59 into Fabric59 — Reporting & Billing Module

## Current State

- **Report59UploadPage** (606 lines): Client-side CSV parser with in-memory analytics, localStorage upload history, Recharts charts. No database persistence.
- **BillingPage** (215 lines): 100% mock data — hardcoded invoices, rates, partner rollups. No DB tables.
- **ReportsPage**: Wired to Supabase via `useCallLogs`, `useDispositionAccess`, `useScheduledReports`. This is the only real backend-connected reporting page.
- **Existing infra**: `partners` table, `tenants` table with `integration_configs` JSONB, `config-merge.ts` utility, `organizations.integration_configs`.

## What We Will Build

### 1. Database Tables (Migration)

**`report_uploads`** — persists every Five9 report upload:
- `id`, `organization_id`, `partner_id` (nullable), `tenant_id` (nullable), `five9_domain_id` (nullable)
- `original_filename`, `file_size_bytes`, `file_type` (csv/xlsx)
- `uploaded_by` (FK profiles), `uploaded_at`
- `parsed_summary` (JSONB — totals, disposition breakdown, agent breakdown)
- `exclusions_applied` (text[] — dispositions excluded)
- `row_count` (integer)
- RLS: org-scoped (same pattern as `partners`)

**`invoices`** — billing invoices:
- `id`, `organization_id`, `partner_id`, `tenant_id` (nullable)
- `status` (draft/sent/paid/void), `issue_date`, `due_date`
- `currency` (default 'USD'), `total_amount` (numeric)
- `notes`, `source_upload_id` (FK report_uploads, nullable)
- `source_period_start`, `source_period_end`
- `created_by`, `created_at`, `updated_at`
- RLS: org-scoped

**`invoice_line_items`**:
- `id`, `invoice_id` (FK invoices), `tenant_id` (FK tenants)
- `description`, `quantity` (numeric), `unit` (default 'minutes')
- `rate` (numeric), `amount` (numeric)
- `metadata` (JSONB)
- RLS: org-scoped via invoice join

**Alter `partners`**: Add `billing_default_rate_per_minute numeric`, `billing_currency text default 'USD'`

**Alter `tenants`**: Add `billing_rate_per_minute numeric`, `five9_campaign_identifier text`

### 2. Hooks

- **`useReportUploads()`** — list/create/delete uploads for current org
- **`useInvoices()`** — CRUD invoices with line items
- **`useInvoiceLineItems(invoiceId)`** — list line items
- **`useGenerateInvoice()`** — mutation that computes line items from upload summaries + rates

### 3. Refactored Report59UploadPage

Keep the existing CSV/XLSX parser and analytics UI but:
- After parsing, **save to `report_uploads`** (parsed_summary, exclusions, row_count)
- Upload history reads from DB instead of localStorage
- Add partner/client selector dropdowns before upload to scope the data
- Remove localStorage persistence entirely

### 4. Refactored BillingPage

Replace all mock data with real queries:
- **Invoices tab**: `useInvoices()` with status filters
- **Rate Config tab**: Read `billing_rate_per_minute` from `tenants` + `billing_default_rate_per_minute` from `partners`, editable inline
- **Partner Rollup tab**: Aggregate from invoices grouped by partner
- **Revenue Trends tab**: Aggregate from invoices by month
- **Generate Invoice modal**: Pick partner, period, clients → compute from `report_uploads.parsed_summary` minutes × rates → create invoice + line items

### 5. Navigation Restructure

Move "Billing" from Configuration group into Operations group (after Reports):
```
Operations:
  ...
  Reports
  Report59 Upload
  Billing & Invoices    ← moved here, renamed
```

### 6. Partner & Client Overview Enhancements

- **PartnerOverviewPage**: Add billing rate fields + recent invoices card
- **ClientOverviewPage**: Add billing rate field + usage summary card

### 7. Sidebar Rename

- "Report59 Upload" → "Report59" (shorter)
- "Billing" → "Billing & Invoices"

## File Changes

| File | Change |
|---|---|
| Migration SQL | Create `report_uploads`, `invoices`, `invoice_line_items`; alter `partners` + `tenants` with billing fields |
| `src/hooks/useReportUploads.ts` | New — CRUD for report_uploads |
| `src/hooks/useInvoices.ts` | New — CRUD for invoices + line items + generate mutation |
| `src/pages/admin/Report59UploadPage.tsx` | Refactor: persist to DB, add partner/client selector, remove localStorage |
| `src/pages/admin/BillingPage.tsx` | Refactor: replace mocks with real queries, add Generate Invoice modal |
| `src/pages/admin/PartnerOverviewPage.tsx` | Add billing rate fields + invoices card |
| `src/pages/admin/ClientOverviewPage.tsx` | Add billing rate + usage card |
| `src/components/layout/AdminLayout.tsx` | Move Billing into Operations, rename nav items |
| `src/types/database.ts` | Add `ReportUpload`, `Invoice`, `InvoiceLineItem` interfaces; update `Partner` + `Tenant` |

