
# Agent Lifecycle Management Module

## Overview

This adds a complete **Agent Lifecycle Management** system (Onboarding + Offboarding) as a new **"Agents"** section in the existing sidebar navigation. It integrates with Five9, Google Workspace, Slack, and Resend — and updates the `/outline` build map to track all new features.

---

## What Gets Built

### Navigation
- New **"Agents"** nav item in the left sidebar, linking to `/admin/agents`
- Two sub-tabs on that page: **Onboarding** and **Offboarding**

### Database Tables (4 new)
| Table | Purpose |
|-------|---------|
| `agents` | Agent records — status, Five9 ID, extension, role, timestamps |
| `scheduled_jobs` | Background jobs for deferred deprovisioning |
| `audit_logs` | Immutable log of every lifecycle action |
| `app_config` | Key/value config (e.g. email domain setting) |

> Note: `user_roles` and `profiles` tables already exist in this project — we will **not** recreate them. The existing `app_role` enum (`master_admin`, `admin`, `ops_team`, `viewer`) is already defined and will be reused. The migration will only add the 4 missing tables.

### Secrets Required (must be added before edge functions work)
| Secret | Purpose |
|--------|---------|
| `FIVE9_USERNAME` | Five9 admin username for provisioning API |
| `FIVE9_PASSWORD` | Five9 admin password |
| `RESEND_API_KEY` | Resend.com API key for credential emails |
| `RESEND_FROM_EMAIL` | Verified sender email |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Google service account |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | RSA private key (PEM) |
| `GOOGLE_ADMIN_IMPERSONATE_EMAIL` | Super admin to impersonate for Directory API |

### Edge Functions (4 new)
| Function | Purpose |
|----------|---------|
| `five9-provisioning` | Full SOAP wrapper — createUser, deactivate, getExtensions, getAllUsers, getSkills, addSkillsToUser, getUserInfo |
| `google-workspace` | Google Admin Directory API — createUser, suspendUser, deleteUser |
| `send-credentials` | Sends styled HTML credential email via Resend |
| `process-jobs` | Background job processor for scheduled deprovisionings |

### TypeScript Types (2 new files)
- `src/types/provisioning.ts` — `AgentRole`, `ProvisioningInput`, `ProvisioningStep`, `ProvisioningResult`, `ProvisioningHistory`, `AGENT_ROLES`, `PROVISIONING_STEPS`
- `src/types/deprovisioning.ts` — `DeprovisioningRequest`, `DeprovisioningStep`, `DeprovisioningResult`, `AuditLogEntry`, `DEPROVISIONING_STEPS`, `GRACE_PERIOD_OPTIONS`

### Hooks (4 new)
- `useAuditLog.ts` — `logAction()` to insert into `audit_logs`
- `useAppConfig.ts` — reads/writes `app_config` (email domain setting)
- `useProvisioning.ts` — 5-step provisioning workflow; fetches agent history
- `useDeprovisioning.ts` — schedule, cancel, execute 6-step offboarding; audit logging
- `useFive9Users.ts` — fetches live agent roster from Five9 via `getAllUsers`

### Pages & Components

**`/admin/agents` page** with two tabs:

**Onboarding Tab:**
- `ProvisioningForm` — Agent Name, Email Handle + domain suffix, Five9 Username, Role dropdown, Extension (with live conflict check), Skills multi-select, External Email, Password (copy + regenerate)
- `WorkflowPanel` with `WorkflowStepper` — 5 steps with animated icons
- `CredentialsCard` — shown after success, all credentials with copy buttons
- `Five9UsersTable` — live roster with search, Name / Username / Extension / Role / Status

**Offboarding Tab:**
- `AgentSearchList` — searchable list with status badges, Offboard/Cancel/Restore actions per agent, multi-select checkboxes
- `DeprovisioningWorkflowPanel` with 6-step stepper
- `AuditLogTable` — Action, Agent, Performed By, Timestamp, Details
- `DeprovisioningModal` — grace period, data transfer config, reason textarea

---

## Files to Create / Modify

