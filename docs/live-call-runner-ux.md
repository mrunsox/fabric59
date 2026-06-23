# Live Call Runner — UX Overhaul

Internal note for future runner work. The canonical runner is at
`/app/agent/workspace/:workspaceId/:campaignId` (`LiveCallRunnerPage`).

## What changed

The runner kept its three-panel model and all behavioral contracts. The
overhaul reworked:

- **Header (`SessionHeader.tsx`)** — rebuilt into a command bar with three
  zones: identity (workspace · campaign · routing badge), call signal (ANI,
  call id, elapsed timer with calm / nudge / escalate tones, resumed), ops
  state (step position, required remaining, autosave indicator, reset).
- **Guide panel (`GuidePanel.tsx`)** — sections collapsed by default,
  "Relevant to this step" pin, quick-jump chips for high-value sections,
  intentional search input with `Alt+F`, distinct loading / empty states.
- **Flow panel (`FlowPanel.tsx`)** — top progress rail, dominant active
  step card (icon, step-type label, script line, required pill, inline
  validation), compressed all-steps list, sticky action row with a
  blocking-reason chip, inline submission states (submitting / accepted /
  deferred / error).
- **Copilot (`CopilotPanel.tsx`)** — grouped by intent (speak / ask /
  decide / notify / summarize), each suggestion has Copy / Insert into
  notes / Helpful / Not helpful chips, calmer surface, attached notes block
  with autosave indicator.

## New shared primitives

Lives at `src/components/call-runner/primitives.tsx`:

- `StatusPill` — tone-driven small chip used by the header, flow header,
  guide section badges, copilot signal count.
- `AutosaveIndicator` — `idle | saving | saved | error` with a saved-at
  timestamp tooltip.
- `RunnerSurface` — shared card surface for the three panels with an
  optional `calm` background for the copilot.

## Design rules

