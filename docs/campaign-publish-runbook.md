# Campaign publish + Five9 embed — runbook

Admin-facing guide. See `campaign-publish-embed-architecture.md` for the
technical model.

## Publish a campaign

1. Open the campaign at `/w/<workspaceId>/campaigns/<campaignId>`.
2. In the **Publish** card, toggle "Publishing enabled" on.
3. Choose an access mode:
   - **Public link** — anyone with the URL can load it.
   - **Token-gated link** — also requires `?t=<token>`. Click Regenerate to
     create a token; copy it immediately (it is shown exactly once).
4. Click the copy button next to the **Embed URL**.

## Embed in Five9

Paste the snippet from the **Five9 iframe snippet** field into your Five9
agent-script web element. Example:

```html
<iframe
  src="https://your-app.lovable.app/embed/c/<campaign-id>?call_id={{$Call.call_id}}&ani={{$Call.ANI}}&agent_id={{$Agent.username}}&agent_name={{$Agent.fullName}}"
  style="width:100%;height:100%;border:0"
  allow="clipboard-write"
  title="Fabric59 campaign runner"
></iframe>
```

For token-gated campaigns the snippet includes `&t=<token>`. Rotate the
token if a URL is shared outside its intended audience.

## Supported runtime query parameters

| Param | Purpose |
| --- | --- |
| `call_id` | Five9 interaction id |
| `session_id` | External session identifier |
| `ani` | Caller automatic number identification |
| `agent_id` | Agent username |
| `agent_name` | Agent display name |
| `campaign` | Optional friendly campaign id hint |
| `mode` | `embed` (default), `preview`, `kiosk` |
| `theme` | `light`, `dark`, `auto` |
| `lang` | Language hint |
| `t` | Access token (token mode only) |

Unknown params are accepted (capped at 32) and made available to the
runner as `passthrough` values; they're never used for auth.

## Configure the transfer directory

In the **Transfer directory** card, three tabs:

- **Entries** — add the people/teams an agent may transfer to. Fill display
  name, role, phone/extension, and optional tags. Toggle Enabled / Fallback
  and set Escalation tier.
- **Rules** — declarative include / exclude / prioritize /
  escalation-only / fallback-only / instructions-only / annotate actions
  with conditions on issue type, specialty, urgency, branch, captured
  fields, and more.
- **Simulator** — punch in an example context and instantly see which
  targets would surface.

Save changes when you're done. The directory takes effect immediately for
both the internal runner and the embed runner.

## Common rule patterns

- "Only Person A handles issue X":
  - When `issueType == X` then `include` targets `[A]`.
- "Hide direct transfers after hours":
  - When `timeMode == after_hours` then `exclude` targets `*` with
    `tagsAny = ["direct"]`.
- "High-urgency calls escalate first":
  - When `urgency == high` then `prioritize` targets `[escalation_team]`
    boost 50.
- "Transfer blocked in this branch":
  - When `branch == blocked` then `instructions_only` with a message that
    explains the alternative path.

## Verify before going live

1. Preview the embed: click the external-link button next to the URL — it
   opens `/w/.../embed-preview` in a new tab with the exact embed shell.
2. Open the runner in incognito with the published URL to confirm the
   public path works (and that token gating, if enabled, blocks unkeyed
   loads).
3. Run a few simulator scenarios to confirm rule outcomes.

## Security notes

- Token gating is convenience protection, not authorization. Treat the
  embed URL as semi-public.
- Tokens are shown once at regeneration. Regenerate if a URL leaks.
- The embed runner returns only published content; admin metadata,
  draft flows, and other campaign internals are never exposed.
