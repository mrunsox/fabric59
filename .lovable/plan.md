# Phase 10 — Run It In The Wild (Stability & Learning)

This phase is intentionally tiny in code terms. We're setting up the observation/learning scaffolding now, then logging fixes as they arise during the live window. No new features, no schema, no new surfaces.

## 1. Scope at kickoff (this implementation pass)

Only three files touched up front:

1. **`docs/live-call-runner-ux.md`** — add three new sections:
   - **Phase 10 Questions** — the exact questions from the brief (assist usage %, replay coverage, QA volume, performance vs outcomes view ratio, coaching open rate), each paired with the existing telemetry/SQL query that answers it. Reuse the Phase 9 query block as the source of truth; reference event names already emitted (`calls.assist.suggestion_used`, `calls.replay.opened`, `calls.qa.review_updated`, `calls.performance.viewed`, `calls.campaign_outcomes.viewed`, `calls.coaching.item_opened`).
   - **Phase 10 Fixes** — empty table with columns `Date | Change | Why (signal) | Verification`. Fixes get appended here as they happen.
   - **Phase 10 Outcome (TBD)** — placeholder for the end-of-window narrative answering the five success-criteria questions.

2. **`OUTLINE.md`** — mark Phases 5–9 as **In use**, Phase 10 as **Run & Learn (observation window open)**.

3. **`.lovable/plan.md`** — same status update, kept in sync.

No source/test files are edited in this pass. The regression suite stays as-is (5 pre-existing failures).

## 2. During the observation window (separate later turns)

Each bug or friction fix the user reports gets handled as its own small change:

- Edit only the affected file(s).
- Add or extend a regression test covering the bug.
- Append a row to the **Phase 10 Fixes** table with what / why / verification.

Guardrails enforced on every such turn:
- No new routes, tabs, dashboards, tables, or columns.
- No telephony, auto-scoring, or new AI behavior.
- Only: bug fixes, perf, copy/label/empty/loading/error clarity, tiny layout corrections.

## 3. Stop-gate (end of window)

When the user signals the window is closed, fill in **Phase 10 Outcome** in `docs/live-call-runner-ux.md` with:
- key metric snapshots (from the Phase 10 Questions queries),
- the accumulated fix list,
- answers to the five success-criteria questions,
- recommendation: freeze Calls OS, or one tightly scoped follow-up.

Then stop and wait for approval before any Phase 11 proposal.

## Technical notes

- All Phase 10 telemetry already exists from Phase 9 — no new event names, no new emitters.
- The Questions section will link to the existing "Phase 9 internal metrics" SQL block rather than duplicate it; only the question → query mapping is new.
- No `plan.md` schema change — just a status line edit at the top of the phase list.

## Out of scope (explicit)

- New product surfaces, dashboards, or charts for the metrics (queries stay SQL-only, run by operator).
- Persisting metric snapshots to a table.
- Any Phase 11 work or scoping.
