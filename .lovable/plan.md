

# Add Missing ScriptFlow Components to Fabric59

## Assessment — What's Already Done vs What's Missing

After cross-referencing both projects, here's the actual gap analysis:

### Already in Fabric59 (skip)
- **Script builder nodes (10):** StartNode, EndNode, QuestionNode, ActionNode, ConditionNode, EmailSmsNode, DocumentNode, WebhookNode, LinkNode, SubTreeNode — *just ported in the last message*
- **Script builder utilities (4):** ScriptStatusBadge, ScriptValidation, ScriptImportExport, VersionHistoryPanel — *just ported*
- **Hooks (2):** useScriptVersioning, useCallSessionTracking — *just ported*
- **Agent runtime (7):** ActiveScriptViewer, CallTimer, CallOutcomeSelector, CustomerInfoPanel, ScriptDataFields, CallActivityLog, AgentCoachingCard, ScriptProgressIndicator, QuickActionsBar, KnowledgeBaseSidebar — *ported but no page yet*
- **Existing pages:** KnowledgeBasePage, TrainingPage, FeedbackPage, GoalsPage, SupervisorPage, AgentDashboardPage, NotificationsPage, all campaign/tenant/partner management
- **Existing hooks:** useKnowledgeBase, useTraining, useFeedback, usePerformanceGoals, useAuditLog, useTasks, useNotifications, useCallOutcomes, useCallSummaryTemplates, useCallSessionTracking, useScriptVersioning
- **Edge functions:** twilio-sms, send-notification, invite-member, slack-agent, teams-notify already exist

### Omit — Doesn't Make Sense for Fabric59
- **Public/marketing pages (F):** Fabric59 has its own landing page. Blog, pricing, careers, FAQ, ROI calculator, demo, about, contact, compare, resources, partners marketing pages are for the *source product's* marketing site — not transferable
- **DashboardLayout, Navbar, Footer:** Fabric59 has AdminLayout/MasterLayout — different architecture
- **AuthContext/Auth.tsx:** Fabric59 has its own auth with org/role hierarchy — not compatible
- **ProtectedRoute:** Fabric59 has its own ProtectedRoute + MasterProtectedRoute
- **useRealtimeScripts/useRealtimeCampaigns:** Fabric59 uses useScripts/useCampaignScripts with different schemas
- **EmbedCodeDialog:** Generates Five9 iframe embed — this is product-specific to the source app's deployment model, not Fabric59's architecture
- **SelfServiceWidget, EmbeddedScript pages:** Widget embedding for external sites — not applicable
- **ReferralAnalytics, track-referral-click:** Marketing referral system — not applicable
- **DigestPreferencesCard, send-digest-email, unsubscribe-notifications:** Digest system — Fabric59 has its own notification pipeline
- **AcceptInvitation page, validate-invitation, accept-invitation, send-invitation functions:** Fabric59 has invite-member edge function already
- **CronJobsPanel, get-cron-status, toggle-cron-job, trigger-cron-job:** Cron management UI — Fabric59 manages crons via backend, not needed as admin UI
- **VapidKeyConfiguration, send-push-notification:** Web push — niche, can be added later if needed
- **ResendApiKeyConfiguration:** Fabric59 has its own email setup via integrations
- **ScrollToTop:** Already exists in Fabric59
- **Full ui/ library:** Fabric59 has its own shadcn library

### What's Actually Net-New and Valuable

**A. Script Builder (8 missing components)**

| Component | Lines | Purpose |
|---|---|---|
| `AIScriptGenerator.tsx` | 274 | AI-powered script creation via edge function |
| `ScriptTestMode.tsx` | 761 | Preview script as agent would see it |
| `TemplateGallery.tsx` | 447 | Browse/select pre-built script templates |
| `SaveAsTemplateDialog.tsx` | 131 | Save current script as reusable template |
| `EditableFieldsConfig.tsx` | 170 | Configure which fields clients can edit |
| `NodePropertyEditors.tsx` | 478 | Per-node property editing panels |
| `NodeDataFieldsEditor.tsx` | 398 | Data field binding per node |
| `ScriptBuilderPage.tsx` | NEW | Full React Flow canvas page (was planned but not created yet) |

