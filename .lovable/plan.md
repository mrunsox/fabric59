# Dispositions: campaign-grouped CRUD

Turn the **Dispositions** page into a campaign-grouped management surface (same UX pattern just shipped for the Knowledge Base). Each campaign gets its own card; opening one shows that campaign's isolated dispositions with full create / edit / delete.

## UX

**Index (default)**
- Card grid: one card per workspace campaign + a "Workspace-wide" card (dispositions with no campaign).
- Each card shows: name, disposition count, active/inactive breakdown, last update.
- Header keeps "New disposition" button (creates workspace-wide by default).
- Outcome types card stays at the bottom unchanged.

**Campaign drill-in**
- Back button → "All campaigns".
- Heading = campaign name + lede.
- Table of dispositions for that campaign with columns: Name, Order, Status, Actions (edit, delete).
- "New disposition" button pre-scoped to the campaign (campaign field locked in the dialog).
- Inline create / edit dialog with fields: Name (required), Sort order, Active toggle.
- Delete confirms via AlertDialog.

**Auto-card on campaign creation**
- Cards derive live from `useWorkspaceCampaigns()` — any new campaign instantly appears with 0 dispositions.

## Technical

### Migration (single migration, additive)
Add the missing columns to `public.disposition_access`:
- `campaign_id uuid NULL REFERENCES public.campaigns(id) ON DELETE CASCADE`
- `is_active boolean NOT NULL DEFAULT true`
- `sort_order integer NOT NULL DEFAULT 0`
- `updated_at timestamptz NOT NULL DEFAULT now()` + trigger
- Index on `(organization_id, campaign_id)`

Existing rows backfill to `campaign_id = NULL` (= workspace-wide), `is_active = true`, `sort_order = 0`. RLS policies already scope by `organization_id`; no policy changes needed since `campaign_id` is just an extra column. GRANTs already present.

### Hook changes — `src/hooks/useDispositions.ts`
- Extend `Disposition` to surface `campaign_id` from the row (no more synthetic defaults for these three fields).
- `useDispositions()` returns all rows for the org; grouping happens in the page.
- Add `useUpdateDisposition()` (name, sort_order, is_active, campaign_id).
- Extend `useCreateDisposition()` input with optional `campaignId`, `sortOrder`, `isActive`.
- `useDeleteDisposition()` unchanged.

### Page rewrite — `src/pages/workspace/WorkspaceDispositionsPage.tsx`
- Drop the "Authoring lives in the organization disposition manager" copy.
- Add local `selection: undefined | null | string` state (mirrors KB pattern).
- Index view → `<DispositionCampaignGrid>` (inline component) computing per-campaign counts.
- Drill-in view → table + `<DispositionFormDialog>` for create/edit + AlertDialog for delete.
- Reuse shadcn `Card`, `Table`, `Dialog`, `AlertDialog`, `Switch`, `Input`.

## Out of scope
- Outcome types CRUD (kept read-only, unchanged).
- Bulk reassign dispositions between campaigns.
- Per-disposition email/SMS template wiring (those fields already live elsewhere on org-level disposition manager and aren't part of disposition_access today).
