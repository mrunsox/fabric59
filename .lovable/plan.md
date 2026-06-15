# Runner UX: Sticky Action Bar + Draggable Side Cards

Two scoped UX upgrades to the canonical Live Call Runner. Both are additive to the existing layout and preserve Phase 6/7 session, copilot, and submission contracts.

## 1. Action bar above the steps

Today the Back / Next / Submit row sits at the bottom of the center `FlowPanel`. On long flows (17+ steps) the agent must scroll to reach it.

Change: move that action row out of the scrolling body and pin it directly under the panel header — above the Active Step card and the "ALL STEPS" list. The body keeps its scroll; the actions never leave the viewport.

- In `src/components/call-runner/FlowPanel.tsx`:
  - Lift the existing sticky action row (Back, Next, blocking-reason pill, Submit) from the bottom of the panel up to a new `<div>` rendered immediately after the header block and before the body `overflow-y-auto` container.
  - Keep the same buttons, handlers, hotkeys, `data-testid` values (`runner-next`, `runner-submit`), aria labels, and disabled states — pure relocation.
  - Remove the now-duplicated bottom row.
  - Keep the floating annotation toolbar (lasso / T / pencil / chat icons in the second screenshot) where it currently lives — it is unrelated.
- The `SubmissionPanel` (shown when all steps complete) stays inside the scroll body; the top action row already exposes Submit so nothing regresses.
- The header's "Up next →" hint stays directly under the progress rail so the action row reads as: progress → up next → actions → steps.

## 2. Draggable right-column cards

Agents want to arrange the right rail to match how they work. Make the three stacked cards in the right column reorderable by drag:

- Call Copilot (suggestions + Call Notes)
- Transfer Directory
- Resources

Scope intentionally excludes the three top-level columns (Guide / Flow / Copilot) and the left guide accordion — those stay fixed so the runner's spatial model is stable across agents and training material.

Implementation:

- New component `src/components/call-runner/DraggableStack.tsx`:
  - Accepts an ordered array of `{ id, node }` items and an `onOrderChange(ids)` callback.
  - Uses native HTML5 drag-and-drop (no new dependencies) with a small drag handle (`GripVertical` from `lucide-react`) in the top-right of each slot.
  - Handles `dragstart`, `dragover`, `drop`, `dragend`; computes insert-before vs insert-after from pointer Y midpoint; renders a 2px primary-colored insertion line between slots.
  - Keyboard a11y: handle is a `<button>` with `aria-grabbed`; `Space` picks up, `ArrowUp` / `ArrowDown` move, `Space` again drops, `Escape` cancels. Announces moves via an `aria-live="polite"` region.
  - Respects `prefers-reduced-motion` (no transform transitions when reduced).
- New hook `src/hooks/useRunnerCardOrder.ts`:
  - Persists order in `localStorage` under `fabric59:runner:rightStack:v1:<userId|anon>:<workspaceId>:<campaignId>`.
  - Validates stored ids against the current known set; drops unknown ids and appends new ones at the end so future cards (e.g. a 4th panel) surface automatically.
  - Returns `{ order, setOrder, reset }`.
- Wire into `src/pages/agent/LiveCallRunnerPage.tsx`:
  - Replace the `<div className="flex flex-col gap-3 …">` on lines 333–357 with `<DraggableStack>` using ids `copilot`, `transfer`, `resources`.
  - Add a tiny "Reset layout" link in the right column footer when order differs from default.
- Embed runner (`src/pages/embed/EmbedCampaignRunnerPage.tsx`): apply the same `DraggableStack` so the Five9 iframe experience matches; persistence keys include the embed mode so they do not collide.

## Tests

- `src/test/regressions/runnerActionBarPosition.test.tsx`: render `FlowPanel` with a long mock flow, assert the Submit button is reachable without scrolling the body container (button rendered before the scroll region in DOM order).
- `src/test/regressions/runnerCardReorder.test.tsx`: simulate dragstart → dragover → drop to move `resources` above `transfer`; assert order persisted to `localStorage` and that the next mount restores it. Cover keyboard reorder path and unknown-id pruning.
- All existing runner regression suites must stay green.

## Out of scope

- No changes to the session hook, copilot hook, submission pipeline, schema, RLS, generated types, `client.ts`, `.env`, or `supabase/config.toml`.
- No drag for the three main columns or the left guide sections.
- No new dependencies.

## Verification gates

- Submit visible in viewport at 1024 / 1200 / 1440 / 1920 widths with a 30-step flow without scrolling.
- Reordering persists across reload, per workspace+campaign, per user.
- Reduced-motion users see no transform animation; keyboard users can reorder without a mouse.
- Embed mode honors the same reorder behavior.
- All existing tests pass; two new suites added.
