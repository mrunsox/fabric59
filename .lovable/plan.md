

# Add File Upload to Campaign Blueprints

## What We're Building

A drag-and-drop file upload zone on the Campaign Blueprints page that accepts PDF and Word documents, extracts their text content via a backend function, and populates the relevant text fields (agent guide, department scripts, notes). Files are also stored in storage for reference.

## Approach

### 1. Storage Bucket (Migration)
- Create a public-read storage bucket `blueprint-documents` for uploaded files
- Add RLS policies: authenticated users can upload/read files scoped to their org

### 2. Edge Function: `parse-blueprint-doc`
- Accepts a file path from the storage bucket
- Downloads the file, extracts text using basic parsing (for DOCX: unzip and parse `word/document.xml`; for PDF: use `pdf-parse` or return raw text)
- Returns extracted text to the client

### 3. New Component: `BlueprintFileUpload.tsx`
- Drag-and-drop zone with click-to-browse fallback
- Accepts `.pdf`, `.docx`, `.doc`, `.txt`
- On drop: uploads file to `blueprint-documents/{org_id}/{blueprint_name}/{filename}`
- Calls the edge function to extract text
- Shows extracted text in a preview, with a button to populate the target field (agent guide, department script, or notes)

### 4. Update `CampaignBlueprintsPage.tsx`
- Add `BlueprintFileUpload` component to the **Overview** tab (general file uploads) and **Agent Guide** tab (auto-populate guide text)
- Add a new **Documents** tab listing all uploaded files for the blueprint with download links
- Update the blueprint interface to track `documents: { name, path, uploaded_at }[]`

### 5. Database Change
- Add `documents` jsonb column (default `'[]'`) to `campaign_blueprints` table to track uploaded file references

## Files

| File | Action |
|------|--------|
| `src/components/campaigns/BlueprintFileUpload.tsx` | Create — drag-drop upload component |
| `supabase/functions/parse-blueprint-doc/index.ts` | Create — text extraction edge function |
| `src/pages/admin/CampaignBlueprintsPage.tsx` | Modify — add upload zones + Documents tab |
| `src/hooks/useCampaignBlueprints.ts` | Modify — add `documents` to interface |
| Migration | Add `documents` column + `blueprint-documents` storage bucket + RLS |

## User Flow

```text
Open Blueprint → Drag PDF/DOCX onto upload zone
  → File stored in storage bucket
  → Edge function extracts text
  → Preview shown → "Use as Agent Guide" / "Use as Script" button
  → Text populates the appropriate field
```

