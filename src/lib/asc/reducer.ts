/**
 * ASC reducer.
 *
 * Framework-free, no React imports, no I/O. The only mutator of AscDraft.
 *
 * Slice 4 adds:
 *   - Per-reason Interviewer proposals (`callerReasons.add`, `callerReason.*`)
 *     routed by `targetField` and gated by `reasonId` + snapshot compare.
 *   - Duplicate-reason guard: confirming a `callerReasons.add` proposal
 *     whose normalized label matches any existing reason is a no-op
 *     (proposal flips to `stale`), never silently creates a duplicate.
 *   - Advisory Gap-finder reducer arms (`APPLY_GAP_FINDER_RESULT`,
 *     `DISMISS_GAP_ITEM`). Gap-finder NEVER writes to `draft.input` or
 *     `draft.unresolved`; its items live under `meta.gapFinder` only.
 *
 * Slice 3 behaviour preserved:
 *   - APPLY_INTERVIEWER_TURN drops nextQuestion for already-confirmed
 *     fields (Steps 1/2 fields; per-reason targets are repeatable).
 *   - CONFIRM/REJECT_PROPOSED_FIELD operate via meta.interviewer only.
 *   - Manual UPDATE_BUSINESS / UPDATE_PURPOSE marks pending proposals stale.
 */
import type {
  AscAction,
  AscGapFinderStep,
  AscInterviewerStep,
} from "./actions";
import {
  ASC_TOTAL_STEPS,
  type AscBranchHint,
  type AscCallerReason,
  type AscDraft,
  type AscGapFinderMeta,
  type AscInterviewerMeta,
  type AscInterviewerProposal,
  type AscInterviewerTurn,
} from "./types";
import {
  normalizeReasonLabel,
  readPerReasonFieldValue,
  readTargetFieldValue,
  serializeFieldValue,
  snapshotCallerReasonsLabels,
  targetFieldKey,
  targetFieldSlot,
  type AscEscalationValue,
  type AscBranchHintValue,
  type AscInterviewerTargetField,
} from "./interviewerSchema";

function bumpUpdated(draft: AscDraft, now?: string): AscDraft {
  return {
    ...draft,
    meta: {
      ...draft.meta,
      updatedAt: now ?? new Date().toISOString(),
    },
  };
}

function emptyInterviewerMeta(): AscInterviewerMeta {
  return { lastTurnByStep: {}, confirmedFields: [] };
}

function getInterviewer(draft: AscDraft): AscInterviewerMeta {
  return draft.meta.interviewer ?? emptyInterviewerMeta();
}

function withInterviewer(
  draft: AscDraft,
  next: AscInterviewerMeta,
): AscDraft {
  return {
    ...draft,
    meta: { ...draft.meta, interviewer: next },
  };
}

function emptyGapFinderMeta(): AscGapFinderMeta {
  return { itemsByStep: {} };
}

function withGapFinder(draft: AscDraft, next: AscGapFinderMeta): AscDraft {
  return { ...draft, meta: { ...draft.meta, gapFinder: next } };
}

/**
 * Mark pending proposals matching `predicate` as stale across all steps.
 */
function markStaleWhere(
  meta: AscInterviewerMeta,
  predicate: (p: AscInterviewerProposal) => boolean,
): AscInterviewerMeta {
  const nextByStep: AscInterviewerMeta["lastTurnByStep"] = {};
  let changed = false;
  for (const [stepKey, turn] of Object.entries(meta.lastTurnByStep)) {
    if (!turn) continue;
    const step = Number(stepKey) as AscInterviewerStep;
    const nextProposals = turn.proposals.map((p) =>
      p.status === "pending" && predicate(p)
        ? { ...p, status: "stale" as const }
        : p,
    );
    if (nextProposals.some((p, i) => p !== turn.proposals[i])) changed = true;
    nextByStep[step] = { ...turn, proposals: nextProposals };
  }
  if (!changed) return meta;
  return { ...meta, lastTurnByStep: nextByStep };
}

function markStaleForFields(
  meta: AscInterviewerMeta,
  fields: AscInterviewerTargetField[],
): AscInterviewerMeta {
  if (fields.length === 0) return meta;
  const fset = new Set<string>(fields);
  return markStaleWhere(meta, (p) => fset.has(p.targetField));
}

