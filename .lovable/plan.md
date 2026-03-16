

# Merge ScriptFlow into Fabric59 — Script & Agent Layer

## Current State

All target pages are **UI shells with 100% mock data** and no database backing:
- `ScripterPage.tsx` (432 lines) — terminal-style runtime with hardcoded script steps
- `AgentDashboardPage.tsx` (235 lines) — mock tasks, call history, training progress
- `PostCallAutomationsPage.tsx` (301 lines) — mock automation rules
- `QAAnalyticsPage.tsx` (291 lines) — mock QA reviews and script path analytics
- `SupervisorPage.tsx` (271 lines) — mock live agent states
- `DispositionsPage.tsx` (45 lines) — **only real page**, wired to Five9 domains

No script, session, KB, training, task, or feedback tables exist in the database.

## What We Will Build

This is a large integration. We will execute it in **3 phases** across this implementation.

### Phase 1: Database Schema (Migration)

Create these tables with org-scoped RLS (matching existing pattern):

**`scripts`** — Visual script definitions
- `id`, `organization_id`, `partner_id` (nullable), `tenant_id` (nullable)
- `name`, `description`, `status` (draft/active/archived)
- `definition` (JSONB — React Flow nodes/edges)
- `created_by`, `created_at`, `updated_at`

**`script_sessions`** — Per-call script execution records
- `id`, `script_id` (FK), `organization_id`, `tenant_id`
- `agent_id` (FK agents), `five9_call_id` (text)
- `started_at`, `ended_at`, `duration_seconds`
- `variables` (JSONB — captured form data)
- `disposition` (text), `post_call_status` (pending/completed/failed)
- `metadata` (JSONB)

**`post_call_automations`** — Rules triggered after disposition
- `id`, `organization_id`, `script_id` (FK, nullable), `tenant_id` (nullable)
- `disposition_match` (text), `action_type` (email/sms/slack/crm/task/callback)
- `config` (JSONB — templates, targets), `enabled` (boolean)
- `created_at`, `updated_at`

**`kb_categories`** — Knowledge base categories
- `id`, `organization_id`, `tenant_id` (nullable)
- `name`, `sort_order`, `created_at`

**`kb_articles`** — Knowledge base articles
- `id`, `category_id` (FK), `organization_id`, `tenant_id` (nullable)
- `title`, `slug`, `content` (markdown), `status` (draft/published)
- `created_by`, `created_at`, `updated_at`

**`training_modules`** — Training/LMS modules
- `id`, `organization_id`, `tenant_id` (nullable)
- `name`, `description`, `sort_order`, `status` (draft/active)
- `created_at`, `updated_at`

**`training_lessons`** — Lessons within modules
- `id`, `module_id` (FK), `title`, `content` (markdown)
- `sort_order`, `duration_minutes`, `created_at`

**`training_progress`** — Per-user lesson progress
- `id`, `user_id`, `lesson_id` (FK), `module_id` (FK)
- `status` (not_started/in_progress/completed), `completed_at`
- `score` (numeric, nullable)

**`tasks`** — Agent task queue
- `id`, `organization_id`, `tenant_id` (nullable)
- `assigned_to` (uuid, nullable), `title`, `description`
- `priority` (low/medium/high), `status` (pending/in_progress/completed)
- `due_date`, `script_session_id` (FK, nullable)
- `created_by`, `created_at`, `updated_at`

**`feedback_submissions`** — Agent bug/feature requests
- `id`, `organization_id`, `submitted_by`
- `type` (bug/feature/other), `title`, `description`
- `status` (open/acknowledged/resolved), `created_at`

**`qa_reviews`** — QA scoring records
- `id`, `organization_id`, `script_session_id` (FK, nullable)
- `agent_id` (FK agents), `reviewer_id`
- `scores` (JSONB — rubric scores), `total_score` (numeric)
- `status` (pending/reviewed/escalated), `notes`
- `created_at`, `updated_at`

All tables get standard org-scoped RLS policies + `updated_at` triggers where applicable.

### Phase 2: Hooks & Types

**Types** — Add to `src/types/database.ts`:
- `Script`, `ScriptSession`, `PostCallAutomation`, `KBCategory`, `KBArticle`
- `TrainingModule`, `TrainingLesson`, `TrainingProgress`
- `Task`, `FeedbackSubmission`, `QAReview`

