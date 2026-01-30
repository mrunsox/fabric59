
# Five9 Integration Fabric - Complete Build Plan

## Project Overview

A multi-tenant middleware that allows **Five9 virtual receptionists** to handle calls for multiple clients (law firms using Clio, service businesses using Workiz, etc.) entirely within Five9 Agent Desktop—**no CRM logins required**.

```text
┌─────────────────┐      ┌──────────────────────┐      ┌─────────────────┐
│  Five9 Agent    │ ---> │ Integration Fabric   │ ---> │  Client CRMs    │
│  Desktop        │      │ (Your Middleware)    │      │  (Clio/Workiz)  │
└─────────────────┘      └──────────────────────┘      └─────────────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │ Optional: Slack      │
                         │ (Per-Client Choice)  │
                         │ + History Logs       │
                         └──────────────────────┘
```

---

## What's Already Built
- Database tables: `tenants`, `unified_schema`, `api_logs`, `user_roles`, `api_keys`
- Admin dashboard: Tenants, Mappings, API Logs, Test Console, Settings pages
- Edge function scaffolds: `/contacts`, `/intakes` (placeholder logic only)

---

## Build Phases

### Phase 1: Optional Slack Notifications (Per-Tenant)
Slack is an **opt-in feature** — each client decides if they want it.

**Database changes:**
- New `notifications` table to log all sent notifications (for your ops team to reference)
- Add optional fields to `tenants` table:
  - `slack_webhook_url` (null if client doesn't use Slack)
  - `notification_triggers` (JSONB for configurable events like `intake_created`)

**UI changes:**
- Add collapsible "Notifications (Optional)" section to Tenant Form
- Slack webhook URL field (only required if they want Slack)
- Toggle switches for which events trigger notifications
- New Notifications Log page for ops team to view history

**Backend changes:**
- New `send-notification` edge function for Slack delivery
- Update `/intakes` to check if tenant has Slack configured and triggers enabled

### Phase 2: CRM Adapters
- Clio adapter (OAuth2 authentication) for legal practices
- Workiz adapter (API token authentication) for service businesses
- Wire `/intakes` and `/contacts` to call the correct adapter based on tenant's CRM type

### Phase 3: Admin Authentication
- Login page for ops team
- Protect all `/admin/*` routes
- Role-based access (admin vs viewer)

---

## Technical Details

### Database Schema Updates

**New table: `notifications`**
| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | Primary key |
| tenant_id | uuid | Which client this notification is for |
| channel | text | 'slack' (future: 'email', 'sms') |
| recipient | text | Webhook URL used |
| payload | jsonb | Message content sent |
| status | text | 'sent', 'failed', 'pending' |
| response | jsonb | API response (for debugging) |
| trigger_event | text | What triggered it (e.g., 'intake_created') |
| created_at | timestamptz | Timestamp |

**Update `tenants` table - add columns**
| Column | Type | Purpose |
|--------|------|---------|
| slack_webhook_url | text (nullable) | Client's Slack webhook (null = no Slack) |
| notification_triggers | jsonb | Which events trigger notifications |

### Tenant Form - Notifications Section

The form will have an expandable section:

```text
┌─────────────────────────────────────────────────────────┐
│ Notifications (Optional)                            [v] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Slack Webhook URL                                       │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ https://hooks.slack.com/services/...                │ │
│ └─────────────────────────────────────────────────────┘ │
│ Leave empty if client doesn't use Slack                 │
│                                                         │
│ Notification Triggers                                   │
│ ┌───────────────────────────────────┐                   │
│ │ [x] New intake created            │                   │
│ │ [ ] Call ended                    │                   │
│ │ [ ] Contact updated               │                   │
│ └───────────────────────────────────┘                   │
│ Only shown when Slack webhook is configured             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Edge Function Logic

The `send-notification` function will:
1. Receive tenant_id, event_type, and payload
2. Look up tenant's Slack webhook URL
3. Skip if no webhook configured (not an error)
4. Send formatted Slack message
5. Log to `notifications` table regardless of success/failure

### Slack Message Format

```text
📞 New Intake Received

Contact: John Doe
Phone: 416-123-4567
Type: Divorce Consultation
Urgency: High

Created via Five9 Integration Fabric
```

---

## Files to Create/Modify

| Action | File | Purpose |
|--------|------|---------|
| Migrate | Database | Add `notifications` table + tenant columns |
| Modify | `src/types/database.ts` | Add Notification interface, update Tenant |
| Modify | `src/components/tenants/TenantForm.tsx` | Add optional notifications section |
| Modify | `src/hooks/useTenants.ts` | Include new tenant fields |
| Create | `src/hooks/useNotifications.ts` | Query notifications table |
| Create | `src/pages/admin/NotificationsPage.tsx` | Notification history log |
| Modify | `src/components/layout/AdminLayout.tsx` | Add nav link |
| Modify | `src/App.tsx` | Add route |
| Create | `supabase/functions/send-notification/index.ts` | Slack delivery |
| Modify | `supabase/functions/intakes/index.ts` | Trigger notifications |

---

## Build Order

1. Database migration (notifications table + tenant columns)
2. Update TypeScript types
3. Update Tenant Form with optional notifications section
4. Update useTenants hook
5. Create send-notification edge function
6. Update intakes edge function to trigger notifications
7. Create useNotifications hook
8. Create Notifications admin page
9. Update navigation and routes
10. Test end-to-end: configure a tenant with Slack, trigger intake, verify notification

