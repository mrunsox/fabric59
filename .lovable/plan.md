

# Notification Hub Enhancements -- Add to Build Outline

## Analysis Summary

The provided prompt contains a full multi-channel notification routing engine. After comparing against our existing code, most of the infrastructure is already built or not applicable to our stack. However, 5 specific enhancements would meaningfully improve our existing `send-notification` flow and integrate cleanly with our disposition email engine.

## What We Already Have (No Action Needed)

- `send-notification` edge function dispatching to Slack, Zapier, Make, Pabbly, n8n
- `five9-webhook` receiving events and triggering downstream notifications
- `twilio-sms` edge function (stub, ready for wiring)
- Per-tenant `notification_triggers` boolean toggles
- `notifications` table logging all attempts

## What We Discard (Not Logical for Our Flow)

- WhatsApp channel (no Five9 Digital Engagement integration)
- WEB_PUSH and MOBILE_PUSH (no PWA or native app)
- Five9 Automated Messaging Service actions (we use webhooks, not Five9's messaging stack)
- User-level `has_mobile_app`, `whatsapp_number` fields
- The complex JSON routing decision output format (our `send-notification` already handles dispatch internally)
- "Virtual receptionist" entity model (Client/User/NotificationPreference as separate tables -- our tenant/org model already covers this)

## What to Add to `/outline` (5 Items)

These integrate into the existing **"Post-Call Automations"** category in the build map, replacing the generic items with more specific, actionable ones:

### New Items for "Post-Call Automations" Category

| Item | Description | Status |
|------|-------------|--------|
| Urgency-Based Channel Routing | Add urgency level (LOW/NORMAL/HIGH) to notification payloads; HIGH-urgency events prefer real-time channels (SMS/Slack), LOW uses email only | planned |
| Quiet Hours per Organization | Per-org quiet hours window (start/end time + timezone); non-HIGH notifications are delayed until window ends | planned |
| Channel Preference & Fallback | Primary/secondary channel selection per org with automatic fallback when primary fails (Slack -> SMS -> Email) | planned |
| Disposition-to-Channel Mapping | Extend disposition email engine so each disposition can trigger specific notification channels beyond email | planned |

The existing items "SMS Notifications", "Push Notifications", and "Automation Rules Engine" remain as-is since they cover different scope (Twilio wiring, browser push, and rule builder UI respectively). "AI Email Summary" also stays.

## Technical Details

### File: `src/data/buildMap.ts`

Update the "Post-Call Automations" category (lines 288-295) to insert the 4 new items alongside the existing 4, bringing the category to 8 items total.

### No Other File Changes

- No database migrations (those come when we build these features)
- No edge function changes
- No UI changes
- This is strictly a build outline update

## Updated Category After Change

```text
Post-Call Automations (8 items)
  [planned] AI Email Summary
  [planned] SMS Notifications
  [planned] Push Notifications
  [planned] Automation Rules Engine
  [planned] Urgency-Based Channel Routing      <-- NEW
  [planned] Quiet Hours per Organization        <-- NEW
  [planned] Channel Preference & Fallback       <-- NEW
  [planned] Disposition-to-Channel Mapping      <-- NEW
```

## Impact on Outline Totals

| Metric | Before | After |
|--------|--------|-------|
| Total Items | ~169 | ~173 |
| Planned | 39 | 43 |

