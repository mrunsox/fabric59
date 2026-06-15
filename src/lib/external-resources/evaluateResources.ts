/**
 * Deterministic resource-visibility / ranking engine.
 *
 * Pure function — same inputs always produce identical output. The result
 * carries human-readable rationales (`reasons`) and `matchedRuleIds` so the
 * UI and simulator can always explain why a resource is shown/hidden/boosted.
 *
 * Evaluation order (see docs/external-resource-workspace-architecture.md §C):
 *   1. Filter out disabled resources up front.
 *   2. Apply rules sorted by (priority desc, id asc):
 *        a. `hide` immediately marks the resource hidden — hide beats show.
 *        b. `show` clears the hidden flag (unless a hide already won) and
 *           marks the resource as included.
 *        c. `prioritize` adds a boost.
 *        d. `suggest` flags the resource and records the suggestion message
 *           (first matching wins).
 *        e. `auto_open_if_safe` records a candidate; the surface decides
 *           whether to honor it.
 *        f. `annotate` appends a rationale chip.
 *   3. If any `show` rule fired, restrict surviving resources to those
 *      explicitly included (others fall to `hidden`).
 *   4. Stable sort: (boost desc, sortOrder asc, label asc).
 *   5. Bucket: boosted/suggested → recommended; remaining visible → available;
 *      excluded → hidden.
 *   6. Auto-open candidate is honored only when:
 *        - the candidate is visible (recommended or available)
 *        - the surface is internal OR (embed AND not requiring `replace_center`)
 *        - the resource has `requiresConfirmation !== true`
 */
import type {
  EvaluatedResource,
  ExternalResource,
  ExternalResourceRule,
  ExternalResourcesConfig,
  ResourceCondition,
  ResourceConditionGroup,
  ResourceEvaluationContext,
  ResourceEvaluationResult,
  ResourceRuleAction,
} from "./types";

function isGroup(c: ResourceCondition | ResourceConditionGroup): c is ResourceConditionGroup {
  return (c as ResourceConditionGroup).conditions !== undefined;
}

function ctxValue(ctx: ResourceEvaluationContext, cond: ResourceCondition): unknown {
  if (cond.field === "capturedField") {
    if (!cond.key) return undefined;
    return ctx.capturedFields?.[cond.key];
  }
  return (ctx as Record<string, unknown>)[cond.field];
}

function applyOp(actual: unknown, op: ResourceCondition["op"], expected: unknown): boolean {
  switch (op) {
    case "exists":
      return actual !== undefined && actual !== null && actual !== "";
    case "missing":
      return actual === undefined || actual === null || actual === "";
    case "eq":
      return actual === expected;
    case "neq":
      return actual !== expected;
    case "in":
      return Array.isArray(expected) && expected.includes(actual as never);
    case "nin":
      return Array.isArray(expected) ? !expected.includes(actual as never) : true;
    case "contains":
      if (typeof actual === "string" && typeof expected === "string")
        return actual.toLowerCase().includes(expected.toLowerCase());
      if (Array.isArray(actual)) return actual.includes(expected as never);
      return false;
    case "gte":
      return typeof actual === "number" && typeof expected === "number" && actual >= expected;
    case "lte":
      return typeof actual === "number" && typeof expected === "number" && actual <= expected;
    default:
      return false;
  }
}

function evalCond(cond: ResourceCondition, ctx: ResourceEvaluationContext): boolean {
  return applyOp(ctxValue(ctx, cond), cond.op, cond.value);
}

function evalGroup(group: ResourceConditionGroup, ctx: ResourceEvaluationContext): boolean {
  if (group.conditions.length === 0) return true;
  if (group.combinator === "any") {
    return group.conditions.some((c) => (isGroup(c) ? evalGroup(c, ctx) : evalCond(c, ctx)));
  }
  return group.conditions.every((c) => (isGroup(c) ? evalGroup(c, ctx) : evalCond(c, ctx)));
}

