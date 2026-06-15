# External Resource Workspace — Architecture

This doc is the source of truth for how Fabric59 surfaces and launches
external resources (booking calendars, websites, documents, forms, portals,
and custom apps) inside the canonical live runner and the published Five9
embed runner.

Design goals:

- Better than Zingtree's Link Node model: structured, contextual,
  policy-aware, session-tracked, with first-class booking and graceful
  blocked-embed fallback.
- Industry-agnostic. Vertical vocabulary (claims, intake, lien etc.) lives
  only in user-defined tags, never in type names or runtime behavior.
- No schema, RLS, or migration changes. Config is JSON inside the existing
  `campaigns.metadata` JSONB column, sibling to `publish` and
  `transferDirectory`.
- Same engine in both the internal runner and the public embed; the embed
  surface only differs by which open modes are allowed and which auto-open
  candidates are honored.

## A. Config storage model

Persisted at:

```text
campaigns.metadata.externalResources = {
  version: 1,
  resources: ExternalResource[],
  rules:     ExternalResourceRule[],
  updatedAt: ISO string | null,
}
```

Reasons for this location:

- Sibling-safe with `publish` and `transferDirectory`. Reads/writes go
  through `applyExternalResourcesPatch`, which preserves every other
  metadata key.
- No new tables, no RLS surface, no generated-type churn. Lovable Cloud
  surfaces the JSON unchanged.
- Versioned (`version: 1`) so future shape migrations can run inside the
  normalizer.

Invalid persisted JSON degrades to `DEFAULT_EXTERNAL_RESOURCES`. Invalid
individual resources/rules are dropped silently — the runner never crashes
on malformed config. URL validation rejects any scheme other than
`http(s):`.

## B. Resource item model

Canonical shape:

```ts
ExternalResource = {
  id: string;
  label: string;
  kind: "calendar" | "website" | "document" | "form" | "portal" | "custom";
  url: string;
  description?: string;
  enabled: boolean;
  openMode: "auto" | "iframe" | "drawer" | "replace_center" | "new_tab";
  sortOrder: number;
  tags: string[];
  issueTags: string[];
  specialtyTags: string[];
  dispositionTags: string[];
  urgencyTags: ("low"|"normal"|"high"|"critical")[];
  allowParamInjection: boolean;
  paramTemplate?: Record<string,string>;   // query-param template
  notesTemplate?: string;
  requiresConfirmation?: boolean;
  preferredWidth?: "sm" | "md" | "lg" | "full";
  metadata?: Record<string, unknown>;
}
```

Normalization defaults (`normalize.ts`):

- `enabled` defaults to true.
- Invalid `kind` falls back to `custom`.
- Invalid `openMode` falls back to `auto`.
- `urgencyTags` clamp to the enum.
- `paramTemplate` keys are restricted to `[a-zA-Z0-9_.\-]+` and capped at 24
  entries.
- `url` must parse as a `http(s):` URL — anything else drops the entire
  resource.

Adding a new kind only requires extending the `ResourceKind` union and
defaulting an entry in `KIND_LABEL`/`KIND_ICON`; the resolver picks safe
behavior via the `custom` fallback if you forget.

## C. Resource rule model

Same condition shape as the transfer-directory engine:

```ts
ResourceConditionGroup = { combinator: "all" | "any", conditions: [...] }
ResourceCondition      = { field, op, value, key? }
```

Supported fields: `issueType`, `category`, `specialty`, `urgency`, `stepId`,
`branch`, `disposition`, `transferGroup`, `embedMode`, `timeMode`, and
`capturedField` (requires `.key`).

Operators: `eq`, `neq`, `in`, `nin`, `contains`, `gte`, `lte`, `exists`,
`missing`.

Actions:

| Action               | Effect                                                     |
| -------------------- | ---------------------------------------------------------- |
| `show`               | Restricts visible set when any show rule matches.          |
| `hide`               | Force-hides the resource. Beats `show` on the same target. |
| `prioritize`         | Adds a numeric boost, moves the resource to recommended.   |
| `suggest`            | Flags the resource and attaches a message.                 |
| `auto_open_if_safe`  | Records a candidate; surface decides whether to honor it.  |
| `annotate`           | Appends a rationale chip.                                  |

Evaluation order (see `evaluateResources.ts`):

1. Filter disabled resources.
2. Apply rules sorted by `(priority desc, id asc)`.
3. `hide` wins over `show` on the same target.
4. If any `show` matched, restrict surviving resources to those explicitly
   shown.
