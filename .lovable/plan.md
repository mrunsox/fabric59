# Five9 Integration Fabric - Build Plan

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

## Completed

### Phase 1: Optional Slack Notifications (Per-Tenant) ✅

**Database changes:** ✅
- [x] New `notifications` table to log all sent notifications
- [x] Added `slack_webhook_url` and `notification_triggers` columns to `tenants` table
- [x] RLS policies for ops team access

**UI changes:** ✅
- [x] Collapsible "Notifications (Optional)" section in Tenant Form
- [x] Slack webhook URL input field
- [x] Toggle switches for notification triggers (intake_created, call_ended, contact_updated)
- [x] New Notifications Log page (`/admin/notifications`) for ops team

**Backend changes:** ✅
- [x] `send-notification` edge function for Slack delivery
- [x] Updated `/intakes` endpoint to trigger notifications post-intake

---

## Next Up

### Phase 2: CRM Adapters
- [ ] Clio adapter edge function (OAuth2 authentication)
- [ ] Workiz adapter edge function (API token authentication)
- [ ] Wire `/intakes` and `/contacts` to call the correct adapter based on tenant CRM type

### Phase 3: Admin Authentication
- [ ] Login page for ops team
- [ ] Protect all `/admin/*` routes
- [ ] Role-based access (admin vs viewer)

---

## Technical Reference

### Notification Flow

1. Five9 calls `/intakes` with tenant ID + contact/intake data
2. Intakes function processes the intake (future: sends to CRM)
3. Intakes function calls `send-notification` with trigger_event="intake_created"
4. Send-notification looks up tenant's Slack webhook + triggers
5. If webhook configured AND trigger enabled → POST to Slack
6. All notifications logged to `notifications` table

### Slack Message Format

```text
📞 New Intake Received

Contact: John Doe
Phone: 416-123-4567
Type: Divorce Consultation
Urgency: 🔴 High

Five9 Integration Fabric • Law Firm Alpha
```

### Files Created/Modified

| File | Status | Purpose |
|------|--------|---------|
| `supabase/functions/send-notification/index.ts` | ✅ Created | Slack notification delivery |
| `supabase/functions/intakes/index.ts` | ✅ Updated | Triggers notifications |
| `src/types/database.ts` | ✅ Updated | Added Notification types |
| `src/hooks/useTenants.ts` | ✅ Updated | Includes Slack fields |
| `src/hooks/useNotifications.ts` | ✅ Created | Query notifications |
| `src/components/tenants/TenantForm.tsx` | ✅ Updated | Notifications section |
| `src/pages/admin/NotificationsPage.tsx` | ✅ Created | Notification logs |
| `src/components/layout/AdminLayout.tsx` | ✅ Updated | Added nav link |
| `src/App.tsx` | ✅ Updated | Added route |