**B. Agent Runtime (7 missing components)**

| Component | Lines | Purpose |
|---|---|---|
| `AgentCallNotesInput.tsx` | 380 | Real-time call notes with auto-save |
| `PostCallSummary.tsx` | 283 | Auto-generated call summary with email/SMS |
| `TaskQueuePanel.tsx` | 534 | Agent task queue with callbacks |
| `CallbackRemindersPanel.tsx` | 382 | Scheduled callback management |
| `ClientAvailabilityBanner.tsx` | 246 | Client availability status banner |
| `AINodeSuggestions.tsx` | 373 | AI-suggested next steps for current node |
| `NodeExternalLinks.tsx` | ~100 | Links attached to script nodes |

**C. Analytics (select components, 8 valuable)**

| Component | Lines | Purpose |
|---|---|---|
| `LiveMonitoringPanel.tsx` | ~400 | Real-time agent state monitoring |
| `LiveScriptViewer.tsx` | ~300 | Watch agent script execution live |
| `SessionReplayDialog.tsx` | ~350 | Replay past call sessions |
| `CallSessionAnalytics.tsx` | ~300 | Call duration/volume charts |
| `OutcomeAnalyticsDashboard.tsx` | ~400 | Disposition breakdown analytics |
| `PathAnalyticsDashboard.tsx` | ~350 | Script path frequency analysis |
| `AgentPerformanceMetrics.tsx` | ~300 | Per-agent KPI cards |
| `AgentContributions.tsx` | ~250 | Agent activity ranking |

**D. Supervisor Panels (8 valuable, skip duplicates)**

| Component | Purpose |
|---|---|
| `PendingChangesQueue.tsx` | Approval queue for client edits |
| `SupportTicketQueue.tsx` | Internal support tickets |
| `DemoRequestsPanel.tsx` | Inbound demo request management |
| `EmailIngestionPanel.tsx` | Email-to-ticket ingestion |
| `SmsRecipientsManager.tsx` | SMS recipient lists |
| `SupervisorTaskManagement.tsx` | Task assignment |
| `EmbedDomainWhitelist.tsx` | Allowed embed domains |
| `ScheduleOverrideDialog.tsx` | Campaign schedule overrides |

Skip: UserManagementPanel (Fabric59 has SettingsPage team management), InvitationsPanel (Fabric59 has InviteMemberDialog), CampaignManagementPanel (Fabric59 has CampaignsPage), OutcomeTypesManager (Fabric59 has DispositionsPage), CallSummaryTemplatesManager (Fabric59 has CallSummaryTemplatesPage), AuditLogPanel (Fabric59 has useAuditLog), NotificationHistoryPanel (Fabric59 has NotificationsPage), PartnerManagementPanel/Analytics/Resources (Fabric59 has PartnersPage/PartnerOverviewPage), TwilioConfiguration/ResendApiKeyConfiguration/VapidKeyConfiguration (integration config belongs in IntegrationsPage)

**E. Client Dashboard (new concept for Fabric59)**

All 7 components are net-new: ScriptEditableSection, CallNotesEditor, ClientAvailabilityControl, OutboundRequestPortal, AutoSummarySettings, PendingChangesStatus, SmsRecipientsEditor

**F. Missing Hooks (net-new only)**

| Hook | Purpose |
|---|---|
| `useScriptTemplates` | Template CRUD for TemplateGallery/SaveAsTemplate |
| `useScriptNodeLinks` | Links attached to nodes |
| `useAgentPresence` | Agent online/offline status |
| `useAutoPostCallSummary` | Auto-generate post-call summaries |
| `useCallSummary` | Call summary generation |
| `useCallbackReminders` | Callback scheduling |
| `useRealtimeCallNotes` | Real-time call notes sync |
| `useAgentPerformance` | Agent KPI queries |
| `useNotificationSound` | Audio notification playback |
| `usePendingChanges` | Client edit approval workflow |
| `useSupportTickets` | Support ticket CRUD |
| `useEmbedWhitelist` | Embed domain whitelist |
| `useOutcomeAnalytics` | Disposition analytics |
| `useSupervisorAlerts` | Real-time supervisor alerts |
| `useGoalProgressHistory` | Goal progress tracking |
| `useGoalTemplates` | Pre-built goal templates |