| File | Action |
|------|--------|
| `supabase/migrations/YYYYMMDD_agents_module.sql` | Create — 4 new tables + RLS policies |
| `src/types/provisioning.ts` | Create |
| `src/types/deprovisioning.ts` | Create |
| `src/hooks/useAuditLog.ts` | Create |
| `src/hooks/useAppConfig.ts` | Create |
| `src/hooks/useProvisioning.ts` | Create |
| `src/hooks/useDeprovisioning.ts` | Create |
| `src/hooks/useFive9Users.ts` | Create |
| `supabase/functions/five9-provisioning/index.ts` | Create |
| `supabase/functions/google-workspace/index.ts` | Create |
| `supabase/functions/send-credentials/index.ts` | Create |
| `supabase/functions/process-jobs/index.ts` | Create |
| `src/pages/admin/AgentsPage.tsx` | Create — hosts both tabs |
| `src/components/agents/onboarding/ProvisioningForm.tsx` | Create |
| `src/components/agents/onboarding/WorkflowPanel.tsx` | Create |
| `src/components/agents/onboarding/WorkflowStepper.tsx` | Create |
| `src/components/agents/onboarding/CredentialsCard.tsx` | Create |
| `src/components/agents/onboarding/Five9UsersTable.tsx` | Create |
| `src/components/agents/offboarding/AgentSearchList.tsx` | Create |
| `src/components/agents/offboarding/DeprovisioningWorkflowPanel.tsx` | Create |
| `src/components/agents/offboarding/DeprovisioningModal.tsx` | Create |
| `src/components/agents/offboarding/AuditLogTable.tsx` | Create |
| `src/components/agents/shared/StatusBadge.tsx` | Create |
| `src/components/layout/AdminLayout.tsx` | Modify — add Agents nav item |
| `src/App.tsx` | Modify — add `/admin/agents` route |
| `src/data/buildMap.ts` | Modify — add Agent Lifecycle Management category |

---

## Implementation Notes

### Conflicts with existing project
- The existing `user_roles` table uses `app_role` enum with values `master_admin`, `admin`, `ops_team`, `viewer`. The original prompt references an `app_role` with only `admin` and `viewer` — we will **not** recreate this, and will use the existing enum. RLS policies on new tables will use the existing `has_role()` function.
- The existing `profiles` table does **not** exist in this project — the migration will create it.
- The `handle_new_user` trigger will NOT be created — it would conflict with existing auth flow.
- The `send-notification` edge function already exists; the new `send-credentials` is a separate function.

### Google Integration (V1 — wired up)
- Google Workspace steps in offboarding (suspendUser, deleteUser) will be wired to the real `google-workspace` edge function using `agent.google_user_id`. Graceful skip if secrets aren't configured.

### Cron Job for process-jobs
- A pg_cron entry will be created to call `process-jobs` every 30 minutes automatically.

### Outline Updates
A new **"Agent Lifecycle Management"** category is added to `buildMap.ts` with all features marked as `in-progress` or `planned`.

---

## Database Schema

```text
agents
├── id, first_name, last_name, email, role, extension
├── slack_channel, google_user_id, slack_user_id
├── five9_user_id, five9_username
├── status (active | pending_deletion | deprovisioned | under_review | failed)
├── provisioned_by, provisioned_at
└── deprovisioned_by, deprovisioned_at

scheduled_jobs
├── id, agent_id, job_type, status
├── scheduled_for, initiated_by, cancelled_by, cancelled_at
├── config (jsonb), result (jsonb), error_message
└── created_at, updated_at

audit_logs
├── id, user_id, action, entity_type, entity_id
├── details (jsonb), ip_address
└── created_at

app_config
├── id, key, value, description
├── updated_by
└── created_at, updated_at
```

---

## RLS Policy Summary

All 4 new tables follow the existing platform pattern:
- **agents**: Authenticated users can SELECT; admins (existing `has_role`) can INSERT/UPDATE/DELETE; master admin has full access
- **scheduled_jobs**: Same as agents
- **audit_logs**: Authenticated users can SELECT and INSERT their own rows; master admin reads all
- **app_config**: Authenticated users can SELECT; admins can INSERT/UPDATE
