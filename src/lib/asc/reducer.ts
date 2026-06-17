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
  type AscLogicArchitectMeta,
  type AscLogicArchitectProposal,
  type AscNotificationEdit,
  type AscOutcomeEdit,
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
import {
  laTargetStep,
  normalizeOutcomeLabel,
  normalizeSlug,
  notificationKey,
  snapshotForLaProposal,
  type AscLaNotificationValue,
  type AscLaOutcomeValue,
  type AscLaStep,
} from "./logicArchitectSchema";
import { computeInputFingerprint } from "./step8CompileSchema";
import { translateAscDraftToIntake, type AscForkResult } from "./forkTranslator";

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

// ── Slice 5: Logic Architect meta helpers ───────────────────────────────
function emptyLaMeta(): AscLogicArchitectMeta {
  return { lastRunAt: {}, proposalsByStep: {}, advisoriesByStep: {} };
}

function getLa(draft: AscDraft): AscLogicArchitectMeta {
  return draft.meta.logicArchitect ?? emptyLaMeta();
}

function withLa(draft: AscDraft, next: AscLogicArchitectMeta): AscDraft {
  return { ...draft, meta: { ...draft.meta, logicArchitect: next } };
}

function mapLaProposals(
  meta: AscLogicArchitectMeta,
  step: AscLaStep,
  fn: (p: AscLogicArchitectProposal) => AscLogicArchitectProposal,
): AscLogicArchitectMeta {
  const cur = meta.proposalsByStep[step];
  if (!cur) return meta;
  return {
    ...meta,
    proposalsByStep: { ...meta.proposalsByStep, [step]: cur.map(fn) },
  };
}

function staleLaForCrossStepChange(
  meta: AscLogicArchitectMeta,
): AscLogicArchitectMeta {
  // Step 3/4 (callerReasons) and Step 2 (purpose) changes invalidate Step 5
  // and Step 6 proposals (outcomes + notifications depend on them). Step 7
  // destination/slug doesn't structurally depend on callerReasons, so leave it.
  const stepsToStale: AscLaStep[] = [5, 6];
  let next = meta;
  for (const step of stepsToStale) {
    next = mapLaProposals(next, step, (p) =>
      p.status === "pending"
        ? { ...p, status: "stale", staleReason: "cross_step_input_changed" }
        : p,
    );
  }
  return next;
}

function makeLaProposalId(): string {
  const rand =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `la-${Date.now().toString(36)}-${rand}`;
}

function makeEditId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
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

function withGeneration(
  draft: AscDraft,
  patch: Partial<NonNullable<AscDraft["meta"]["generation"]>> & { stale?: boolean },
): AscDraft {
  const cur = draft.meta.generation ?? {
    status: "idle" as const,
    stale: !draft.generated,
    ...(draft.generated ? {} : { staleReason: "never_generated" as const }),
  };
  return {
    ...draft,
    meta: { ...draft.meta, generation: { ...cur, ...patch } },
  };
}

