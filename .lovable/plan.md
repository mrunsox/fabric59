

# Integrate ScriptFlow Visual Builder & Agent Runtime into Fabric59

## Current State

**Fabric59 has:**
- `scripts` table with `definition` JSONB, `organization_id`, `partner_id`, `tenant_id`, `status` — no versioning, no `content`, no `is_live`
- Simple CRUD ScriptEditorPage (table-based, no canvas)
- ScripterPage with step-by-step text-based runtime (linear, not React Flow)
- ScriptFlowHubPage consolidating scripts/routing/dispositions/automations/templates

**Source project (call-branch-live) has:**
- Visual React Flow script builder (10 node types, drag-drop canvas, version history, import/export, AI generation, test mode, validation)
- Agent runtime with interactive node traversal, customer info panel, merge fields, coaching, activity log
- CallTimer, CallOutcomeSelector, TaskQueuePanel, KnowledgeBaseSidebar
- `script_versions` table for version control
- `content` JSONB on scripts + `is_live`, `version`, `dnis` columns

## What to Build

### Phase 1: Database — Add versioning columns and script_versions table

**Migration:**
- Add columns to `scripts`: `version integer DEFAULT 1`, `is_live boolean DEFAULT false`, `dnis text`, `is_template boolean DEFAULT false`
- Create `script_versions` table: `id`, `script_id` (FK scripts), `version integer`, `content JSONB`, `created_by`, `created_at`
- RLS: org members can read/write versions for scripts in their org

### Phase 2: Copy script builder node components

Copy from source project into `src/components/script-builder/`:
- `QuestionNode.tsx`, `ActionNode.tsx`, `ConditionNode.tsx`, `StartNode.tsx`, `EndNode.tsx`
- `EmailSmsNode.tsx`, `SubTreeNode.tsx`, `DocumentNode.tsx`, `WebhookNode.tsx`, `LinkNode.tsx`
- `VersionHistoryPanel.tsx`, `ScriptStatusBadge.tsx`, `SaveAsTemplateDialog.tsx`
- `EditableFieldsConfig.tsx`, `ScriptImportExport.tsx`, `NodeDataFieldsEditor.tsx`
- `NodePropertyEditors.tsx`, `AIScriptGenerator.tsx`, `ScriptTestMode.tsx`, `ScriptValidation.tsx`

Adapt all Supabase imports to use Fabric59's client. Adapt `client_id` references to `organization_id`/`tenant_id`.

### Phase 3: Copy agent runtime components

Copy into `src/components/agent/`:
- `ActiveScriptViewer.tsx` — the core interactive script runtime
- `CallTimer.tsx`, `CallOutcomeSelector.tsx`
- `CustomerInfoPanel.tsx`, `ScriptDataFields.tsx`, `CallActivityLog.tsx`
- `AgentCoachingCard.tsx`, `ScriptProgressIndicator.tsx`, `QuickActionsBar.tsx`
- `KnowledgeBaseSidebar.tsx`, `NodeExternalLinks.tsx`

### Phase 4: Copy supporting hooks

- `useScriptVersioning.ts` — version save/publish/rollback (adapt `content` → `definition`)
- `useCallSessionTracking.ts` — node visit tracking

### Phase 5: Add node colors to theme

**index.css** — Add CSS variables:
```
--node-question: 243 75% 59%;
--node-action: 187 92% 42%;
--node-condition: 38 100% 50%;
--node-end: 152 76% 44%;
--node-start: 280 75% 55%;
```

**tailwind.config.ts** — Add `node` color group.

### Phase 6: Build the Visual Script Builder page

Create `src/pages/admin/ScriptBuilderPage.tsx` at route `/admin/scripts/:scriptId/builder`:
- Full React Flow canvas with the 10 node types
- Node palette sidebar with drag-to-add
- Toolbar: save draft, publish, version history, import/export, test mode, validation
- Adapts `useScriptVersioning` to use Fabric59's `definition` column

Update `ScriptEditorContent` to add an "Open Builder" button per script row that navigates to `/admin/scripts/{id}/builder`.

### Phase 7: Enhance Agent Dashboard with runtime

Update `AgentDashboardPage.tsx` to add a "Live Script" tab:
- Embeds `ActiveScriptViewer` component
- Shows `CallTimer` when active
- Shows `CallOutcomeSelector` after call end
- Script selection dropdown (from org scripts where `is_live = true`)

## Adaptation Notes

All source components reference `client_id` — these get mapped to `tenant_id` in Fabric59. The `useAuth` context returns `organization` in Fabric59 vs `profile.client_id` in the source. The `content` JSONB field maps to `definition` in Fabric59's scripts table. The `useScriptVersioning` hook needs the most adaptation since it directly queries `scripts.content`.

## File Summary

| Action | File |
|---|---|
| Migration | Add `version`, `is_live`, `dnis`, `is_template` to `scripts`; create `script_versions` |
| New (16) | `src/components/script-builder/*.tsx` (10 node types + 6 utilities) |
| New (10) | `src/components/agent/*.tsx` (runtime + support components) |
| New (2) | `src/hooks/useScriptVersioning.ts`, `src/hooks/useCallSessionTracking.ts` |
| New (1) | `src/pages/admin/ScriptBuilderPage.tsx` |
| Modified | `src/index.css` — node color variables |
| Modified | `tailwind.config.ts` — node color tokens |
| Modified | `src/pages/admin/ScriptEditorPage.tsx` — "Open Builder" link |
| Modified | `src/pages/admin/AgentDashboardPage.tsx` — Live Script tab |
| Modified | `src/App.tsx` — add builder route |

