# External Resource Workspace — Operator Runbook

Day-to-day guide for configuring external resources, rules, and booking
links on a campaign. Pairs with
`docs/external-resource-workspace-architecture.md`.

## Where to configure

Workspace → Campaigns → *campaign* → **External resources** card.

Three tabs:

1. **Resources** — add/edit/remove resource entries.
2. **Rules** — declarative visibility / prioritization.
3. **Simulator** — test the agent's view against a mock context.

Changes are draft until you click **Save changes**. Discarding never
touches the persisted config.

## Adding a resource

1. Click **Add resource**.
2. Set **Label** (what the agent sees) and **URL** (must start with
   `https://`).
3. Pick **Kind**:
   - `calendar` — booking links (Calendly, SimplyBook, Google appointment
     schedules, internal calendars). Surfaces booking actions in the
     runner.
   - `website` — generic external site.
   - `document` — PDF/Doc viewer URL.
   - `form` — embeddable form (Typeform, Tally, internal form share URL).
   - `portal` — login-protected portal. Defaults to opening in a new tab.
   - `custom` — anything else.
4. Pick **Open mode** (`auto` is the safe default):
   - `auto` — per-kind defaults (see architecture §E).
   - `iframe` — open inline; falls back to a new tab if the site blocks
     embedding.
   - `drawer` — right-side panel that keeps the script visible.
   - `replace_center` — takes over the center column (internal runner
     only; downgraded to `drawer` in embed mode).
   - `new_tab` — always open externally.
5. Optionally tag with **Issue tags**, **Specialty tags**, **Urgency
   tags** so rules can target them.
6. To inject runtime values into the URL, enable **Inject runtime values
   into the URL** and add key → template pairs (see next section).
7. Optional **Notes template** is appended to call notes when the agent
   clicks "Insert note".
8. Toggle **Confirm** if the agent should always be asked before
   auto-open promotes this resource.

## Runtime param injection (booking links etc.)

Use `{{token}}` syntax. Supported tokens:

```
ani, callerName, callerEmail, issueType, specialty, urgency,
campaignId, campaignName, workspaceId, workspaceName,
agentId, agentName, sessionId, callId, disposition
```

Plus `{{field.<key>}}` for any captured-field value (e.g.
`{{field.policy_type}}`).

Example: a Calendly booking link prefilled with the caller phone and the
agent name:

```
URL: https://calendly.com/your-team/triage
Param template:
  name  = {{callerName}}
  email = {{callerEmail}}
  a1    = {{ani}}        # custom answer slot
  a2    = {{agentName}}
```

Safety:

- Values are URL-encoded automatically.
- Unknown tokens render empty; empty params are dropped (no
  `&email=&a1=`).
- Non-http(s) URLs are rejected at save.

## Designing rules

Each rule is `when (conditions) → then (action)`.

Common patterns:

- **Show booking on high-urgency flows**
  - When: `urgency in [high, critical]`
  - Then: `prioritize` the calendar resource.
- **Hide the legacy portal for specific dispositions**
  - When: `disposition eq follow_up`
  - Then: `hide` the portal.
- **Auto-open the booking drawer on a specific step**
  - When: `stepId eq schedule_intake`
  - Then: `auto_open_if_safe` the booking resource (set the resource's
    open mode to `drawer`).

Evaluation rules to remember:

- `hide` always beats `show`.
- Higher `priority` rules win conflicts.
- Auto-open never replaces the center column in embed mode.

## Using the simulator

The Simulator tab lets you pick a mock evaluation context (issue type,
urgency, branch, embed mode, etc.) and see exactly which resources the
agent would see, in what order, with what reasons, and what resolved URL.
Matched rule ids are shown for debugging.

Use it before publishing rule changes — especially when changing
auto-open behavior.

## Blocked embeds

Some third-party sites (banks, government portals, certain calendars)
intentionally block iframe embedding. When that happens:

- The agent sees a clear "This site can't be embedded" panel with the
  resource label and host.
- The big button is **Open in new tab** (safe `noopener,noreferrer`).
- A **Retry inline** option is available for transient blanks.

This is the supported behavior — do not try to force-embed by overriding
the resource's open mode unless you've verified the target site allows
embedding from `*.lovable.app` or your custom domain.

## Booking actions

Calendar resources surface four booking actions:

- **Mark opened** — agent opened the booking page.
- **Mark booked** — appointment confirmed (also inserts a note).
- **Send link** — agent sent the link to the caller.
- **Unable** — booking could not be completed.

These are agent attestations, not provider confirmations. They show up in
the in-session event trail under `__resource_events__`.

## Embed mode caveats

In the Five9 iframe runner:

- `replace_center` is always downgraded to `drawer`.
- Auto-open is suppressed for any resource whose effective open mode
  would replace the center column.
- All other behavior is identical to the internal runner.

## Troubleshooting

| Symptom                                           | Likely cause                                       | Fix                                                                 |
| ------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------- |
| Resource doesn't appear for an agent              | A `show` rule matched and excluded it              | Open Simulator with the same context; check Hidden bucket reason    |
| Iframe stays blank                                | Target site blocks framing                         | Change open mode to `new_tab`; agent will be unblocked              |
| Booking link missing the caller phone             | `allowParamInjection` is off or template typo      | Toggle injection on; add `{{ani}}` to a query-param template entry  |
| Auto-open banner never appears in Five9           | Resource's open mode is `replace_center`           | Switch to `drawer` (architecture §E)                                |
| Save fails or URL gets reset                      | URL isn't `http(s)://` or has a script-y scheme    | Use `https://…`                                                     |