function ascReducerInner(state: AscDraft, action: AscAction): AscDraft {
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
      let next = bumpUpdated({
        ...state,
        input: {
          ...state.input,
          purpose: { ...state.input.purpose, ...action.patch },
        },
      });
      if (next.meta.interviewer) {
        next = withInterviewer(
          next,
          markStaleForFields(next.meta.interviewer, touched),
        );
      }
      // Cross-step: purpose changes invalidate Step 5/6 LA proposals.
      if (next.meta.logicArchitect) {
        next = withLa(next, staleLaForCrossStepChange(next.meta.logicArchitect));
      }
      return next;
    }

    case "ADD_CALLER_REASON": {
      let next = bumpUpdated({
        ...state,
        input: {
          ...state.input,
          callerReasons: [...state.input.callerReasons, action.reason],
        },
      });
      // Stale any pending `callerReasons.add` proposals whose normalized
      // label now matches the just-added reason.
      if (next.meta.interviewer) {
        const newNorm = normalizeReasonLabel(action.reason.label);
        const staled = markStaleWhere(
          next.meta.interviewer,
          (p) =>
            p.targetField === "callerReasons.add" &&
            typeof p.value === "string" &&
            normalizeReasonLabel(p.value) === newNorm,
        );
        next = withInterviewer(next, staled);
      }
      // Cross-step: caller-reason changes invalidate Step 5/6 LA proposals.
      if (next.meta.logicArchitect) {
        next = withLa(next, staleLaForCrossStepChange(next.meta.logicArchitect));
      }
      return next;
    }

    case "UPDATE_CALLER_REASON": {
      let next = bumpUpdated({
        ...state,
        input: {
          ...state.input,
          callerReasons: state.input.callerReasons.map((r) =>
            r.id === action.id ? { ...r, ...action.patch } : r,
          ),
        },
      });
      if (next.meta.interviewer) {
        const touched = touchedPerReasonFields(action.patch);
        if (touched.length > 0) {
          const tset = new Set<string>(touched);
          const staled = markStaleWhere(
            next.meta.interviewer,
            (p) => p.reasonId === action.id && tset.has(p.targetField),
          );
          next = withInterviewer(next, staled);
        }
      }
      if (next.meta.logicArchitect) {
        next = withLa(next, staleLaForCrossStepChange(next.meta.logicArchitect));
      }
      return next;
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
      if (withMeta.meta.logicArchitect) {
        withMeta = withLa(
          withMeta,
          staleLaForCrossStepChange(withMeta.meta.logicArchitect),
        );
      }
      return withMeta;
    }

    case "SET_DESTINATION": {
      let next = bumpUpdated({
        ...state,
        input: { ...state.input, destination: action.destination },
      });
      // Stale any pending destination LA proposals whose snapshot diverges.
      if (next.meta.logicArchitect) {
        const cur = next.meta.logicArchitect;
        const updated = mapLaProposals(cur, 7, (p) => {
          if (p.status !== "pending") return p;
          if (!p.targetField.startsWith("destination.")) return p;
          const live = snapshotForLaProposal(next.input, p.targetField);
          if (live === p.fieldSnapshot) return p;
          return { ...p, status: "stale", staleReason: "snapshot_diverged" };
        });
        next = withLa(next, updated);
      }
      return next;
    }

    case "SET_LAUNCH": {
      let next = bumpUpdated({
        ...state,
        input: { ...state.input, launch: action.launch },
      });
      if (next.meta.logicArchitect) {
        const updated = mapLaProposals(next.meta.logicArchitect, 7, (p) => {
          if (p.status !== "pending") return p;
          if (p.targetField !== "launch.slugCandidates") return p;
          const live = snapshotForLaProposal(next.input, p.targetField);
          if (live === p.fieldSnapshot) return p;
          return { ...p, status: "stale", staleReason: "snapshot_diverged" };
        });
        next = withLa(next, updated);
      }
      return next;
    }

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

    // ── Slice 5: outcome/notification manual editors ──────────────────────
    case "ADD_OUTCOME_EDIT": {
      const next = bumpUpdated({
        ...state,
        input: {
          ...state.input,
          outcomesDraftEdits: [
            ...(state.input.outcomesDraftEdits ?? []),
            action.outcome,
          ],
        },
      });
      if (next.meta.logicArchitect) {
        const newNorm = normalizeOutcomeLabel(action.outcome.label);
        const updated = mapLaProposals(next.meta.logicArchitect, 5, (p) => {
          if (p.status !== "pending") return p;
          if (p.targetField !== "outcomes.add") return p;
          const v = p.value as AscLaOutcomeValue;
          if (normalizeOutcomeLabel(v.label) === newNorm) {
            return { ...p, status: "stale", staleReason: "snapshot_diverged" };
          }
          return p;
        });
        return withLa(next, updated);
      }
      return next;
    }

    case "UPDATE_OUTCOME_EDIT": {
      return bumpUpdated({
        ...state,
        input: {
          ...state.input,
          outcomesDraftEdits: (state.input.outcomesDraftEdits ?? []).map((o) =>
            o.id === action.id ? { ...o, ...action.patch } : o,
          ),
        },
      });
    }

    case "REMOVE_OUTCOME_EDIT": {
      return bumpUpdated({
        ...state,
        input: {
          ...state.input,
          outcomesDraftEdits: (state.input.outcomesDraftEdits ?? []).filter(
            (o) => o.id !== action.id,
          ),
        },
      });
    }

    case "ADD_NOTIFICATION_EDIT": {
      const next = bumpUpdated({
        ...state,
        input: {
          ...state.input,
          notificationsDraftEdits: [
            ...(state.input.notificationsDraftEdits ?? []),
            action.notification,
          ],
        },
      });
      if (next.meta.logicArchitect) {
        const newKey = [
          normalizeOutcomeLabel(action.notification.trigger ?? ""),
          (action.notification.channel ?? "").trim().toLowerCase(),
        ].join("|");
        const updated = mapLaProposals(next.meta.logicArchitect, 6, (p) => {
          if (p.status !== "pending") return p;
          if (p.targetField !== "notifications.add") return p;
          const v = p.value as AscLaNotificationValue;
          const k = [
            normalizeOutcomeLabel(v.outcomeRef),
            v.channelRef.trim().toLowerCase(),
          ].join("|");
          if (k === newKey) {
            return { ...p, status: "stale", staleReason: "snapshot_diverged" };
          }
          return p;
        });
        return withLa(next, updated);
      }
      return next;
    }

    case "UPDATE_NOTIFICATION_EDIT": {
      return bumpUpdated({
        ...state,
        input: {
          ...state.input,
          notificationsDraftEdits: (state.input.notificationsDraftEdits ?? []).map(
            (n) => (n.id === action.id ? { ...n, ...action.patch } : n),
          ),
        },
      });
    }

    case "REMOVE_NOTIFICATION_EDIT": {
      return bumpUpdated({
        ...state,
        input: {
          ...state.input,
          notificationsDraftEdits: (state.input.notificationsDraftEdits ?? []).filter(
            (n) => n.id !== action.id,
          ),
        },
      });
    }

    // ── Slice 5: Logic Architect (proposals only) ─────────────────────────
    case "APPLY_LOGIC_ARCHITECT_RESULT": {
      const meta = getLa(state);
      const nextMeta: AscLogicArchitectMeta = {
        ...meta,
        lastRunAt: { ...meta.lastRunAt, [action.step]: action.now },
        proposalsByStep: {
          ...meta.proposalsByStep,
          [action.step]: action.proposals,
        },
        advisoriesByStep: {
          ...meta.advisoriesByStep,
          [action.step]: action.advisories,
        },
      };
      return bumpUpdated(withLa(state, nextMeta));
    }

    case "CONFIRM_LOGIC_ARCHITECT_PROPOSAL": {
      const meta = getLa(state);
      const list = meta.proposalsByStep[action.step] ?? [];
      const proposal = list.find((p) => p.id === action.proposalId);
      if (!proposal || proposal.status !== "pending") return state;

      // Verify the step inferred from targetField matches.
      if (laTargetStep(proposal.targetField) !== action.step) return state;

      // Snapshot guard (manual-wins-over-stale). Append-only outcome/notification
      // proposals also re-check the live snapshot.
      const liveSnapshot = snapshotForLaProposal(state.input, proposal.targetField);
      if (liveSnapshot !== proposal.fieldSnapshot) {
        const nextMeta = mapLaProposals(meta, action.step, (p) =>
          p.id === proposal.id
            ? { ...p, status: "stale", staleReason: "snapshot_diverged" }
            : p,
        );
        return bumpUpdated(withLa(state, nextMeta));
      }

      switch (proposal.targetField) {
        case "outcomes.add": {
          const v = proposal.value as AscLaOutcomeValue;
          const norm = normalizeOutcomeLabel(v.label);
          const existing = state.input.outcomesDraftEdits ?? [];
          const isDup = existing.some(
            (o) => normalizeOutcomeLabel(o.label) === norm,
          );
          let nextState = state;
          if (!isDup) {
            // `kind` and `note` are proposal-local; we persist only label + note
            // (note carries the proposal-local `kind` hint as plain text so it
            // doesn't leak into a canonical taxonomy).
            const note = [v.kind, v.note].filter(Boolean).join(" — ") || undefined;
            const outcome: AscOutcomeEdit = {
              id: makeEditId("oc"),
              label: v.label.trim(),
              note,
            };
            nextState = {
              ...state,
              input: {
                ...state.input,
                outcomesDraftEdits: [...existing, outcome],
              },
            };
          }
          const nextMeta = mapLaProposals(meta, action.step, (p) =>
            p.id === proposal.id ? { ...p, status: "confirmed" } : p,
          );
          return bumpUpdated(withLa(nextState, nextMeta));
        }

        case "notifications.add": {
          const v = proposal.value as AscLaNotificationValue;
          const key = notificationKey(v);
          const existing = state.input.notificationsDraftEdits ?? [];
          const isDup = existing.some(
            (n) =>
              [
                normalizeOutcomeLabel(n.trigger ?? ""),
                (n.channel ?? "").trim().toLowerCase(),
                "",
              ].join("|") === key,
          );
          let nextState = state;
          if (!isDup) {
            // Flat persistence bridge: trigger=outcomeRef, channel=channelRef,
            // note=audienceRef + urgency + note (the UI separately renders
            // audience/urgency from the proposal preview while it's pending).
            const noteParts: string[] = [];
            if (v.audienceRef) noteParts.push(`audience: ${v.audienceRef}`);
            noteParts.push(`urgency: ${v.urgency}`);
            if (v.note) noteParts.push(v.note);
            const notification: AscNotificationEdit = {
              id: makeEditId("nt"),
              trigger: v.outcomeRef,
              channel: v.channelRef,
              note: noteParts.join(" · "),
            };
            nextState = {
              ...state,
              input: {
                ...state.input,
                notificationsDraftEdits: [...existing, notification],
              },
            };
          }
          const nextMeta = mapLaProposals(meta, action.step, (p) =>
            p.id === proposal.id ? { ...p, status: "confirmed" } : p,
          );
          return bumpUpdated(withLa(nextState, nextMeta));
        }

        case "destination.kind": {
          const nextState = {
            ...state,
            input: {
              ...state.input,
              destination: {
                ...(state.input.destination ?? { kind: "internal_runner" as const }),
                kind: proposal.value as AscOutcomeEdit extends never
                  ? never
                  : "internal_runner" | "external_url" | "deep_link",
              },
            },
          };
          const nextMeta = mapLaProposals(meta, action.step, (p) =>
            p.id === proposal.id ? { ...p, status: "confirmed" } : p,
          );
          return bumpUpdated(withLa(nextState, nextMeta));
        }

        case "destination.externalUrl": {
          const nextState = {
            ...state,
            input: {
              ...state.input,
              destination: {
                ...(state.input.destination ?? { kind: "external_url" as const }),
                kind: state.input.destination?.kind ?? "external_url",
                externalUrl: proposal.value as string,
              },
            },
          };
          const nextMeta = mapLaProposals(meta, action.step, (p) =>
            p.id === proposal.id ? { ...p, status: "confirmed" } : p,
          );
          return bumpUpdated(withLa(nextState, nextMeta));
        }

        case "destination.deepLinkTemplate": {
          const nextState = {
            ...state,
            input: {
              ...state.input,
              destination: {
                ...(state.input.destination ?? { kind: "deep_link" as const }),
                kind: state.input.destination?.kind ?? "deep_link",
                deepLinkTemplate: proposal.value as string,
              },
            },
          };
          const nextMeta = mapLaProposals(meta, action.step, (p) =>
            p.id === proposal.id ? { ...p, status: "confirmed" } : p,
          );
          return bumpUpdated(withLa(nextState, nextMeta));
        }

        case "destination.openMode": {
          const nextState = {
            ...state,
            input: {
              ...state.input,
              destination: {
                ...(state.input.destination ?? { kind: "internal_runner" as const }),
                kind: state.input.destination?.kind ?? "internal_runner",
                openMode: proposal.value as
                  | "same_tab"
                  | "new_tab"
                  | "side_panel",
              },
            },
          };
          const nextMeta = mapLaProposals(meta, action.step, (p) =>
            p.id === proposal.id ? { ...p, status: "confirmed" } : p,
          );
          return bumpUpdated(withLa(nextState, nextMeta));
        }

        case "launch.slugCandidates": {
          // Slug candidates: user must pick a slug and provide uniqueness.
          const chosen = action.chosenSlug ? normalizeSlug(action.chosenSlug) : "";
          if (!chosen || action.slugIsUnique !== true) {
            // Don't write. Don't stale either — let user re-pick.
            return state;
          }
          const candidates = proposal.value as string[];
          const allowed = candidates.map(normalizeSlug);
          if (!allowed.includes(chosen)) return state;
          const nextState = {
            ...state,
            input: {
              ...state.input,
              launch: {
                ...(state.input.launch ?? {}),
                slug: chosen,
                editableUntilPublish: true,
              },
            },
          };
          const nextMeta = mapLaProposals(meta, action.step, (p) =>
            p.id === proposal.id ? { ...p, status: "confirmed" } : p,
          );
          return bumpUpdated(withLa(nextState, nextMeta));
        }

        default:
          return state;
      }
    }

    case "REJECT_LOGIC_ARCHITECT_PROPOSAL": {
      const meta = getLa(state);
      const list = meta.proposalsByStep[action.step] ?? [];
      if (!list.find((p) => p.id === action.proposalId)) return state;
      const nextMeta = mapLaProposals(meta, action.step, (p) =>
        p.id === action.proposalId ? { ...p, status: "rejected" } : p,
      );
      return bumpUpdated(withLa(state, nextMeta));
    }

    case "EDIT_LOGIC_ARCHITECT_PROPOSAL": {
      const meta = getLa(state);
      const nextMeta = mapLaProposals(meta, action.step, (p) =>
        p.id === action.proposalId && p.status === "pending"
          ? { ...p, value: action.nextValue }
          : p,
      );
      return bumpUpdated(withLa(state, nextMeta));
    }

    case "CLEAR_LOGIC_ARCHITECT_STEP": {
      const meta = getLa(state);
      const nextProposals = { ...meta.proposalsByStep };
      delete nextProposals[action.step];
      const nextAdvisories = { ...meta.advisoriesByStep };
      delete nextAdvisories[action.step];
      const nextLastRun = { ...meta.lastRunAt };
      delete nextLastRun[action.step];
      return bumpUpdated(
        withLa(state, {
          lastRunAt: nextLastRun,
          proposalsByStep: nextProposals,
          advisoriesByStep: nextAdvisories,
        }),
      );
    }

    // ── Slice 6: Step 8 generation pipeline ──────────────────────────────
    case "BEGIN_STEP8_GENERATION": {
      const next = withGeneration(state, {
        status: "compiling",
        lastError: undefined,
      });
      return bumpUpdated(next, action.now);
    }

    case "APPLY_STEP8_GENERATION": {
      // Atomic replace. Never partial-merge into a prior `generated`.
      const livePrint = computeInputFingerprint(state.input);
      const stale = action.generated.inputFingerprint !== livePrint;
      const withGen: AscDraft = {
        ...state,
        generated: action.generated,
      };
      const next = withGeneration(withGen, {
        status: "success",
        lastRunAt: action.now,
        lastError: undefined,
        stale,
        staleReason: stale ? "input_changed" : undefined,
      });
      return bumpUpdated(next, action.now);
    }

    case "FAIL_STEP8_GENERATION": {
      const next = withGeneration(state, {
        status: "error",
        lastError: action.error,
      });
      return bumpUpdated(next, action.now);
    }

    case "DISCARD_STEP8_GENERATION": {
      const next: AscDraft = { ...state };
      delete next.generated;
      return bumpUpdated(
        withGeneration(next, {
          status: "idle",
          lastError: undefined,
          stale: true,
          staleReason: "never_generated",
        }),
        action.now,
      );
    }

    case "MARK_FORKED": {
      // Idempotent: once forked, repeat dispatches are a no-op rather than
      // appending duplicate fork records. The CTA is already gated by
      // selectCanFork; this is a defense-in-depth guard.
      if (state.state === "forked") return state;
      const fork = {
        at: action.at,
        by: action.by,
        target: action.target ?? ("canonical_builder" as const),
      };
      return bumpUpdated(
        {
          ...state,
          state: "forked",
          forks: [...(state.forks ?? []), fork],
        },
        action.at,
      );
    }

    default: {
      const _exhaustive: never = action;
      void _exhaustive;
      return state;
    }
  }
}