**Hooks** (new files):
- `useScripts.ts` — CRUD for scripts table
- `useScriptSessions.ts` — list/create sessions
- `usePostCallAutomations.ts` — CRUD for automation rules
- `useKnowledgeBase.ts` — categories + articles CRUD
- `useTraining.ts` — modules, lessons, progress
- `useTasks.ts` — agent task queue CRUD
- `useFeedback.ts` — feedback submissions
- `useQAReviews.ts` — QA review CRUD

### Phase 3: Refactor Existing Pages to Use Real Data

**`ScripterPage.tsx`** — Replace `SAMPLE_SCRIPT` and `KB_ARTICLES` with:
- `useScripts()` to load assigned script for selected tenant
- `useScriptSessions()` to create/complete sessions
- `useKnowledgeBase()` for KB sidebar
- On "Finish ACW", create session record + trigger post-call automation check

**`AgentDashboardPage.tsx`** — Replace all `MOCK_*` with:
- `useTasks()` for task queue
- `useScriptSessions()` for call history
- `useTraining()` for training progress

**`PostCallAutomationsPage.tsx`** — Replace `MOCK_RULES` with:
- `usePostCallAutomations()` for CRUD
- Wire "Add Rule" / "Edit" / "Toggle" to real mutations

**`QAAnalyticsPage.tsx`** — Replace `MOCK_REVIEWS` and `MOCK_SCRIPT_PATHS` with:
- `useQAReviews()` for review queue
- `useScriptSessions()` for script path analytics (aggregate from `variables` JSONB)

**`SupervisorPage.tsx`** — Replace mock agents with:
- Query from `agents` table for roster
- Session data from `script_sessions` for recent activity
- (Real-time agent state requires Five9 supervisor API — mark as future enhancement)

**`AdminLayout.tsx`** — Add new nav items:
- Under "Agent Tools": add "Knowledge Base" (`/admin/kb`), "Training" (`/admin/training`)
- Under "Monitoring": add "Feedback" (`/admin/feedback`)

**New Pages:**
- `KnowledgeBasePage.tsx` — Category/article manager with markdown editor
- `TrainingPage.tsx` — Module/lesson manager + progress view
- `FeedbackPage.tsx` — Feedback submissions list
- `ScriptEditorPage.tsx` — React Flow visual script builder (new route `/admin/scripts` and `/admin/scripts/:id`)

**`App.tsx`** — Add routes:
- `/admin/scripts`, `/admin/scripts/:id`
- `/admin/kb`, `/admin/training`, `/admin/feedback`

## File Changes Summary

| File | Change |
|---|---|
| Migration SQL | Create 11 tables + RLS + triggers |
| `src/types/database.ts` | Add 10 interfaces |
| `src/hooks/useScripts.ts` | New — scripts CRUD |
| `src/hooks/useScriptSessions.ts` | New — sessions list/create |
| `src/hooks/usePostCallAutomations.ts` | New — automations CRUD |
| `src/hooks/useKnowledgeBase.ts` | New — KB CRUD |
| `src/hooks/useTraining.ts` | New — training CRUD |
| `src/hooks/useTasks.ts` | New — tasks CRUD |
| `src/hooks/useFeedback.ts` | New — feedback CRUD |
| `src/hooks/useQAReviews.ts` | New — QA reviews CRUD |
| `src/pages/admin/ScripterPage.tsx` | Refactor to use real data |
| `src/pages/admin/AgentDashboardPage.tsx` | Refactor to use real data |
| `src/pages/admin/PostCallAutomationsPage.tsx` | Refactor to use real data |
| `src/pages/admin/QAAnalyticsPage.tsx` | Refactor to use real data |
| `src/pages/admin/SupervisorPage.tsx` | Partial refactor (agents from DB) |
| `src/pages/admin/ScriptEditorPage.tsx` | New — React Flow script builder |
| `src/pages/admin/KnowledgeBasePage.tsx` | New — KB manager |
| `src/pages/admin/TrainingPage.tsx` | New — Training/LMS manager |
| `src/pages/admin/FeedbackPage.tsx` | New — Feedback list |
| `src/components/layout/AdminLayout.tsx` | Add nav items for new pages |
| `src/App.tsx` | Add new routes |

