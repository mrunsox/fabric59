

# Sync Virtual Script Tree Editor into Fabric59

## Current State

**Fabric59 has:** A basic `ScriptBuilderPage.tsx` (299 lines) with 10 separate node components (StartNode, EndNode, QuestionNode, etc.), no auto-layout, no canvas search, no edge context menus, no per-node config panels. Uses 5 CSS node color variables.

**Virtual Script has:** A mature `TreeEditor.tsx` (573 lines) + `FlowCanvas.tsx` (740 lines) with 22 node types rendered via a single `CustomNode` component, dagre auto-layout, edge context menus, canvas search, industry templates, 20 per-node-type config panels, undo/redo history, and a rich type system. Uses 8 CSS node color categories.

These are two completely different architectures. Fabric59's existing builder nodes (StartNode, ActionNode, etc.) are NOT compatible with the source's system — the source uses a unified `CustomNode` that renders all 22 types dynamically based on `nodeTypeConfigs`.

## Approach

Copy the source's tree editor system alongside the existing builder. Wire it to the `/admin/call-flow` route (CallFlowBuilderPage) as a new "Tree Editor" tab, since it's the superior visual builder. The existing `ScriptBuilderPage` at `/admin/scripts/:scriptId/builder` stays as-is for now.

## Files to Copy (54 files total)

### Types & Config (3 files)
| Source | Target |
|---|---|
| `src/types/script.ts` | `src/types/tree-script.ts` |
| `src/types/integration.ts` | `src/types/tree-integration.ts` |
| `src/config/nodeTypes.ts` | `src/config/nodeTypes.ts` |

### Flow Canvas (10 files)
All from `src/components/editor/flow/` → `src/components/tree-editor/flow/`
- FlowCanvas.tsx, CustomNode.tsx, CustomEdge.tsx, types.ts, EdgeContextMenu.tsx, CanvasSearch.tsx, TemplateModal.tsx, TemplateLoadingOverlay.tsx, templates.ts, useAutoLayout.ts

### Editor Components (12 files)
All from `src/components/editor/` → `src/components/tree-editor/`
- NodePalette.tsx, NodeEditorPanel.tsx, ScriptConfigPanel.tsx, ScriptTester.tsx, DeleteNodeModal.tsx, DispositionFormModal.tsx, SaveAsTemplateModal.tsx, ConnectionPort.tsx, ConnectionLines.tsx, TemporaryConnectionLine.tsx, DraggableNode.tsx, EditorNode.tsx

### Config Panels (20 files)
All from `src/components/editor/config/` → `src/components/tree-editor/config/`
- ContentNodeConfig, QuestionNodeConfig, DataCaptureNodeConfig, LogicNodeConfig, EndNodeConfig, TimerNodeConfig, AudioNodeConfig, TransferNodeConfig, CRMNodeConfig, WebhookNodeConfig, EmbedNodeConfig, AIAssistNodeConfig, ScoringNodeConfig, ABTestNodeConfig, FlowNodeConfigs, SMSNodeConfig, CalendarNodeConfig, PaymentNodeConfig, QuestionInputTypes, RichTextEditor

### Hooks (3 files)
- `src/hooks/useEditorHistory.ts` → `src/hooks/useEditorHistory.ts`
- `src/hooks/useConnectionDrawing.ts` → `src/hooks/useConnectionDrawing.ts`
- `src/hooks/useDraggableNode.ts` → `src/hooks/useDraggableNode.ts`

### Agent Preview (4 files)
- `src/pages/AgentPreview.tsx` → `src/components/tree-editor/AgentPreview.tsx`
- `src/components/agent/QuestionInputRenderer.tsx` → `src/components/tree-editor/agent/QuestionInputRenderer.tsx`
- `src/components/agent/ACWPanel.tsx` → `src/components/tree-editor/agent/ACWPanel.tsx`
- `src/components/AgentPreviewTimer.tsx` → `src/components/tree-editor/AgentPreviewTimer.tsx`

### Main Page
- `src/pages/TreeEditor.tsx` → `src/pages/admin/TreeEditorPage.tsx`

### Session Hook
- `src/hooks/useScriptSessions.ts` — Fabric59 already has this; skip or merge if different

## Import Adaptations

All copied files need these import path changes:
- `@/types/script` → `@/types/tree-script`
- `@/components/editor/` → `@/components/tree-editor/`
- `@/components/layout/AppLayout` → Remove (Fabric59 uses AdminLayout wrapping via routes)
- `useClients` / `client_id` references → Adapt to Fabric59 `useTenants` / `tenant_id`
- Auth context → Use Fabric59's `useAuth` from `@/contexts/AuthContext`

## CSS Changes

Add missing node color variables to `src/index.css` (both light and dark):
```
--node-content: 220 70% 55%;
--node-data: 45 90% 50%;
--node-logic: 280 70% 55%;
--node-integration: 200 80% 50%;
--node-call: 25 90% 55%;
--node-ai: 260 80% 60%;
--node-flow: 320 70% 55%;
```

Add Tailwind `node` color entries for the new variables.

## Dependencies

Add to `package.json`:
- `dagre` + `@types/dagre` (auto-layout)
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/modifiers`, `@dnd-kit/utilities` (drag-drop palette)

Fabric59 already has `@xyflow/react`, `framer-motion`, `react-markdown`.

## Routing

Add `/admin/tree-editor/:scriptId?` route → `TreeEditorPage` in `App.tsx`.

Update `CallFlowBuilderPage.tsx` to add a "Tree Editor" tab alongside "AI Builder" and "Interactive Demo" that links to `/admin/tree-editor/new`.

Update `ScriptEditorContent` to add a "Tree Editor" button per script that navigates to `/admin/tree-editor/:scriptId`.

## Implementation Order

1. Add dependencies to package.json
2. Copy types and config (3 files)
3. Copy flow canvas components (10 files)
4. Copy editor components (12 files)
5. Copy config panels (20 files)
6. Copy hooks (3 files)
7. Copy agent preview components (4 files)
8. Create TreeEditorPage (adapted from source TreeEditor.tsx)
9. Add CSS node color variables
10. Add Tailwind node color tokens
11. Add route + update navigation

