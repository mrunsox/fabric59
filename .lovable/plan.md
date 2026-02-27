

# Five9 File Upload and Parsing Engine -- Refine Report59 Outline Items

## Analysis

The prompt provides implementation details for features already planned under the **Report59 -- Advanced Reporting** category. After cross-referencing with existing code, here is what overlaps and what is new.

### Already Built (Discard from prompt)

| Prompt Feature | Existing Code |
|---|---|
| `CallRecord` type with 7 fields | `CallLogRecord` in `src/hooks/useCallLogs.ts` (7 fields) |
| CSV/XLSX/PDF export | `report-export` edge function + `exportCallLogs()` |
| Searchable, filterable, paginated table | `ReportsPage.tsx` + `CallLogTable.tsx` + `ReportFilters.tsx` |
| Disposition filtering | Already in `ReportsPage.tsx` with gating config |
| Route and sidebar nav for reports | `/admin/reports` route + sidebar "Reports" link |

### Genuinely New (Keep from prompt)

| Feature | Maps To Existing Planned Item |
|---|---|
| Drag-drop file upload zone with progress bar | "CSV/XLSX Upload Parser" (refine description) |
| Five9 column mapper (30+ mappings, header auto-detect, metadata extraction) | "CSV/XLSX Upload Parser" (refine description) |
| Disposition exclusion toggle (click to exclude, shows count) | "Column Exclusion Editor" (refine description) |
| Analytics tab with summary cards + bar chart + caller frequency | "KPI Dashboard Cards" + "Report Charts" (refine descriptions) |
| Upload history tracking | New item to add |
| Upload page as separate route | New item to add |

### Dependencies

The prompt calls for `papaparse`, `xlsx`, and `zustand` as new npm dependencies. These are all client-side libraries that are reasonable additions:
- `papaparse` for CSV parsing
- `xlsx` (SheetJS) for Excel file parsing  
- `zustand` for lightweight upload history state (alternative: use existing React Query + database persistence)

## Proposed Changes to Build Outline

Update the **Report59 -- Advanced Reporting** category in `src/data/buildMap.ts` to refine existing items and add 2 new items, bringing the category from 6 to 8 items.

### Updated Category

```text
Report59 -- Advanced Reporting (8 items)
  [planned] Five9 CSV/XLSX Upload Parser        <-- REFINED (was generic "CSV/XLSX Upload Parser")
  [planned] Disposition Exclusion Manager        <-- REFINED (was "Column Exclusion Editor")  
  [planned] Upload Analytics Dashboard           <-- REFINED (was "KPI Dashboard Cards")
  [planned] Automation Status Monitor            <-- UNCHANGED
  [planned] Report Charts                        <-- UNCHANGED
  [planned] Report Templates                     <-- UNCHANGED
  [planned] Upload Page & Route                  <-- NEW
  [planned] Upload History Tracker               <-- NEW
```

### Item Details

| Item | Description (updated) |
|---|---|
| Five9 CSV/XLSX Upload Parser | Drag-drop file upload with Five9 column mapping (30+ fields), auto header detection, metadata extraction, and progress bar |
| Disposition Exclusion Manager | Toggle dispositions to exclude from analysis with count display and before/after comparison |
| Upload Analytics Dashboard | Summary cards (total calls, minutes, avg duration, unique agents) with Recharts bar chart and caller frequency table |
| Upload Page & Route | Dedicated /admin/upload page with drag-drop zone, data table tab, and analytics tab |
| Upload History Tracker | Track upload events (file name, campaign, date range, totals) with Zustand or DB persistence |

### No Other File Changes

- No database migrations
- No edge function changes
- No route changes yet (those come during implementation)
- Only the build map data file is updated

## Impact on Outline Totals

| Metric | Before | After |
|--------|--------|-------|
| Report59 Items | 6 | 8 |
| Total Items | ~173 | ~175 |
| Planned | 43 | 45 |

