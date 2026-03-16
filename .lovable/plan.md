

# Merge Report59 into Reports — Single "Reports" Page

## What Changes

The standalone Report59 page (`/admin/upload`) gets absorbed into ReportsPage (`/admin/reports`) as a new tab called "Report59" alongside the existing Call Logs, Scheduled Reports, and Disposition Gating tabs.

The sidebar drops the separate "Report59" nav item — there's just one "Reports" entry.

## File Changes

| File | Change |
|---|---|
| `src/pages/admin/ReportsPage.tsx` | Add a "Report59" tab that renders the full Report59UploadPage content as an embedded component |
| `src/pages/admin/Report59UploadPage.tsx` | Extract the inner content into a named export `Report59Content` (no page wrapper/header) so it can be embedded in the Reports tab |
| `src/components/layout/AdminLayout.tsx` | Remove the "Report59" nav item (line 87) |
| `src/App.tsx` | Remove the `/admin/upload` route (line 133); keep the import for now or remove it |

## Implementation Detail

**Report59UploadPage.tsx**: Add an exported `Report59Content` component that contains everything currently inside `Report59UploadPage` minus the outer `<div>` with the page title/header. The default export stays for backward compat but just wraps `Report59Content` with the header.

**ReportsPage.tsx**: 
- Import `Report59Content` from `Report59UploadPage`
- Add a `<TabsTrigger value="report59">Report59</TabsTrigger>` to the tabs list
- Add `<TabsContent value="report59"><Report59Content /></TabsContent>`

**AdminLayout.tsx**: Remove line 87 (`{ name: "Report59", href: "/admin/upload", ... }`).

**App.tsx**: Remove the `/admin/upload` route.