/**
 * Slice 6 — post-process staleness wrapper.
 *
 * If a Step 1–7 input mutation occurs while a generated draft exists, the
 * draft must be marked stale (but never deleted). The wrapped reducer runs
 * normally; we then compare input identity. Identity-based check is sound
 * because every input-mutating case constructs a new `input` object.
 *
 * BEGIN/APPLY/FAIL/DISCARD already manage their own generation meta and are
 * skipped — `APPLY_STEP8_GENERATION` in particular intentionally records
 * stale=true if the live fingerprint diverged from the generated one.
 *
 * Slice 8 — MARK_FORKED is also skipped: forking does not mutate
 * input.* so it must not flip generation.stale.
 */
const GENERATION_OWNED_ACTIONS: ReadonlySet<AscAction["type"]> = new Set([
  "BEGIN_STEP8_GENERATION",
  "APPLY_STEP8_GENERATION",
  "FAIL_STEP8_GENERATION",
  "DISCARD_STEP8_GENERATION",
  "INIT_DRAFT",
  "RESET_DRAFT",
  "MARK_FORKED",
]);

export function ascReducer(state: AscDraft, action: AscAction): AscDraft {
  const next = ascReducerInner(state, action);
  if (GENERATION_OWNED_ACTIONS.has(action.type)) return next;
  if (next === state) return next;
  if (!next.generated) return next;
  if (next.input === state.input) return next;
  const meta = next.meta.generation;
  if (meta?.stale) return next;
  return withGeneration(next, { stale: true, staleReason: "input_changed" });
}

// ── Later-slice stubs ──────────────────────────────────────────────────────

export function ascGeneratedToRunnerPayload(): never {
  throw new Error(
    "[asc] ascGeneratedToRunnerPayload is not implemented yet.",
  );
}

/**
 * Slice 8 — explicit ASC → canonical intake translation.
 *
 * Returns prefill suitable for navigating to the canonical campaign intake
 * route. Does NOT touch the database, does NOT mutate any canonical
 * record, and does NOT change ASC state. Callers must dispatch
 * `MARK_FORKED` separately once they actually navigate.
 */
export function forkToCanonical(
  draft: AscDraft,
  options: { forkedAt: string },
): AscForkResult {
  return translateAscDraftToIntake(draft, options);
}
