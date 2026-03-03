

# ANI Block List -- Analysis and Outline Placement

## What the Prompt Describes

An agent-triggered workflow to block a caller's ANI from reaching a client's DNIS by:
1. Agent selects a "Block Caller" disposition after a call
2. System detects that disposition and extracts the ANI
3. Five9 `modifyCampaignProfile` SOAP call adds a filtering rule (ANI = REJECT)
4. Confirmation notification sent via Slack/email

The prompt suggests using external middleware (Make.com, n8n, Zapier) with scheduled report polling. We can do this entirely internally since we already have:

## What We Already Have (No Duplicates)

| Existing Feature | Relevance |
|---|---|
| `five9-provisioning` edge function with SOAP client | Already calls `modifyCampaignProfile` for dispositions -- same pattern for filtering rules |
| `five9-webhook` receiving real-time call events | Can trigger on disposition without polling |
| `send-notification` dispatching to Slack/email | Confirmation step is already wired |
| `useFive9CampaignProfiles` hook | Already fetches campaign profile names |
| Disposition creation and assignment | "Block Caller" disposition can be created through existing campaign setup |

## What's New (Not Built Yet)

1. **ANI Block SOAP Action** -- A new `modifyCampaignProfile` call in `five9-provisioning` that adds a `filteringRules` element with `action: REJECT`, `field: ANI`, `operator: EQUALS`
2. **Disposition-Triggered Block** -- Logic in `five9-webhook` to detect "Block Caller" disposition and auto-invoke the block action
3. **Block List UI** -- Admin view to see blocked ANIs per campaign profile, with ability to unblock (remove filtering rule)
4. **E.164 Formatting** -- Normalize ANI to E.164 before adding to Five9 filter

## Discard from Prompt

- Scheduled SFTP report export (we use real-time webhooks)
- External middleware (Make/Zapier/n8n) for this flow (we handle it internally)
- Manual Basic Auth setup instructions (already handled in our SOAP client)

## Proposed Outline Addition

Add a new category **"ANI Block List"** with 4 planned items. This is a distinct feature set that doesn't belong under Campaign Setup (which is about initial provisioning) or Post-Call Automations (which is about notifications).

```text
ANI Block List (4 items)
  [planned] ANI Block SOAP Action
  [planned] Disposition-Triggered Auto-Block
  [planned] Block List Management UI
  [planned] Block Confirmation Notification
```

### Item Details

| Item | Description |
|---|---|
| ANI Block SOAP Action | New modifyCampaignProfile call in five9-provisioning to add/remove ANI filtering rules (REJECT action, EQUALS operator) with E.164 formatting |
| Disposition-Triggered Auto-Block | five9-webhook detects "Block Caller" disposition and auto-invokes the block SOAP action for that ANI against the campaign profile |
| Block List Management UI | Admin page showing blocked ANIs per campaign profile with search, unblock button, and audit trail |
| Block Confirmation Notification | Send Slack/email notification confirming "Number [ANI] blocked on [Campaign Profile] by [Agent]" via existing send-notification |

### File Changes

Only `src/data/buildMap.ts` -- insert the new category before "Platform Utilities" (line 303).

