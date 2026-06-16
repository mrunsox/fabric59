## 1. Move Back / Next / Submit bar below the question card

File: `src/components/call-runner/FlowPanel.tsx`

- Remove the action row currently rendered between the header and the body (lines ~311–363).
- Render the same action row *inside* the scrollable body, immediately **after** the `ActiveStepCard` block (between the active card and `CompactStepList`), so it sits directly under the current question.
- Keep the row sticky to the top of its scroll container with `sticky bottom-0` removed — instead use plain inline placement so it visually follows the question card, as the user requested.
- Preserve all existing behavior: `goBack`, `advance`, `onSubmit`, `blockingReason` chip, keyboard shortcuts, `data-testid` values (`runner-next`, `runner-submit`), and the hide-Next rule for `question_branch` / `end_flow`.
- Update the regression test `src/test/regressions/runnerActionBarPosition.test.tsx` to assert the new DOM order: action row appears *after* the active step card, not before it.

No other files in the runner need to change; `LiveCallRunnerPage` and `EmbedCampaignRunnerPage` already mount `FlowPanel`.

## 2. Caller history from ANI (Five9)

Goal: when an agent opens a live call (ANI passed in URL/Five9 screen-pop), show prior interactions for that phone number.

### Data sources (already exist)
- `public.call_sessions` — internal runner history; has `ani`, `organization_id`, `started_at`, `ended_at`, `duration_seconds`, `status`, `script_id`, `agent_id`, `metadata`.
- `public.call_outcomes` joined on `call_session_id` — disposition / outcome label.
- `public.call_notes` joined on `call_session_id` — agent notes summary.
- `public.call_log_cache` — raw Five9 call log JSON cached per org; queried as a fallback when no internal session exists for the ANI.

No schema changes required. RLS on these tables already scopes by `organization_id` via `get_user_org_ids(auth.uid())`.

### Backend (edge function)
New edge function `caller-history`:
- Input: `{ ani: string, limit?: number (default 10) }`.
- Verifies user session, resolves their org ids.
- Normalizes ANI (strip non-digits, optional `+1` handling) and queries:
  1. `call_sessions` where `ani` matches (last-10-digits suffix match) ordered by `started_at desc`.
  2. Left-joins latest `call_outcomes` + a short `call_notes` excerpt per session.
  3. If fewer than `limit` rows, supplements with `call_log_cache` rows whose `call_data->>'ani'` matches.
- Returns a unified array: `{ id, source: 'internal'|'five9_cache', started_at, ended_at, duration_seconds, disposition, agent_name, script_name, summary }`.

Edge function registered in `supabase/config.toml` (verify_jwt = true).

### Frontend
- New component `src/components/call-runner/CallerHistoryPanel.tsx`:
  - Collapsible card titled "Caller history" with the ANI as subtitle.
  - Calls the `caller-history` edge function via `supabase.functions.invoke` once the runner mounts with a non-empty `ani`.
  - Renders a compact list: timestamp, duration, disposition pill, script name, agent, and an expandable notes excerpt. Empty state: "No prior interactions found for this number."
  - Loading skeleton + error toast on failure.
- Mount it in `FlowPanel`'s left/header area (under `SessionHeader`) on `LiveCallRunnerPage` and `EmbedCampaignRunnerPage`. Hidden when `meta.ani` is null.
- Add a small "Caller history (N)" button in `SessionHeader` next to the ANI chip that scrolls/expands the panel.

### Tests
- `src/test/regressions/runnerActionBarPosition.test.tsx` — updated order assertion.
- New `src/test/regressions/callerHistoryPanel.test.tsx` — mocks `supabase.functions.invoke`, asserts the panel:
  - hides when no ANI,
  - shows skeleton then list when data returns,
  - shows empty-state copy when array is empty.

## Out of scope
- No changes to drag-to-reorder behavior.
- No schema migrations.
- No Five9 SOAP live lookups (we reuse cached call logs already pulled by existing sync).
