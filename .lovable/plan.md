# Add document upload to the Workspace Guide AI Assembler

Reuse the existing `BlueprintFileUpload` component (drag-and-drop + click-to-browse) and the existing `parse-blueprint-doc` edge function — both already handle PDF, DOCX, TXT, MD via the `blueprint-documents` storage bucket. No new edge function, no new bucket.

## Change

In `src/components/workspace-guide/WorkspaceGuideAssembler.tsx`, insert `<BlueprintFileUpload />` above the "Source text" textarea. When the user uploads a file, the extracted text is appended into the existing `source` state via the component's `onTextExtracted` callback, then the user can edit it and click Assemble as today.

- Drop zone label: "Drop a brief or runbook to auto-fill"
- Accept: `.pdf,.docx,.doc,.txt,.md`
- If text already exists in the box, the upload replaces it (with a toast); otherwise just fills it.
- Disabled while `busy` (assembly running).

## Files touched
- `src/components/workspace-guide/WorkspaceGuideAssembler.tsx` — import and render `BlueprintFileUpload`; wire `onTextExtracted` to `setSource`.

## Out of scope
- New edge function / new bucket (reuse `parse-blueprint-doc` + `blueprint-documents`).
- Multi-file batch parse.
- Auto-running Assemble on upload — user still presses Assemble.
- Persisting the uploaded file to the workspace guide record.
