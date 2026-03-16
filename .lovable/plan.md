

# Integrate ScriptFlow into Fabric59 — Consolidated Hub + Email Templates

## Assessment

After reviewing every page in the codebase, Fabric59 **already has** nearly every ScriptFlow capability built as standalone pages:

- Scripts CRUD (`ScriptEditorPage`), Script Runtime (`ScripterPage`), Script Routing (`ScriptRoutingPage`)
- Dispositions (`DispositionsPage`), Post-Call Automations (`PostCallAutomationsPage`)
- Knowledge Base (`KnowledgeBasePage`), Training LMS (`TrainingPage`)
- Feedback (`FeedbackPage`), Goals & Coaching (`GoalsPage`)
- Agent Dashboard (`AgentDashboardPage`), Supervisor Console (`SupervisorPage`)
- Call Summary Templates (`CallSummaryTemplatesPage`), Notifications (`NotificationsPage`)
- Email Templates hooks exist (`useEmailTemplates`) but **no admin page**

## What's Missing

1. **Email Templates admin page** — hooks exist, no UI
2. **Unified ScriptFlow hub** — these features are scattered across 10+ sidebar items; no single "command center" tab that ties scripts, dispositions, automations, email templates, and routing together
3. The ScriptEditorPage has no visual builder (React Flow) — but that's a large standalone effort, out of scope here

## Plan

### 1. Create `EmailTemplatesPage.tsx` (`/admin/email-templates`)

New page with full CRUD using existing `useEmailTemplates` hooks:
- Table: Name, Default flag, Created date, Actions (edit/delete)
- Create/Edit dialog: Name, HTML content (textarea), "Set as default" toggle
- Empty state with CTA

### 2. Create `ScriptFlowHubPage.tsx` (`/admin/scriptflow`)

A new consolidated tab — a single page with tabs that embed the key ScriptFlow modules:

**Tabs:**
- **Scripts** — Embed ScriptEditorPage content (list of scripts with CRUD)
- **Routing** — Embed ScriptRoutingPage content (DNIS/campaign → script mappings)
- **Dispositions** — Embed DispositionsPage content (Five9 disposition management)
- **Automations** — Embed PostCallAutomationsPage content (post-call rules)
- **Email Templates** — Embed EmailTemplatesPage content
- **Summary Templates** — Embed CallSummaryTemplatesPage content

Each tab renders the existing page content as an embedded component (same pattern used for Report59 merge). Each existing standalone page exports a `*Content` component without the page header.

### 3. Refactor existing pages to export embeddable content

For each page that gets embedded in the hub, extract the inner content into a named export (e.g., `ScriptEditorContent`, `ScriptRoutingContent`, etc.) while keeping the default export as the standalone page.

Pages to refactor:
- `ScriptEditorPage.tsx` → export `ScriptEditorContent`
- `ScriptRoutingPage.tsx` → export `ScriptRoutingContent`
- `DispositionsPage.tsx` → export `DispositionsContent`
- `PostCallAutomationsPage.tsx` → export `PostCallAutomationsContent`
- `CallSummaryTemplatesPage.tsx` → export `CallSummaryTemplatesContent`

### 4. Update navigation and routes

**AdminLayout sidebar:** Add "ScriptFlow" entry under Agent Tools (with a Workflow icon). Remove individual entries for Script Routing, Summary Templates from the sidebar since they're now accessible via the hub (keep Scripts and Scripter as direct links for quick access).

**App.tsx:** Add route `/admin/scriptflow` → `ScriptFlowHubPage`, add `/admin/email-templates` → `EmailTemplatesPage`.

## File Changes

| File | Change |
|---|---|
| `src/pages/admin/EmailTemplatesPage.tsx` | New — Email template CRUD using existing hooks |
| `src/pages/admin/ScriptFlowHubPage.tsx` | New — Tabbed hub consolidating 6 script-related modules |
| `src/pages/admin/ScriptEditorPage.tsx` | Export `ScriptEditorContent` (content without header) |
| `src/pages/admin/ScriptRoutingPage.tsx` | Export `ScriptRoutingContent` |
| `src/pages/admin/DispositionsPage.tsx` | Export `DispositionsContent` |
| `src/pages/admin/PostCallAutomationsPage.tsx` | Export `PostCallAutomationsContent` |
| `src/pages/admin/CallSummaryTemplatesPage.tsx` | Export `CallSummaryTemplatesContent` |
| `src/components/layout/AdminLayout.tsx` | Add ScriptFlow hub nav item, remove redundant entries |
| `src/App.tsx` | Add 2 new routes |

