

# AI-Powered Campaign Builder from Documents

## What We're Building

A new "AI Campaign Builder" workflow where you drop multiple documents (agent scripts, FAQ docs, department guides, etc.) and AI automatically parses them to generate a complete campaign setup — departments, skills, dispositions, IVR flow, connectors, decision trees, phone numbers, and everything needed to provision on Five9.

## Flow

```text
Drop 5+ documents → AI extracts & classifies each doc
  → AI generates structured CampaignIntakeData JSON
  → Review/edit in a structured preview
  → "Create Campaign" → pre-fills Campaign Intake form
```

## Components

### 1. New Edge Function: `ai-blueprint-builder`

- Receives: array of `{ fileName, text }` (extracted text from uploaded docs)
- Sends all extracted text to Lovable AI (Gemini) with a detailed system prompt that instructs it to:
  - Identify departments, their IVR routing numbers, and agent scripts
  - Extract dispositions and email routing rules
  - Build decision trees per department
  - Identify phone numbers (ANI/DNIS)
  - Identify external connectors (websites, FAQ URLs, backend docs)
  - Identify IVR greetings, whisper prompts, hold music references
  - Output a complete `CampaignIntakeData` JSON via tool calling
- Uses `LOVABLE_API_KEY` — already configured
- Returns structured campaign data

### 2. New Component: `AIBlueprintBuilder.tsx`

- Multi-file drag-and-drop zone (reuses `BlueprintFileUpload` pattern but accepts multiple files)
- Progress indicator: "Uploading... → Extracting text... → AI analyzing... → Done"
- After AI completes: shows a structured preview with expandable sections:
  - Campaign basics (name, client, description)
  - Departments (count, names, IVR numbers, scripts)
  - Dispositions list
  - IVR flow summary
  - Phone numbers
  - Connectors
  - Decision trees per department
- Each section is editable before finalizing
- "Create Campaign Setup" button → navigates to Campaign Intake pre-filled

### 3. Update `CampaignBlueprintsPage.tsx`

- Add an "AI Build from Documents" button at the top alongside "New Blueprint"
- Opens the `AIBlueprintBuilder` component in a full-page editor view

### 4. Update Routing

- No new route needed — the AI builder lives within the Blueprints page as an alternate editing mode

## Edge Function Design

The edge function uses Lovable AI with tool calling to extract structured output matching the `CampaignIntakeData` schema. The system prompt will include:

- The complete `CampaignIntakeData` type definition so AI knows the target shape
- Instructions for multi-department detection (look for IVR menu numbers, department names)
- Instructions for disposition extraction (look for disposition lists, email templates)
- Instructions for decision tree construction from scripted Q&A flows

## Files

| File | Action |
|------|--------|
| `supabase/functions/ai-blueprint-builder/index.ts` | Create — AI extraction edge function |
| `src/components/campaigns/AIBlueprintBuilder.tsx` | Create — multi-file upload + AI preview UI |
| `src/pages/admin/CampaignBlueprintsPage.tsx` | Modify — add "AI Build" button and mode |

## Technical Notes

- Multi-file upload reuses existing `blueprint-documents` bucket and `parse-blueprint-doc` edge function for text extraction
- AI structured output via tool calling ensures reliable JSON shape
- Default model: `google/gemini-3-flash-preview` (fast, good at structured extraction)
- The extracted `CampaignIntakeData` can be passed directly to the Campaign Intake page via React Router state

