## Rename Knowledge Bin → Knowledge Base + attach sources to campaigns

### 1. Rename (UI labels only)
- `src/pages/workspace/brain/BusinessBrainLayoutPage.tsx` — tab `"Knowledge Bin"` → `"Knowledge Base"`.
- `src/pages/workspace/brain/KnowledgeBinPage.tsx` — page heading `"Knowledge Bin"` → `"Knowledge Base"` and description copy referring to "imported source".
- `src/components/workspace/cockpit/InCallKnowledgeBin.tsx` — visible header `"Knowledge bin · N items"` → `"Knowledge base · N items"`; loading/empty strings.
- `src/components/workspace/cockpit/InCallAssistPanel.tsx` — empty-state `"Knowledge bin is empty."` → `"Knowledge base is empty."`.
- `src/components/workspace/calls/CallSessionReplay.tsx` — section header `"Knowledge Bin"` → `"Knowledge Base"`; empty-state copy.
- `src/hooks/useCallCopilot.ts` — fallback suggestion strings (`"No grounded answer in the knowledge bin"`, source label).

Internal type names (`KnowledgeBin`, `KnowledgeBinGroup`, hook names like `useInCallKnowledgeBin`), file names, comments, route paths, query keys, and DB tables are left unchanged — UI-only rename to avoid churn.

### 2. Attach knowledge base sources to campaigns

The `bb_sources` table already has a `campaign_id` column (added in Phase 12 for the per-campaign Library page). The workspace-level Knowledge Base page currently ignores it. Surface it.

**`KnowledgeBinPage.tsx`**
- Add a **Campaign filter** in the header next to "Add source": Select with `"All campaigns"`, `"Workspace-wide (no campaign)"`, and each workspace campaign. Filters the rendered table in memory.
- Add a **Campaign** column to the table showing the campaign name (or "Workspace-wide" if `campaign_id` is null).

**`AddSourceDialog`**
- Add a **Campaign** select at the top of the dialog (above the tabs). Default = `"Workspace-wide"`. Options = workspace campaigns + `"Workspace-wide"`.
- Persist the chosen `campaignId` and pass it through every ingest call.

**`useBusinessBrain.ts` ingest mutations**
- Extend `UseBbIngestPaste/Upload/Csv/Faq` input types with optional `campaignId?: string | null`.
- Include `campaign_id: input.campaignId ?? null` in every `bb_sources` insert.
- Pass `campaignId` along to the `bb-embed` edge function invocation payload so chunks are tagged for retrieval (existing edge function already accepts campaign metadata — verify; if not, just store on `bb_sources` and rely on `bb_search_chunks_v2` joining via the source).

**`useBbSources`**
- Continue returning the full workspace list. Add `campaign_id` to the `BbSourceRow` type (select includes it) so the filter and column can use it. Pull campaign names via `useWorkspaceCampaigns()` and merge in-page (no DB join required).

**No new DB migration** — the column already exists. Existing RLS on `bb_sources` already permits workspace members.

### Out of scope
- Renaming the existing per-campaign Library page (`/campaigns/:id/library`) — it stays as the campaign-scoped view of the same data.
- Bulk reassign UI for existing sources (can be a follow-up).
- Edge-function rewrites; we only thread `campaignId` through if the function already supports it.
