# Campaign publish + embed + transfer directory — architecture

Status: shipped. Source of truth for the published campaign runtime, the
Five9 (and future) iframe consumer model, and the rule-based transfer
policy engine.

## 1. Route model

| Route | Auth | Shell | Purpose |
| --- | --- | --- | --- |
| `/embed/c/:campaignId` | public | none (chromeless) | Published campaign runner; iframe target |
| `/w/:workspaceId/campaigns/:campaignId/embed-preview` | authenticated | none (same chromeless shell) | Admin preview of exactly what Five9 sees |
| `/w/:workspaceId/campaigns/:campaignId` | authenticated | WorkspaceShell | Admin config (publish + directory + rules) |
| `/app/agent/workspace/:workspaceId/:campaignId` | authenticated | none (runner shell) | Canonical internal call runner; unchanged |

**Chosen route shape:** `/embed/c/:campaignId`.
- Stable, unique per campaign without inventing slug infrastructure.
- Five9 only needs the campaign id (already known to admins).
- Workspace and tenant are resolved server-side from the campaign row.
- Token-gated mode: append `?t=<token>`.

Rejected: `/embed/:workspaceSlug/:campaignSlug` — slugs aren't first-class on
campaigns or workspaces and would have required new fields, collision
handling, and ongoing slug uniqueness machinery.

## 2. Config storage model

All publish + transfer config lives in the existing `campaigns.metadata jsonb`
column. No schema changes.

```
campaigns.metadata
├── publish: CampaignPublishConfig
└── transferDirectory: TransferDirectoryConfig
```

Reads: `readPublishConfigFromMetadata`, `readTransferDirectoryFromMetadata`.
Writes go through `applyPublishPatch` / `applyTransferDirectoryPatch`, which
spread the whole metadata object so unrelated keys are preserved.

Versions stamped via the embedded `version: 1` field on each sub-object.

## 3. Embed runtime context model

Implemented in `src/lib/campaign-publish/runtimeContext.ts`. Normalizes:

Canonical params: `call_id`, `session_id`, `ani`, `agent_id`, `agent_name`,
`campaign`, `mode` (`embed | preview | kiosk`), `theme`, `lang`. Reserved
`t` for access token (NOT carried into context).

- Strings trimmed, control chars stripped, length-capped at 256.
- Invalid mode/theme silently fall back to defaults.
- Unknown params bucketed into `passthrough`, capped at 32 entries.
- Param aliases from `publish.paramMap` are honored (e.g. Five9's
  `five9_caller` → `ani`).

**Trust posture:** runtime context is for display + scoping only. It is
NEVER used as authorization.

## 4. Edge-function minimal payload contract

`supabase/functions/campaign-embed-resolve/index.ts` accepts
`{ campaignId, token? }` and returns:

```jsonc
{
  "campaign":   { "id": "...", "name": "..." },
  "workspace":  { "id": "...", "name": "..." },
  "publish":    { "enabled": true, "theme": "...", "access": "...", "version": 1 },
  "guide":      <published guide content or null>,
  "flow":       <published flow content or null>,
  "transferDirectory": { "entries": [...], "rules": [...] }
}
```

Hard guarantees:
- **Never** echoes `publish.token`.
- **Never** returns `created_by`, `legacy_status`, `source_*`, or any
  admin-only metadata sibling of `publish` / `transferDirectory`.
- Returns the same `{"error":"unavailable"}` 404 envelope for
  not-found, publish-disabled, and token-mismatch — so existence is not
  leaked through error shape.

The function runs with the service role to bypass authenticated-only RLS in
the same controlled way that other public functions (e.g. `get-public-form`)
do. Publish + token enforcement happens in code, not RLS.

## 5. Transfer directory entry model

See `src/lib/transfer-directory/types.ts`. Industry-neutral fields:
`displayName`, `team`, `role`, `phoneNumber`, `extension`, `transferType`,
`enabled`, `fallback`, `escalationLevel`, `issueTags`, `specialtyTags`,
`urgencyTags`, `hours`, `instructions`, `sortOrder`, `metadata`.

Vertical-specific vocabulary (e.g. "claims", "intake") lives only in user-
defined tags, never in type names.

## 6. Rule model

```ts
TransferRule = {
  id, name, enabled, priority,
  when: ConditionGroup,
  then: RuleAction
}
ConditionGroup = { combinator: "all" | "any", conditions: (Condition | ConditionGroup)[] }
Condition = { field: ContextFieldKey, key?: string, op: Operator, value? }
RuleAction =
  | include { targetIds, tagsAny? }
  | exclude { targetIds, tagsAny? }
  | prioritize { targetIds, boost? }
  | escalation_only { targetIds }
  | fallback_only { targetIds }
  | instructions_only { message }
  | annotate { targetIds, rationale }
```