- Semantic tokens only. Accent (`--primary`, cyan #0EA5E9) is reserved for
  the active step, the primary action, and copilot signal accents. Warn /
  danger / success use the existing extended status tokens.
- Calm > dense. Default to muted surfaces and `bg-card`; reserve full
  borders for the active step card and notification banners.
- Copilot is assistive, not decorative. Each suggestion exposes an action
  the agent can take in one click (copy / insert into notes / rate).
- Hotkey contract is the single source of truth. Header, flow, and copilot
  read from `src/lib/call-runner/hotkeys.ts`; do not hardcode key strings.
- Step-type vocabulary stays industry neutral (see `STEP_TYPE_LABEL`).

## Backward compatibility

- `useCallRunnerSession`, `useCallCopilot`, `submitInteractionDraft`, and
  `buildInteractionPayload` signatures are unchanged.
- `SessionHeader`, `GuidePanel`, `FlowPanel`, `CopilotPanel` accept only
  additive props (`stepPosition`, `requiredRemaining`, `autosave*`,
  `currentStepHint`, `submissionState`, `onInsertIntoNotes`). Existing
  callers that omit them keep working.
- All `data-testid` values referenced by existing regression tests are
  preserved.

## Responsive behavior

- `lg` (≥1024px) renders the three columns as the runner desktop layout.
- Below `lg`, columns stack: header → guide → flow → copilot. Each panel
  scrolls inside its own surface, so the flow column stays the primary
  scroll target on the desktop layout.
- The page uses `h-dvh` so iOS/iPad Safari does not clip the bottom action
  row behind dynamic browser chrome.

## Accessibility checks before any future runner change

- Tab order: header → guide search → guide sections → active step inputs →
  flow action row → copilot suggestions → call notes.
- Every icon-only button has an `aria-label`.
- Active step card carries `data-active="true"` and `aria-label`.
- Validation errors render with `role="alert"` and the underlying field
  gets `aria-invalid="true"`.
- Autosave status uses `aria-live="polite"` (saving) or `assertive`
  (error) so screen readers announce save state without spam.

## Phase 9 — Calls OS adoption telemetry & coaching

### Telemetry events (platform_events)

Wired via `useCallsTelemetry()` (`src/lib/workspace/telemetry/callsTelemetry.ts`).
All events carry `workspace_id` (auto-injected), and where applicable
`call_session_id`, `campaign_id`, `source` (runs|qa|cockpit|campaign|analytics).

| event_type                          | source(s)        | wired from                                    |
| ----------------------------------- | ---------------- | --------------------------------------------- |
| calls.replay.opened                 | runs/qa/cockpit/campaign | WorkspaceRunsPage, WorkspaceQaPage, CockpitLastCallButton, CampaignCoachingQueue |
| calls.replay.closed                 | (same)           | (same)                                        |
| calls.qa.review_updated             | qa               | WorkspaceQaPage `updateStatus`                |
| calls.performance.viewed            | analytics        | TelemetryView wrapping Performance tab        |
| calls.campaign_outcomes.viewed      | campaign         | TelemetryView wrapping Outcomes tab           |
| calls.coaching.item_opened          | campaign         | CampaignCoachingQueue                         |
| calls.assist.suggestion_used        | cockpit          | already via `call_assist_events` append log   |

### Quick analytics queries

```sql
-- Assist used rate over calls with snapshots, last 14d
WITH covered AS (
  SELECT s.call_session_id FROM call_session_snapshots s
  WHERE s.created_at > now() - interval '14 days'
), used AS (
  SELECT DISTINCT call_session_id FROM call_assist_events
  WHERE event_type = 'suggestion_used' AND created_at > now() - interval '14 days'
)
SELECT count(*) FILTER (WHERE used.call_session_id IS NOT NULL)::float
       / nullif(count(*), 0) AS assist_used_rate
FROM covered LEFT JOIN used USING (call_session_id);

-- Replay opens by source, last 7d
SELECT split_part(source, ':', 2) AS surface, count(*)
FROM platform_events
WHERE event_type = 'calls.replay.opened' AND created_at > now() - interval '7 days'
GROUP BY surface ORDER BY 2 DESC;

-- QA review updates per week
SELECT date_trunc('week', created_at) AS wk, count(*)
FROM platform_events
WHERE event_type = 'calls.qa.review_updated'
GROUP BY wk ORDER BY wk DESC;
```

### AI tag → coaching queue

`extractAiTagsFromSnapshot()` (in `src/lib/workspace/performance/metrics.ts`)
scans the snapshot's `outcome.notes_excerpt` + `outcome.disposition_label`
for the canonical FLAG_TAGS set (`frustrated`, `cancellation_risk`,
`complaint`, `escalation`, `confused`, `angry`). `selectCoachingCandidates`
merges those with any caller-supplied `aiTags` Map, deduplicates, and
renders them as chips on each coaching row. Ranking remains deterministic:
`hard_fail (1000) > soft_fail (500) > tag (+100 per match) > newest`.

### Cockpit "Last call"

`CockpitLastCallButton` mounts in the cockpit top bar. It resolves the
most recent `call_sessions` row for `(workspace_id, agent_id)` with
`ended_at NOT NULL`, opens a side sheet, and renders
`CallSessionReplay`. If no such row exists, the sheet shows an honest
empty-state message. Disabled when no agent record is available.

---

## Phase 10 — Run It In The Wild (Stability & Learning)

No new features, no schema changes, no new surfaces. This phase is an
observation + learning window on top of the Phase 9 telemetry. Only bug
fixes, copy/clarity tweaks, and small usability-bug layout fixes are
permitted while the window is open.

### Phase 10 Questions

Each question maps to a query in the **Quick analytics queries** block
above (or a small variant of one). No new event types are introduced —
all five telemetry names from Phase 9 already cover this.

| # | Question | Query / source |
|---|---|---|
| 1 | What % of snapshot-covered calls have ≥1 `calls.assist.suggestion_used`? | "Assist used rate" query (above), unchanged. |
| 2 | Which campaigns use assist much more than others? | Same query, grouped by `campaign_id` from `call_assist_events`. |
| 3 | What % of completed snapshot-covered calls ever get `calls.replay.opened`? | LEFT JOIN `call_session_snapshots` against `platform_events WHERE event_type='calls.replay.opened'`. |
| 4 | How many QA reviews are created per week, per campaign? | "QA review updates per week" query, add `, campaign_id` to GROUP BY. |
| 5 | How often is `calls.performance.viewed` vs `calls.campaign_outcomes.viewed`? | `SELECT event_type, count(*) FROM platform_events WHERE event_type IN (...) GROUP BY event_type`. |
| 6 | Are certain campaigns never drilled into? | Same as #5 with `GROUP BY campaign_id` and `HAVING count(*) = 0` via anti-join against `campaigns`. |
| 7 | How often is `calls.coaching.item_opened` fired, and for which campaigns / dispositions / tags? | `SELECT campaign_id, payload->>'disposition', payload->>'ai_tag', count(*) FROM platform_events WHERE event_type='calls.coaching.item_opened' GROUP BY 1,2,3`. |

These queries are operator-run (SQL only). No UI is built for them in
Phase 10.

### Phase 10 Fixes

Append a row whenever a bug or friction fix lands during the window.

| Date | Change | Why (signal) | Verification |
|---|---|---|---|
| _(none yet)_ | | | |

### Phase 10 Outcome (TBD)

Filled in at the end of the observation window. Will answer:

1. Are agents using in-call assist in the way we hoped?
2. Is replay being used by QA/supervisors on a meaningful share of calls?
3. Are Performance & Outcomes actually consulted, or do people still drop into raw tables?
4. Are coaching queues pulling their weight, or are they ignored?
5. Do we see systemic quality issues that argue for one targeted follow-on?

Recommendation at close: **freeze Calls OS** or **scope one tight Phase 11 follow-up**. Bring this summary back for approval before any Phase 11 work begins.

