/**
 * ASC Slice 8 — readiness evaluator.
 *
 * Pure, deterministic, no I/O. Classifies issues as blockers (must resolve
 * before handoff) or warnings (visible but non-blocking).
 *
 * Source hierarchy per Slice 8 scope guards:
 *   1) Confirmed ASC inputs (`draft.input.*`) are the primary sufficiency
 *      checks. We use them even if a generated draft exists.
 *   2) `draft.generated.*` is used for structural checks (flow shape,
 *      reason→branch coverage, destination requirement satisfaction) and
 *      review-derived warnings (todos, low confidence, missing
 *      notifications).
 *
 * The generated draft itself remains a hard prereq: `no_generated_draft`
 * and `generation_stale` are always blockers.
 *
 * Issue ordering is stable across runs so React keys and tests stay
 * deterministic.
 */
import type { AscDraft } from "./types";

export type AscReadinessCategory =
  | "generation"
  | "callerReasons"
  | "outcomes"
  | "destination"
  | "structure"
  | "notifications"
  | "copy"
  | "advisory";

export type AscReadinessSeverity = "blocker" | "warning";

export interface AscReadinessIssue {
  id: string;
  severity: AscReadinessSeverity;
  category: AscReadinessCategory;
  message: string;
  /** Optional source step for edit-at-source nav (3–9). */
  jumpToStep?: number;
}

export interface AscReadinessReport {
  blockers: AscReadinessIssue[];
  warnings: AscReadinessIssue[];
  isSafeToFork: boolean;
}

const MAX_TODO_WARNINGS = 10;

function asArray<T>(x: T[] | null | undefined): T[] {
  return Array.isArray(x) ? x : [];
}