function findProposal(
  meta: AscInterviewerMeta,
  step: AscInterviewerStep,
  proposalId: string,
): { turn: AscInterviewerTurn; proposal: AscInterviewerProposal } | null {
  const turn = meta.lastTurnByStep[step];
  if (!turn) return null;
  const proposal = turn.proposals.find((p) => p.id === proposalId);
  if (!proposal) return null;
  return { turn, proposal };
}

function replaceProposalStatus(
  meta: AscInterviewerMeta,
  step: AscInterviewerStep,
  proposalId: string,
  status: AscInterviewerProposal["status"],
): AscInterviewerMeta {
  const turn = meta.lastTurnByStep[step];
  if (!turn) return meta;
  const nextTurn: AscInterviewerTurn = {
    ...turn,
    proposals: turn.proposals.map((p) =>
      p.id === proposalId ? { ...p, status } : p,
    ),
  };
  return {
    ...meta,
    lastTurnByStep: { ...meta.lastTurnByStep, [step]: nextTurn },
  };
}

function applySimpleFieldProposal(
  draft: AscDraft,
  proposal: AscInterviewerProposal,
): AscDraft {
  const slot = targetFieldSlot(proposal.targetField);
  const key = targetFieldKey(proposal.targetField);
  if (slot === "business") {
    return {
      ...draft,
      input: {
        ...draft.input,
        business: {
          ...draft.input.business,
          [key]:
            key === "hours"
              ? {
                  ...draft.input.business.hours,
                  coverage: proposal.value as never,
                }
              : (proposal.value as never),
        },
      },
    };
  }
  return {
    ...draft,
    input: {
      ...draft.input,
      purpose: {
        ...draft.input.purpose,
        [key]: proposal.value as never,
      },
    },
  };
}

function makeReasonId(): string {
  const rand =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `cr-${Date.now().toString(36)}-${rand}`;
}

function makeBranchId(): string {
  const rand =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `bh-${Date.now().toString(36)}-${rand}`;
}

function replaceReason(
  draft: AscDraft,
  updated: AscCallerReason,
): AscDraft {
  return {
    ...draft,
    input: {
      ...draft.input,
      callerReasons: draft.input.callerReasons.map((r) =>
        r.id === updated.id ? updated : r,
      ),
    },
  };
}

function applyPerReasonField(
  reason: AscCallerReason,
  proposal: AscInterviewerProposal,
): AscCallerReason {
  switch (proposal.targetField) {
    case "callerReason.requiredCapture":
      return { ...reason, requiredCapture: proposal.value as string[] };
    case "callerReason.opener":
      return { ...reason, opener: proposal.value as string };
    case "callerReason.escalation": {
      const v = proposal.value as AscEscalationValue;
      return { ...reason, escalation: { when: v.when, toRole: v.toRole } };
    }
    case "callerReason.variants.afterHours":
      return {
        ...reason,
        variants: { ...(reason.variants ?? {}), afterHours: proposal.value as string },
      };
    case "callerReason.variants.voicemail":
      return {
        ...reason,
        variants: { ...(reason.variants ?? {}), voicemail: proposal.value as string },
      };
    case "callerReason.branching.add": {
      const v = proposal.value as AscBranchHintValue;
      const hint: AscBranchHint = {
        id: makeBranchId(),
        trigger: v.trigger,
        outcome: v.outcome,
        origin: "user_stated",
      };
      return {
        ...reason,
        branching: [...(reason.branching ?? []), hint],
      };
    }
    default:
      return reason;
  }
}

/** Determine which per-reason target fields a `UPDATE_CALLER_REASON` patch
 *  touched, so we can stale matching proposals. */
function touchedPerReasonFields(
  patch: Partial<AscCallerReason>,
): AscInterviewerTargetField[] {
  const out: AscInterviewerTargetField[] = [];
  if ("requiredCapture" in patch) out.push("callerReason.requiredCapture");
  if ("opener" in patch) out.push("callerReason.opener");
  if ("escalation" in patch) out.push("callerReason.escalation");
  if ("variants" in patch) {
    out.push("callerReason.variants.afterHours");
    out.push("callerReason.variants.voicemail");
  }
  // branching is append-only; manual edits don't invalidate "add" proposals.
  return out;
}