**G. Edge Functions (4 truly net-new)**

| Function | Purpose |
|---|---|
| `generate-script` | AI script generation |
| `ai-suggestions` | AI node suggestions during calls |
| `lookup-script-by-dnis` | Five9 DNIS → script resolution |
| `send-call-summary` | Email call summaries |

Skip: check-campaign-schedules (Fabric59 has process-jobs), ingest-email/check-goal-alerts/send-goal-comment-email/send-change-notification/send-slack-notification (niche, can add later), send-push-notification/send-digest-email/unsubscribe (digest system), invitation functions (Fabric59 has invite-member), cron management (backend concern), track-referral-click (marketing)

## Implementation Approach

This is a massive scope. I recommend implementing in 3 batches:

**Batch 1 — Script Builder Completion (this implementation)**
- 8 script builder components + ScriptBuilderPage
- 2 hooks (useScriptTemplates, useScriptNodeLinks)
- 1 edge function (generate-script)
- Update App.tsx routes + ScriptEditorPage with "Open Builder" link

**Batch 2 — Agent Runtime + Analytics**
- 7 agent runtime components
- 8 analytics components  
- 6 hooks (useAgentPresence, useCallSummary, useCallbackReminders, useRealtimeCallNotes, useNotificationSound, useOutcomeAnalytics)
- CommandCenterDashboard page
- Enhance AgentDashboardPage with Live Script tab

**Batch 3 — Supervisor Panels + Client Dashboard**
- 8 supervisor panels
- 7 client dashboard components + ClientDashboardPage
- Remaining hooks (usePendingChanges, useSupportTickets, useEmbedWhitelist, etc.)
- Remaining edge functions

## Batch 1 Detail — What to Build Now

### Database
- Create `script_templates` table: `id`, `organization_id`, `tenant_id`, `name`, `description`, `content JSONB`, `category`, `is_built_in boolean DEFAULT false`, `created_by`, `created_at`
- Create `script_node_links` table: `id`, `script_id`, `node_id`, `url`, `label`, `created_at`

### New Components (copy + adapt from source)
All adapted: `client_id` → `organization_id`/`tenant_id`, `content` → `definition`, source auth context → Fabric59 `useAuth`

1. `src/components/script-builder/AIScriptGenerator.tsx` (274 lines)
2. `src/components/script-builder/ScriptTestMode.tsx` (761 lines)
3. `src/components/script-builder/TemplateGallery.tsx` (447 lines)
4. `src/components/script-builder/SaveAsTemplateDialog.tsx` (131 lines)
5. `src/components/script-builder/EditableFieldsConfig.tsx` (170 lines)
6. `src/components/script-builder/NodePropertyEditors.tsx` (478 lines)
7. `src/components/script-builder/NodeDataFieldsEditor.tsx` (398 lines)

### New Page
8. `src/pages/admin/ScriptBuilderPage.tsx` — Full React Flow canvas with all 22 node types, toolbar, node palette sidebar, property panel

### New Hooks
9. `src/hooks/useScriptTemplates.ts`
10. `src/hooks/useScriptNodeLinks.ts`

### New Edge Function
11. `supabase/functions/generate-script/index.ts` — AI script generation using Lovable AI models

### Modified Files
- `src/pages/admin/ScriptEditorPage.tsx` — Add "Open Visual Builder" button per script row
- `src/App.tsx` — Add `/admin/scripts/:scriptId/builder` route
- `src/pages/admin/AgentDashboardPage.tsx` — Add "Live Script" tab with ActiveScriptViewer