5. Stable sort visible: `(boost desc, sortOrder asc, label asc)`.
6. Bucket: boosted/suggested → `recommended`; remaining visible →
   `available`; excluded → `hidden`.
7. Promote a lone visible resource into `recommended` so the agent always
   sees a single suggestion when there is only one option.
8. Resolve `auto_open_if_safe` candidate (see §F).

The engine is pure and deterministic — same inputs produce byte-identical
outputs across runs.

## D. Runtime param templating (`resolveParams.ts`)

Syntax: `{{token}}` where `token` is from the allow-list below, or
`field.<key>` for captured fields.

Allow-list:

```
ani, callerName, callerEmail, issueType, specialty, urgency,
campaignId, campaignName, workspaceId, workspaceName,
agentId, agentName, sessionId, callId, disposition
```

Safety contract:

- Values are URL-encoded.
- Unknown tokens render as empty string. Any query param whose final value
  is empty after substitution is dropped, keeping URLs clean.
- Tokens are never substituted into the URL's host/path/scheme — only the
  query string is mutated. The source URL is pre-validated by
  `sanitizeResourceUrl`.
- The final URL is re-validated to be `http(s):` before return.
- Values are length-capped (256 chars), control chars stripped, final URL
  capped at 2000 chars.

The resolver returns `{ url, unresolved, droppedParams }` so the simulator
and debug surfaces can show which tokens were missing.

## E. Launch-mode resolution (`resolveLaunchMode.ts`)

Pure resolver — deterministic, explainable, no DOM or network work.

`openMode: auto` defaults per kind:

| Kind     | Auto mode       | Reason                                                                |
| -------- | --------------- | --------------------------------------------------------------------- |
| calendar | drawer          | Most booking sites block iframes; drawer keeps script visible.        |
| portal   | new_tab         | Portals near-universally block embedding.                              |
| document | iframe          | Usually frameable; falls back to new tab if blocked.                   |
| form     | iframe          | Forms are usually first-party assets and frame cleanly.                |
| website  | iframe          | Default; fallback to new tab if blocked.                               |
| custom   | iframe          | Caller-defined; treat optimistically.                                  |

Policy downgrades:

- `replace_center` is **always** downgraded to `drawer` in any embed-like
  surface (`embed`, `kiosk`, `preview`). The script must remain visible.
- `iframe` is downgraded to `new_tab` on viewports narrower than 720px.
- Auto-resolved iframe modes for calendars/portals include a hint in the
  reason string so admins/operators know to expect occasional fallbacks.

The resolver does NOT make authoritative cross-origin frameability claims.
The runtime load watchdog in `ResourceLauncher` is the source of truth (see
§G).

## F. Auto-open safety

`auto_open_if_safe` is the only action that can launch a resource without
explicit agent click. It is honored only when ALL hold:

- The candidate is in `recommended` or `available` after rule evaluation.
- The resource does not have `requiresConfirmation: true`.
- The surface is `internal`, OR it is an embed-like surface AND the
  resource's effective open mode is not `replace_center`.

The runner still surfaces an "Open now / Dismiss" banner so the agent is
never surprised; the banner just makes the right choice the default.

## G. Blocked iframe fallback (`ResourceLauncher`)

Iframe probing is best-effort UX only — never authoritative security
detection. Cross-origin HEAD requests for `X-Frame-Options` /
`Content-Security-Policy` are unreliable and were intentionally not used.

Strategy:

1. Render the iframe with a conservative sandbox
   (`allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin`)
   and `referrerPolicy="no-referrer"`.
2. Start a 4-second load watchdog. If `onLoad` fires before the timer, mark
   `loaded` and emit `embedded_loaded`.
3. If the watchdog fires first, render a clear blocked panel with the
   resource label, host, and a prominent **Open in new tab** action plus a
   **Retry inline** option. Emit `embedded_blocked` with the watchdog
   timeout as the detail.

All new-tab opens (programmatic `window.open` and anchor-based) use
`noopener,noreferrer` semantics — see `openInNewTab`. Programmatic opens
also null `w.opener` defensively.

## H. Appointment booking workflow

Calendars are a first-class resource kind. Beyond the standard launch
controls, calendar resources surface inline booking actions:

- **Mark opened** → `booking_opened`
- **Mark booked** → `booking_completed` + inserts a note
- **Send link** → `booking_link_sent` + inserts a note
- **Unable** → `booking_unable`

