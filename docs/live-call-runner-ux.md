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