export function ascReducer(state: AscDraft, action: AscAction): AscDraft {
  switch (action.type) {
    case "INIT_DRAFT":
    case "RESET_DRAFT":
      return action.draft;

    case "SET_STEP": {
      const clamped = Math.min(
        Math.max(1, Math.floor(action.step)),
        ASC_TOTAL_STEPS,
      );
      if (clamped === state.step) return state;
      return bumpUpdated({ ...state, step: clamped });
    }

    case "UPDATE_BUSINESS": {
      const touched: AscInterviewerTargetField[] = Object.keys(action.patch)
        .map((k) => `business.${k}` as AscInterviewerTargetField);
      const next = bumpUpdated({
        ...state,
        input: {
          ...state.input,
          business: { ...state.input.business, ...action.patch },
        },
      });
      if (!next.meta.interviewer) return next;
      return withInterviewer(
        next,
        markStaleForFields(next.meta.interviewer, touched),
      );
    }

    case "UPDATE_PURPOSE": {
      const touched: AscInterviewerTargetField[] = Object.keys(action.patch)
        .map((k) => `purpose.${k}` as AscInterviewerTargetField);
      const next = bumpUpdated({
        ...state,
        input: {
          ...state.input,
          purpose: { ...state.input.purpose, ...action.patch },
        },
      });
      if (!next.meta.interviewer) return next;
      return withInterviewer(
        next,
        markStaleForFields(next.meta.interviewer, touched),
      );
    }

    case "ADD_CALLER_REASON": {
      const next = bumpUpdated({
        ...state,
        input: {
          ...state.input,
          callerReasons: [...state.input.callerReasons, action.reason],
        },
      });
      // Stale any pending `callerReasons.add` proposals whose normalized
      // label now matches the just-added reason.
      if (!next.meta.interviewer) return next;
      const newNorm = normalizeReasonLabel(action.reason.label);
      const staled = markStaleWhere(
        next.meta.interviewer,
        (p) =>
          p.targetField === "callerReasons.add" &&
          typeof p.value === "string" &&
          normalizeReasonLabel(p.value) === newNorm,
      );
      return withInterviewer(next, staled);
    }

    case "UPDATE_CALLER_REASON": {
      const next = bumpUpdated({
        ...state,
        input: {
          ...state.input,
          callerReasons: state.input.callerReasons.map((r) =>
            r.id === action.id ? { ...r, ...action.patch } : r,
          ),
        },
      });
      if (!next.meta.interviewer) return next;
      const touched = touchedPerReasonFields(action.patch);
      if (touched.length === 0) return next;
      const tset = new Set<string>(touched);
      const staled = markStaleWhere(
        next.meta.interviewer,
        (p) => p.reasonId === action.id && tset.has(p.targetField),
      );
      return withInterviewer(next, staled);
    }

    case "REMOVE_CALLER_REASON": {
      const next = bumpUpdated({
        ...state,
        input: {
          ...state.input,
          callerReasons: state.input.callerReasons.filter(
            (r) => r.id !== action.id,
          ),
        },
      });
      // Stale any per-reason proposals tied to the removed reason and drop
      // gap items that reference only this reason.
      let withMeta = next;
      if (next.meta.interviewer) {
        const staled = markStaleWhere(
          next.meta.interviewer,
          (p) => p.reasonId === action.id,
        );
        withMeta = withInterviewer(withMeta, staled);
      }
      if (next.meta.gapFinder) {
        const cleanedByStep: AscGapFinderMeta["itemsByStep"] = {};
        for (const [k, items] of Object.entries(
          next.meta.gapFinder.itemsByStep,
        )) {
          if (!items) continue;
          const step = Number(k) as AscGapFinderStep;
          cleanedByStep[step] = items.filter((g) => {
            if (!g.reasonIds || g.reasonIds.length === 0) return true;
            const remaining = g.reasonIds.filter((id) => id !== action.id);
            // drop items whose only referenced reasons are now removed.
            return remaining.length > 0;
          });
        }
        withMeta = withGapFinder(withMeta, {
          ...next.meta.gapFinder,
          itemsByStep: cleanedByStep,
        });
      }
      return withMeta;
    }

    case "SET_DESTINATION":
      return bumpUpdated({
        ...state,
        input: { ...state.input, destination: action.destination },
      });

    case "SET_LAUNCH":
      return bumpUpdated({
        ...state,
        input: { ...state.input, launch: action.launch },
      });

    case "MARK_STEP_STATUS":
      return bumpUpdated({
        ...state,
        stepStatus: { ...state.stepStatus, [action.step]: action.status },
      });

    case "TOUCH":
      return bumpUpdated(state, action.now);

    // ── Interviewer (Slices 3 + 4) ────────────────────────────────────────
    case "APPLY_INTERVIEWER_TURN": {
      const meta = getInterviewer(state);
      const confirmed = new Set(meta.confirmedFields);
      let turn = action.turn;
      // Suppress re-asks for simple confirmed fields (Steps 1/2). Per-reason
      // targets are repeatable and never recorded in confirmedFields.
      if (
        turn.questionTargetField &&
        confirmed.has(turn.questionTargetField)
      ) {
        turn = {
          ...turn,
          questionId: null,
          questionPrompt: null,
          questionTargetField: null,
          questionInputKind: null,
          questionOptions: undefined,
          questionReasonId: undefined,
        };
      }
      const nextMeta: AscInterviewerMeta = {
        ...meta,
        lastTurnByStep: { ...meta.lastTurnByStep, [action.step]: turn },
      };
      return bumpUpdated(withInterviewer(state, nextMeta));
    }

    case "CONFIRM_PROPOSED_FIELD": {
      const meta = getInterviewer(state);
      const found = findProposal(meta, action.step, action.proposalId);
      if (!found) return state;
      const { proposal } = found;
      if (proposal.status !== "pending") return state;

      const slot = targetFieldSlot(proposal.targetField);

      // ── Slice 4: callerReasons.add ─────────────────────────────────────
      if (slot === "callerReasons") {
        const newLabel = String(proposal.value ?? "").trim();
        if (!newLabel) {
          const stale = markStaleForFields(meta, [proposal.targetField]);
          return bumpUpdated(withInterviewer(state, stale));
        }
        const normalizedNew = normalizeReasonLabel(newLabel);
        // Duplicate guard — always run, regardless of snapshot. Even if the
        // snapshot matches, a duplicate must not be silently created.
        const isDuplicate = state.input.callerReasons.some(
          (r) => normalizeReasonLabel(r.label) === normalizedNew,
        );
        // Snapshot-divergence check as a defensive secondary signal.
        const currentSnapshot = snapshotCallerReasonsLabels(state.input);
        const snapshotDiverged = currentSnapshot !== proposal.fieldSnapshot;
        if (isDuplicate || snapshotDiverged) {
          const stale = markStaleForFields(meta, [proposal.targetField]);
          return bumpUpdated(withInterviewer(state, stale));
        }
        const reason: AscCallerReason = {
          id: makeReasonId(),
          label: newLabel,
          requiredCapture: [],
        };
        const withReason = {
          ...state,
          input: {
            ...state.input,
            callerReasons: [...state.input.callerReasons, reason],
          },
        };
        const nextMeta = replaceProposalStatus(
          meta,
          action.step,
          proposal.id,
          "confirmed",
        );
        return bumpUpdated(withInterviewer(withReason, nextMeta));
      }

      // ── Slice 4: per-reason callerReason.* ─────────────────────────────
      if (slot === "callerReason") {
        if (!proposal.reasonId) {
          const stale = markStaleForFields(meta, [proposal.targetField]);
          return bumpUpdated(withInterviewer(state, stale));
        }
        const reason = state.input.callerReasons.find(
          (r) => r.id === proposal.reasonId,
        );
        if (!reason) {
          const stale = markStaleWhere(
            meta,
            (p) => p.id === proposal.id,
          );
          return bumpUpdated(withInterviewer(state, stale));
        }
        // Append-only branching skips the snapshot check.
        if (proposal.targetField !== "callerReason.branching.add") {
          const currentSerialized = serializeFieldValue(
            readPerReasonFieldValue(reason, proposal.targetField),
          );
          if (currentSerialized !== proposal.fieldSnapshot) {
            const stale = markStaleWhere(
              meta,
              (p) => p.id === proposal.id,
            );
            return bumpUpdated(withInterviewer(state, stale));
          }
        }
        const updatedReason = applyPerReasonField(reason, proposal);
        const withReason = replaceReason(state, updatedReason);
        const nextMeta = replaceProposalStatus(
          meta,
          action.step,
          proposal.id,
          "confirmed",
        );
        return bumpUpdated(withInterviewer(withReason, nextMeta));
      }

      // ── Slices 1/2: simple business/purpose targets ────────────────────
      const currentSerialized = serializeFieldValue(
        readTargetFieldValue(state.input, proposal.targetField),
      );
      if (currentSerialized !== proposal.fieldSnapshot) {
        const stale = markStaleForFields(meta, [proposal.targetField]);
        return bumpUpdated(withInterviewer(state, stale));
      }
      const withValue = applySimpleFieldProposal(state, proposal);
      const turn = meta.lastTurnByStep[action.step]!;
      const nextTurn: AscInterviewerTurn = {
        ...turn,
        proposals: turn.proposals.map((p) =>
          p.id === proposal.id ? { ...p, status: "confirmed" as const } : p,
        ),
      };
      const nextConfirmed = meta.confirmedFields.includes(proposal.targetField)
        ? meta.confirmedFields
        : [...meta.confirmedFields, proposal.targetField];
      const nextMeta: AscInterviewerMeta = {
        ...meta,
        lastTurnByStep: { ...meta.lastTurnByStep, [action.step]: nextTurn },
        confirmedFields: nextConfirmed,
      };
      return bumpUpdated(withInterviewer(withValue, nextMeta));
    }

    case "REJECT_PROPOSED_FIELD": {
      const meta = getInterviewer(state);
      const found = findProposal(meta, action.step, action.proposalId);
      if (!found) return state;
      const nextMeta = replaceProposalStatus(
        meta,
        action.step,
        action.proposalId,
        "rejected",
      );
      return bumpUpdated(withInterviewer(state, nextMeta));
    }

    case "CLEAR_INTERVIEWER_STEP": {
      const meta = getInterviewer(state);
      if (!meta.lastTurnByStep[action.step]) return state;
      const { [action.step]: _dropped, ...rest } = meta.lastTurnByStep;
      void _dropped;
      const nextMeta: AscInterviewerMeta = { ...meta, lastTurnByStep: rest };
      return bumpUpdated(withInterviewer(state, nextMeta));
    }

    // ── Slice 4: Gap-finder (advisory only) ────────────────────────────────
    case "APPLY_GAP_FINDER_RESULT": {
      const existing = state.meta.gapFinder ?? emptyGapFinderMeta();
      // Filter to items referencing existing reasons (if reasonIds present).
      const existingReasonIds = new Set(
        state.input.callerReasons.map((r) => r.id),
      );
      const cleaned = action.items
        .map((g) => {
          if (!g.reasonIds || g.reasonIds.length === 0) return g;
          const known = g.reasonIds.filter((id) => existingReasonIds.has(id));
          if (known.length === 0) return null;
          return { ...g, reasonIds: known };
        })
        .filter((g): g is typeof action.items[number] => g !== null);
      const nextMeta: AscGapFinderMeta = {
        lastRunAt: action.now,
        itemsByStep: {
          ...existing.itemsByStep,
          [action.step]: cleaned,
        },
      };
      return bumpUpdated(withGapFinder(state, nextMeta));
    }

    case "DISMISS_GAP_ITEM": {
      const existing = state.meta.gapFinder;
      if (!existing) return state;
      const items = existing.itemsByStep[action.step];
      if (!items) return state;
      const next = items.map((g) =>
        g.id === action.itemId ? { ...g, dismissed: true } : g,
      );
      const nextMeta: AscGapFinderMeta = {
        ...existing,
        itemsByStep: { ...existing.itemsByStep, [action.step]: next },
      };
      return bumpUpdated(withGapFinder(state, nextMeta));
    }

    default: {
      const _exhaustive: never = action;
      void _exhaustive;
      return state;
    }
  }
}

// ── Later-slice stubs ──────────────────────────────────────────────────────

export function ascGeneratedToRunnerPayload(): never {
  throw new Error(
    "[asc] ascGeneratedToRunnerPayload is not implemented yet.",
  );
}

export function forkToCanonical(): never {
  throw new Error("[asc] forkToCanonical is not implemented yet.");
}