These are agent-driven attestation events, not provider-side confirmations.
The architecture intentionally avoids per-provider SDKs (Calendly, Google
Calendar, etc.) so any booking URL works the same way. Provider-specific
deep integrations are a future extension point — see §L.

Booking-related param templating commonly uses `{{ani}}`, `{{callerName}}`,
`{{callerEmail}}`, `{{issueType}}`, and `{{agentName}}`.

## I. Session/event tracking

Events live on the runner session under
`session.values["__resource_events__"]` (`RESOURCE_EVENT_TRAIL_KEY`). The
helper module `events.ts` provides `buildEvent`, `recordEvent`, and
`surfaceEvaluated`. The trail is capped at 200 entries.

Event kinds:

```
surfaced, opened, embedded_loaded, embedded_blocked, opened_new_tab,
copied, notes_inserted, booking_opened, booking_completed,
booking_link_sent, booking_unable, dismissed
```

Each event carries `{ resourceId, resourceLabel, resourceKind, launchMode?,
detail?, context: { stepId, issueType, urgency, branch, disposition,
embedMode } }`. The trail is read-only from the engine's perspective —
nothing downstream mutates it, and the Phase 7 submission pipeline contract
is unchanged.

## J. Runner/embed integration

Both the canonical runner (`LiveCallRunnerPage`) and the embed runner
(`EmbedCampaignRunnerPage`) instantiate the same `ExternalResourcesPanel`
in the right-hand column, stacked under Copilot/Transfer Directory. The
panel:

- Computes context from the current session values + workspace/campaign
  identity.
- Calls `evaluateResources` (memoized).
- Renders ranked buckets with rationale chips and an auto-open banner.
- Routes launches through `ResourceLauncher`, which honors the resolver
  output and presents the blocked-embed fallback when needed.

Differences:

- Canonical runner passes `embedMode: "internal"` — all auto-open
  candidates are honored.
- Embed runner passes `embedMode: "embed" | "kiosk" | "preview"` from the
  URL `mode` param — auto-open is suppressed for any resource whose
  effective open mode would replace the center.

The embed payload contract gains an optional `externalResources` field
(typed in `campaign-publish/types.ts`). Older payloads omit it; the runner
falls back to an empty config.

## K. Admin configuration contract

`ExternalResourcesEditor` extends the canonical campaign detail page with
three tabs:

- **Resources** — structured fields per resource (label, kind, URL, open
  mode, width, tags, param injection toggle + per-key template editor,
  notes template, confirmation flag).
- **Rules** — structured rule builder with a condition group editor and an
  action selector that swaps in the right fields per action kind.
- **Simulator** — pick an evaluation context, see ranked buckets with
  reasons, resolved URLs, and the list of matched rule ids.

The editor never falls through to raw JSON for common cases. Token allow
list is surfaced inline so admins know what works.

## L. Extension points

- **More resource kinds** — extend `ResourceKind` and add defaults in
  `autoModeForKind` + `KIND_LABEL` + `KIND_ICON`.
- **Provider-specific booking adapters** — wrap `BookingActions` to call
  provider SDKs for verified booking confirmations. The event names stay
  the same so downstream analytics don't break.
- **Other host environments beyond Five9** — the embed runtime already
  reads from generic URL params and normalizes via `paramMap` on the
  publish config. Any host that can populate URL params can use it.
- **Per-tenant resource policies** — the rule engine accepts any
  `ResourceEvaluationContext`; a future per-tenant policy layer can pass
  additional fields and either show/hide via `show`/`hide` actions or
  prefix tags to opt-in resources.

## M. Tests

| Suite                                          | What it covers                              |
| ---------------------------------------------- | ------------------------------------------- |
| `externalResourceNormalize.test.ts`            | URL rejection, defaults, sort, clamping     |
| `externalResourceRuleEngine.test.ts`           | show/hide precedence, prioritize, suggest, auto-open safety, determinism |
| `externalResourceParamTemplate.test.ts`        | token resolution, URL encoding, missing-value drop, no-script guard |
| `externalResourceLaunchMode.test.ts`           | per-kind auto, downgrades, narrow viewport, param injection |
| `externalResourcePanel.test.tsx`               | UI buckets, booking actions, auto-open banner, surfaced callback |

Existing publish/embed and transfer-directory suites are unaffected.