Context fields: `issueType`, `category`, `specialty`, `urgency`, `stepId`,
`branch`, `disposition`, `timeMode`, `transferGroup`, `capturedField` (with
`.key`).

Operators: `eq`, `neq`, `in`, `nin`, `contains`, `gte`, `lte`, `exists`,
`missing`.

## 7. Evaluation lifecycle

Implemented in `src/lib/transfer-directory/evaluateRules.ts`. Pure function.

1. Drop disabled entries.
2. Filter by hours behavior vs `context.timeMode`.
3. Apply rules in deterministic order (`priority desc, id asc`).
4. `instructions_only` short-circuits — no targets, only the message.
5. **Exclusion always wins.** A later `include` cannot un-exclude.
6. If any `include` rule matched, the candidate set is restricted to its
   union (positive whitelist mode).
7. `escalation_only` / `fallback_only` flag affected entries.
8. `prioritize` boosts entries; `annotate` appends rationale strings.
9. Stable sort within bucket: `(boost desc, escalationLevel asc,
   sortOrder asc, displayName asc)`.
10. Bucket: `recommended | allowed | escalation | fallback | unavailable`.
11. `singleAllowed: true` when exactly one entry remains across
    recommended+allowed. The lone target gets a rationale chip.

Conflict resolution summary:
- Exclude beats include.
- Highest-priority rule applied first, but exclusion is sticky.
- Urgency / hours modifiers reorder, never override hard exclusions.
- Fallback bucket is shown UI-side only when no allowed/recommended exist.

## 8. Runtime integration with the flow

Inputs the resolver reads from runner state (via captured `values`):
- `__issue_type__`, `issue_type` → `issueType`
- `__specialty__`, `specialty` → `specialty`
- `__urgency__` → `urgency`
- `__outcome__` → `disposition`
- `__branch_label__` → `branch`
- `__time_mode__` → `timeMode`
- `__transfer_group__` → `transferGroup`
- `currentStepId` → `stepId`
- All other captured values → `capturedField` lookups by key

Re-evaluation: every time `session.values` or `currentStepId` changes
(`useTransferRecommendations` is `useMemo`-driven).

## 9. Access / security posture

- `publish.enabled === false` → embed route returns the unified
  "unavailable" terminal state.
- `publish.access === "token"` → embed route must present a matching `?t=`.
  Constant-time string compare server-side.
- Tokens are **convenience protection**, NOT strong authorization. Treat the
  embed URL as semi-public; never paste it into untrusted contexts.
- Tokens are NEVER logged client-side, in test snapshots, in edge-function
  logs, or echoed in the resolver response. The admin UI reveals a new
  token exactly once at regeneration time.
- Query params are NEVER trusted for access decisions — display/runtime
  hints only.
- The unified "unavailable" 404 envelope avoids leaking existence vs
  publish state vs access result.

## 10. Embed shell contract

`src/components/embed/EmbedShell.tsx` mounts directly under the route. No
WorkspaceShell, no OrgRail, no AdminShell. The `data-embed-shell="true"`
marker is asserted by regression tests.

- ≥1280px: three columns (Guide | Flow | Directory).
- 1024–1279px: two columns (Flow | Directory).
- <1024px: single column with the flow primary; directory + guide below.

Reserved `mode` flags:
- `embed` (default) — Five9 iframe target.
- `preview` — admin-only overlay (future polish hook).
- `kiosk` — notes-hidden variant (future polish hook).

## 11. Testing strategy

| Category | File |
| --- | --- |
| Publish config normalization + URL builders + runtime context | `src/test/regressions/campaignPublishConfig.test.ts` |
| Transfer rule engine (exclusion, single-allowed, instructions-only, hours, prioritize, captured fields, determinism) | `src/test/regressions/transferRuleEngine.test.ts` |
| Embed route isolation + edge-function no-echo contract | `src/test/regressions/embedCampaignRunner.test.ts` |
| Transfer directory UI buckets + banners | `src/test/regressions/transferDirectoryUi.test.tsx` |

## 12. Observability

The engine return shape includes per-target `reasons[]` and the global
`matchedRuleIds[]`, so the UI can always answer "why?" without separate
debug calls. The transfer panel renders rationale chips on every target.
Unavailable entries show the exclusion reason on hover.

## 13. Extension points

- Add new context fields → extend `ContextFieldKey` and the resolver inputs
  in `useTransferRecommendations` + `EmbedCampaignRunnerPage`.
- Add new actions → extend `RuleAction` and add a branch in
  `evaluateTransferRules`.
- Add new embed consumers → reuse `EmbedCampaignRunnerPage` and
  `campaign-embed-resolve`; param aliasing via `publish.paramMap` makes
  vendor-specific naming a config concern, not code.