export function computeReadiness(draft: AscDraft): AscReadinessReport {
  const blockers: AscReadinessIssue[] = [];
  const warnings: AscReadinessIssue[] = [];

  const input = draft.input;
  const generated = draft.generated;
  const genMeta = draft.meta.generation;

  // ── Generation prereqs (hard) ─────────────────────────────────────────
  if (!generated) {
    blockers.push({
      id: "no_generated_draft",
      severity: "blocker",
      category: "generation",
      message:
        "No draft has been generated yet. Compile a draft in Step 8 before handing off.",
      jumpToStep: 8,
    });
  } else if (genMeta?.stale === true) {
    blockers.push({
      id: "generation_stale",
      severity: "blocker",
      category: "generation",
      message:
        "Inputs changed since this draft was generated. Regenerate in Step 8 before handing off.",
      jumpToStep: 8,
    });
  }

  // ── Confirmed-input sufficiency (primary) ─────────────────────────────
  const reasons = asArray(input.callerReasons);
  if (reasons.length === 0) {
    blockers.push({
      id: "no_caller_reasons",
      severity: "blocker",
      category: "callerReasons",
      message: "Add at least one caller reason in Step 3.",
      jumpToStep: 3,
    });
  }

  const outcomeEdits = asArray(input.outcomesDraftEdits);
  if (outcomeEdits.length === 0) {
    blockers.push({
      id: "no_confirmed_outcomes",
      severity: "blocker",
      category: "outcomes",
      message: "Confirm at least one outcome in Step 5.",
      jumpToStep: 5,
    });
  }

  const destInput = input.destination;
  if (!destInput?.kind) {
    blockers.push({
      id: "missing_destination_kind",
      severity: "blocker",
      category: "destination",
      message: "Choose a destination kind in Step 7.",
      jumpToStep: 7,
    });
  } else if (
    destInput.kind === "external_url" &&
    !(destInput.externalUrl && destInput.externalUrl.trim().length > 0)
  ) {
    blockers.push({
      id: "destination_requirement_missing",
      severity: "blocker",
      category: "destination",
      message: "External-URL destination needs a URL (Step 7).",
      jumpToStep: 7,
    });
  } else if (
    destInput.kind === "deep_link" &&
    !(destInput.deepLinkTemplate && destInput.deepLinkTemplate.trim().length > 0)
  ) {
    blockers.push({
      id: "destination_requirement_missing",
      severity: "blocker",
      category: "destination",
      message: "Deep-link destination needs a link template (Step 7).",
      jumpToStep: 7,
    });
  }

  // ── Structural checks against generated draft ─────────────────────────
  if (generated) {
    const nodes = asArray(generated.flow?.nodes);
    if (nodes.length === 0) {
      blockers.push({
        id: "flow_empty",
        severity: "blocker",
        category: "structure",
        message:
          "Generated flow has no nodes. Regenerate the draft in Step 8.",
        jumpToStep: 8,
      });
    }

    const reasonToBranch = generated.reasonToBranch ?? {};
    const unmapped = reasons.filter((r) => r && !reasonToBranch[r.id]);
    if (reasons.length > 0 && unmapped.length > 0) {
      blockers.push({
        id: "reasons_unmapped",
        severity: "blocker",
        category: "structure",
        message: `Some caller reasons (${unmapped.length}) are not yet mapped to a branch. Regenerate or edit reasons.`,
        jumpToStep: 8,
      });
    }

    // ── Warnings derived from generated draft ──
    const todos = asArray(generated.todos);
    todos.slice(0, MAX_TODO_WARNINGS).forEach((t, i) => {
      if (!t) return;
      warnings.push({
        id: `todo_${t.area}_${t.id || i}`,
        severity: "warning",
        category: "copy",
        message: `TODO (${t.area}): ${t.message}`,
        jumpToStep: AREA_TO_STEP[t.area],
      });
    });
    if (todos.length > MAX_TODO_WARNINGS) {
      warnings.push({
        id: "todos_overflow",
        severity: "warning",
        category: "copy",
        message: `+${todos.length - MAX_TODO_WARNINGS} more TODOs from the generated draft.`,
        jumpToStep: 9,
      });
    }

    const conf = generated.confidenceByArea ?? {};
    const confKeys = Object.keys(conf).sort();
    for (const area of confKeys) {
      const c = conf[area as keyof typeof conf];
      if (c?.level === "low") {
        warnings.push({
          id: `low_confidence_${area}`,
          severity: "warning",
          category: "advisory",
          message: c.reason
            ? `Low confidence in ${area}: ${c.reason}`
            : `Low confidence in ${area}.`,
          jumpToStep: AREA_TO_STEP[area],
        });
      }
    }

    const outcomes = asArray(generated.outcomes);
    for (const o of outcomes) {
      if (!o || !o.outcomeRef) continue;
      if (asArray(o.notificationRefs).length === 0) {
        warnings.push({
          id: `outcome_no_notifications_${o.outcomeRef}`,
          severity: "warning",
          category: "notifications",
          message: `Outcome "${o.outcomeRef}" has no notifications wired.`,
          jumpToStep: 6,
        });
      }
    }
  }

  // ── Advisory leftovers (always evaluated) ─────────────────────────────
  const gapItems = [
    ...(draft.meta.gapFinder?.itemsByStep?.[3] ?? []),
    ...(draft.meta.gapFinder?.itemsByStep?.[4] ?? []),
  ].filter((g) => g && !g.dismissed);
  if (gapItems.length > 0) {
    warnings.push({
      id: "gap_finder_open",
      severity: "warning",
      category: "advisory",
      message: `${gapItems.length} open gap-finder suggestion${gapItems.length === 1 ? "" : "s"}. Review Steps 3–4.`,
      jumpToStep: 3,
    });
  }

  const laMeta = draft.meta.logicArchitect;
  if (laMeta?.proposalsByStep) {
    let pending = 0;
    for (const arr of Object.values(laMeta.proposalsByStep)) {
      for (const p of arr ?? []) {
        if (p?.status === "pending") pending += 1;
      }
    }
    if (pending > 0) {
      warnings.push({
        id: "logic_architect_pending",
        severity: "warning",
        category: "advisory",
        message: `${pending} Logic Architect proposal${pending === 1 ? "" : "s"} still pending. Review Steps 5–7.`,
        jumpToStep: 5,
      });
    }
  }

  return {
    blockers,
    warnings,
    isSafeToFork: blockers.length === 0,
  };
}

const AREA_TO_STEP: Record<string, number> = {
  flow: 4,
  copy: 4,
  outcomes: 5,
  notifications: 6,
  destination: 7,
};