function entryMatchesTagsAny(entry: ExternalResource, tagsAny?: string[]): boolean {
  if (!tagsAny || tagsAny.length === 0) return true;
  const all = new Set<string>([
    ...entry.tags,
    ...entry.issueTags,
    ...entry.specialtyTags,
    ...entry.dispositionTags,
    ...entry.urgencyTags,
  ]);
  return tagsAny.some((t) => all.has(t));
}

function matchesSelector(
  entry: ExternalResource,
  targetIds: string[] | "*",
  tagsAny?: string[],
): boolean {
  if (targetIds !== "*" && !targetIds.includes(entry.id)) return false;
  return entryMatchesTagsAny(entry, tagsAny);
}

interface RuntimeState {
  resource: ExternalResource;
  hidden: boolean;
  hiddenReason: string | null;
  shownByRule: boolean;
  boost: number;
  suggested: boolean;
  suggestion?: string;
  autoOpenCandidate: boolean;
  reasons: string[];
  matchedRuleIds: string[];
}

export function evaluateResources(
  config: ExternalResourcesConfig,
  context: ResourceEvaluationContext,
): ResourceEvaluationResult {
  const matchedRuleIds: string[] = [];
  const states: RuntimeState[] = config.resources
    .filter((r) => r.enabled)
    .map((resource) => ({
      resource,
      hidden: false,
      hiddenReason: null,
      shownByRule: false,
      boost: 0,
      suggested: false,
      autoOpenCandidate: false,
      reasons: [],
      matchedRuleIds: [],
    }));

  let anyShowMatched = false;

  const orderedRules = [...config.rules]
    .filter((r) => r.enabled)
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));

  for (const rule of orderedRules) {
    if (!evalGroup(rule.when, context)) continue;
    matchedRuleIds.push(rule.id);
    const action: ResourceRuleAction = rule.then;

    if (action.kind === "hide") {
      for (const s of states) {
        if (matchesSelector(s.resource, action.targetIds, action.tagsAny)) {
          s.hidden = true;
          s.hiddenReason = s.hiddenReason ?? `Hidden by rule "${rule.name}"`;
          s.matchedRuleIds.push(rule.id);
        }
      }
      continue;
    }

    if (action.kind === "show") {
      anyShowMatched = true;
      for (const s of states) {
        if (matchesSelector(s.resource, action.targetIds, action.tagsAny)) {
          if (s.hidden) continue; // hide already won
          s.shownByRule = true;
          s.reasons.push(`Shown by rule "${rule.name}"`);
          s.matchedRuleIds.push(rule.id);
        }
      }
      continue;
    }

    if (action.kind === "prioritize") {
      const boost = typeof action.boost === "number" ? action.boost : 10;
      for (const s of states) {
        if (action.targetIds.includes(s.resource.id) && !s.hidden) {
          s.boost += boost;
          s.reasons.push(`Prioritized by rule "${rule.name}"`);
          s.matchedRuleIds.push(rule.id);
        }
      }
      continue;
    }

    if (action.kind === "suggest") {
      for (const s of states) {
        if (action.targetIds.includes(s.resource.id) && !s.hidden) {
          s.suggested = true;
          if (!s.suggestion && action.message) s.suggestion = action.message;
          s.reasons.push(action.message ?? `Suggested by rule "${rule.name}"`);
          s.matchedRuleIds.push(rule.id);
        }
      }
      continue;
    }

    if (action.kind === "auto_open_if_safe") {
      for (const s of states) {
        if (s.resource.id === action.targetId && !s.hidden) {
          s.autoOpenCandidate = true;
          s.reasons.push(`Auto-open requested by rule "${rule.name}"`);
          s.matchedRuleIds.push(rule.id);
        }
      }
      continue;
    }

    if (action.kind === "annotate") {
      for (const s of states) {
        if (matchesSelector(s.resource, action.targetIds)) {
          s.reasons.push(action.rationale);
          s.matchedRuleIds.push(rule.id);
        }
      }
      continue;
    }
  }

  // If any show rule fired, restrict candidates to entries explicitly included.
  if (anyShowMatched) {
    for (const s of states) {
      if (!s.hidden && !s.shownByRule) {
        s.hidden = true;
        s.hiddenReason = "Not matched by any show rule";
      }
    }
  }

  // Bucket assignment.
  const visible: RuntimeState[] = [];
  const hidden: RuntimeState[] = [];
  for (const s of states) {
    if (s.hidden) hidden.push(s);
    else visible.push(s);
  }

  // Stable sort visible.
  visible.sort(
    (a, b) =>
      b.boost - a.boost ||
      a.resource.sortOrder - b.resource.sortOrder ||
      a.resource.label.localeCompare(b.resource.label),
  );

  const recommended: RuntimeState[] = [];
  const available: RuntimeState[] = [];
  const suggested: RuntimeState[] = [];

  for (const s of visible) {
    if (s.boost > 0 || s.suggested) {
      recommended.push(s);
      if (s.suggested && s.boost === 0) suggested.push(s);
    } else {
      available.push(s);
    }
  }

  // If nothing recommended but exactly one visible — promote it.
  if (recommended.length === 0 && available.length === 1) {
    const lone = available.shift()!;
    lone.reasons.push("Only resource available for this context");
    recommended.push(lone);
  }

  // Resolve auto-open candidate. Honored only when:
  //   - the candidate is in recommended/available
  //   - resource does not require confirmation
  //   - in embed mode, never honor when this would replace center
  //     (we conservatively block auto-open in any embed-like surface for
  //     resources whose openMode is `replace_center`).
  let autoOpenResult: EvaluatedResource | null = null;
  const candidateState =
    visible.find((s) => s.autoOpenCandidate) ?? null;
  if (candidateState) {
    const isEmbedLike =
      context.embedMode === "embed" ||
      context.embedMode === "kiosk" ||
      context.embedMode === "preview";
    const requiresConfirmation = candidateState.resource.requiresConfirmation === true;
    const wouldReplaceCenter = candidateState.resource.openMode === "replace_center";
    if (!requiresConfirmation && !(isEmbedLike && wouldReplaceCenter)) {
      const found =
        recommended.find((s) => s === candidateState) ??
        available.find((s) => s === candidateState);
      if (found) {
        autoOpenResult = toEvaluated(found, classify(found, recommended, available, suggested));
        autoOpenResult.autoOpen = true;
      }
    } else {
      candidateState.reasons.push(
        isEmbedLike && wouldReplaceCenter
          ? "Auto-open suppressed in embed surface"
          : "Auto-open suppressed — confirmation required",
      );
    }
  }

  return {
    recommended: recommended.map((s) => toEvaluated(s, "recommended", suggested.includes(s) ? s.suggestion : undefined)),
    available: available.map((s) => toEvaluated(s, "available")),
    suggested: suggested.map((s) => toEvaluated(s, "recommended", s.suggestion)),
    hidden: hidden.map((s) => toEvaluated(s, "hidden")),
    autoOpenCandidate: autoOpenResult,
    matchedRuleIds,
  };
}

function classify(
  s: RuntimeState,
  recommended: RuntimeState[],
  available: RuntimeState[],
  suggested: RuntimeState[],
): EvaluatedResource["bucket"] {
  if (recommended.includes(s)) return "recommended";
  if (suggested.includes(s)) return "recommended";
  if (available.includes(s)) return "available";
  return "hidden";
}

function toEvaluated(
  s: RuntimeState,
  bucket: EvaluatedResource["bucket"],
  suggestion?: string,
): EvaluatedResource {
  const reasons = [...s.reasons];
  if (bucket === "hidden" && s.hiddenReason) reasons.unshift(s.hiddenReason);
  return {
    resource: s.resource,
    bucket,
    boost: s.boost,
    suggestion: suggestion ?? (s.suggested ? s.suggestion : undefined),
    reasons,
    matchedRuleIds: [...new Set(s.matchedRuleIds)],
  };
}

/** Convenience used by both runners. */
export type ExternalResourceRuleForExport = ExternalResourceRule;
