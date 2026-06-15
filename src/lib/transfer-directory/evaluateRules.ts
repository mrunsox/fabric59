/**
 * Deterministic transfer-rule evaluation engine.
 *
 * Pure function: same inputs → same outputs. No I/O, no clocks (except
 * optional caller-provided context.timeMode). Results carry human-readable
 * rationale strings so the UI can always explain why a target is or isn't
 * being shown.
 *
 * Evaluation lifecycle (see docs/campaign-publish-embed-architecture.md §F):
 *   1. Filter disabled entries.
 *   2. Filter by hours behavior vs. context.timeMode.
 *   3. Apply rules ordered by (priority desc, id asc).
 *   4. instructions_only short-circuits.
 *   5. Hard exclude beats include.
 *   6. If any include rule matched, candidate set is restricted to its union.
 *   7. Apply escalation_only / fallback_only flags.
 *   8. Apply prioritize boosts and annotate rationales.
 *   9. Stable sort: (boost desc, escalationLevel asc, sortOrder asc, name asc).
 *  10. Bucket into recommended | allowed | escalation | fallback | unavailable.
 *  11. Set singleAllowed when exactly one target survives.
 */
import type {
  Condition,
  ConditionGroup,
  EvaluatedTarget,
  EvaluationResult,
  TransferDirectoryConfig,
  TransferEntry,
  TransferEvaluationContext,
  TransferRule,
} from "./types";

function isGroup(c: Condition | ConditionGroup): c is ConditionGroup {
  return (c as ConditionGroup).conditions !== undefined;
}

function resolveContextValue(
  ctx: TransferEvaluationContext,
  cond: Condition,
): unknown {
  if (cond.field === "capturedField") {
    if (!cond.key) return undefined;
    return ctx.capturedFields?.[cond.key];
  }
  return (ctx as Record<string, unknown>)[cond.field];
}

function applyOperator(actual: unknown, op: Condition["op"], expected: unknown): boolean {
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

function evalCondition(cond: Condition, ctx: TransferEvaluationContext): boolean {
  const actual = resolveContextValue(ctx, cond);
  return applyOperator(actual, cond.op, cond.value);
}

function evalGroup(group: ConditionGroup, ctx: TransferEvaluationContext): boolean {
  if (group.conditions.length === 0) return true; // empty group matches everything
  if (group.combinator === "any") {
    return group.conditions.some((c) => (isGroup(c) ? evalGroup(c, ctx) : evalCondition(c, ctx)));
  }
  return group.conditions.every((c) => (isGroup(c) ? evalGroup(c, ctx) : evalCondition(c, ctx)));
}

function hoursAllowed(entry: TransferEntry, timeMode?: TransferEvaluationContext["timeMode"]): boolean {
  if (entry.hours === "always" || !timeMode || timeMode === "always") return true;
  return entry.hours === timeMode;
}

function entryMatchesTagsAny(entry: TransferEntry, tagsAny?: string[]): boolean {
  if (!tagsAny || tagsAny.length === 0) return true;
  const all = new Set([...entry.issueTags, ...entry.specialtyTags, ...entry.urgencyTags]);
  return tagsAny.some((t) => all.has(t));
}

function entryMatchesTargetSelector(
  entry: TransferEntry,
  targetIds: string[] | "*",
  tagsAny?: string[],
): boolean {
  if (targetIds !== "*" && !targetIds.includes(entry.id)) return false;
  return entryMatchesTagsAny(entry, tagsAny);
}

interface RuntimeState {
  entry: TransferEntry;
  excluded: boolean;
  excludedReason: string | null;
  includedByRule: boolean;
  escalationOnly: boolean;
  fallbackOnly: boolean;
  boost: number;
  reasons: string[];
  matchedRuleIds: string[];
}

export function evaluateTransferRules(
  config: TransferDirectoryConfig,
  context: TransferEvaluationContext,
): EvaluationResult {
  const matchedRuleIds: string[] = [];
  const states: RuntimeState[] = config.entries
    .filter((e) => e.enabled)
    .map((entry) => {
      const inHours = hoursAllowed(entry, context.timeMode);
      return {
        entry,
        excluded: !inHours,
        excludedReason: inHours ? null : `Outside ${entry.hours.replace("_", " ")}`,
        includedByRule: false,
        escalationOnly: entry.escalationLevel > 0,
        fallbackOnly: entry.fallback,
        boost: 0,
        reasons: [],
        matchedRuleIds: [],
      } satisfies RuntimeState;
    });

  let anyIncludeMatched = false;
  let instructionsOnly: EvaluationResult["instructionsOnly"] = null;

  const orderedRules = [...config.rules]
    .filter((r) => r.enabled)
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));

  for (const rule of orderedRules) {
    if (!evalGroup(rule.when, context)) continue;
    matchedRuleIds.push(rule.id);

    const action = rule.then;
    if (action.kind === "instructions_only") {
      if (!instructionsOnly) {
        instructionsOnly = { message: action.message, ruleId: rule.id };
      }
      continue;
    }

    if (action.kind === "include") {
      anyIncludeMatched = true;
      for (const s of states) {
        if (s.excluded) continue;
        if (entryMatchesTargetSelector(s.entry, action.targetIds, action.tagsAny)) {
          s.includedByRule = true;
          s.matchedRuleIds.push(rule.id);
          s.reasons.push(reasonForInclude(rule));
        }
      }
      continue;
    }

    if (action.kind === "exclude") {
      for (const s of states) {
        if (entryMatchesTargetSelector(s.entry, action.targetIds, action.tagsAny)) {
          s.excluded = true;
          s.excludedReason = s.excludedReason ?? reasonForExclude(rule);
          s.matchedRuleIds.push(rule.id);
        }
      }
      continue;
    }

    if (action.kind === "prioritize") {
      const boost = typeof action.boost === "number" ? action.boost : 10;
      for (const s of states) {
        if (action.targetIds.includes(s.entry.id) && !s.excluded) {
          s.boost += boost;
          s.matchedRuleIds.push(rule.id);
          s.reasons.push(`Prioritized by rule "${rule.name}"`);
        }
      }
      continue;
    }

    if (action.kind === "escalation_only") {
      for (const s of states) {
        if (action.targetIds.includes(s.entry.id)) {
          s.escalationOnly = true;
          s.matchedRuleIds.push(rule.id);
          s.reasons.push(`Restricted to escalation by rule "${rule.name}"`);
        }
      }
      continue;
    }

    if (action.kind === "fallback_only") {
      for (const s of states) {
        if (action.targetIds.includes(s.entry.id)) {
          s.fallbackOnly = true;
          s.matchedRuleIds.push(rule.id);
          s.reasons.push(`Marked fallback-only by rule "${rule.name}"`);
        }
      }
      continue;
    }

    if (action.kind === "annotate") {
      for (const s of states) {
        if (entryMatchesTargetSelector(s.entry, action.targetIds)) {
          s.reasons.push(action.rationale);
          s.matchedRuleIds.push(rule.id);
        }
      }
      continue;
    }
  }

  if (instructionsOnly) {
    return {
      recommended: [],
      allowed: [],
      escalation: [],
      fallback: [],
      unavailable: states.map((s) => toEvaluated(s, "unavailable")),
      singleAllowed: false,
      instructionsOnly,
      matchedRuleIds,
    };
  }

  // If any include rule fired, restrict candidates to entries actually included.
  if (anyIncludeMatched) {
    for (const s of states) {
      if (!s.includedByRule && !s.excluded) {
        s.excluded = true;
        s.excludedReason = "Not matched by any inclusion rule";
      }
    }
  }

  // Bucket assignment.
  const buckets: Record<
    "recommended" | "allowed" | "escalation" | "fallback" | "unavailable",
    RuntimeState[]
  > = { recommended: [], allowed: [], escalation: [], fallback: [], unavailable: [] };

  for (const s of states) {
    if (s.excluded) {
      buckets.unavailable.push(s);
      continue;
    }
    if (s.escalationOnly) {
      buckets.escalation.push(s);
      continue;
    }
    if (s.fallbackOnly) {
      buckets.fallback.push(s);
      continue;
    }
    buckets.allowed.push(s);
  }

  // Stable sort within bucket.
  const sortStates = (xs: RuntimeState[]) =>
    xs.sort(
      (a, b) =>
        b.boost - a.boost ||
        a.entry.escalationLevel - b.entry.escalationLevel ||
        a.entry.sortOrder - b.entry.sortOrder ||
        a.entry.displayName.localeCompare(b.entry.displayName),
    );

  sortStates(buckets.allowed);
  sortStates(buckets.escalation);
  sortStates(buckets.fallback);

  // Promote top boosted candidates to "recommended". Threshold: any positive
  // boost OR (exactly one allowed remaining) OR (no allowed and >=1 escalation).
  const hasAnyAllowed = buckets.allowed.length > 0;
  const onlyOneAllowed = buckets.allowed.length === 1 && buckets.escalation.length === 0;

  if (hasAnyAllowed) {
    // Move all boosted allowed entries into recommended.
    const recommended: RuntimeState[] = [];
    const rest: RuntimeState[] = [];
    for (const s of buckets.allowed) {
      if (s.boost > 0) recommended.push(s);
      else rest.push(s);
    }
    if (recommended.length === 0 && onlyOneAllowed) {
      recommended.push(rest.shift()!);
    }
    if (recommended.length === 0 && rest.length === 1) {
      // Only one available -> recommend it.
      recommended.push(rest.shift()!);
    }
    buckets.recommended = recommended;
    buckets.allowed = rest;
  }

  // Fallback fallback: if nothing is recommended/allowed but fallback entries exist,
  // bump fallback up — engine still keeps them in fallback bucket but the UI relies
  // on that bucket only when no allowed/recommended exist.

  const singleAllowed =
    buckets.recommended.length + buckets.allowed.length === 1;

  if (singleAllowed) {
    const lone =
      buckets.recommended[0] ?? buckets.allowed[0];
    if (lone) lone.reasons.push("Only allowed transfer target for this context");
  }

  return {
    recommended: buckets.recommended.map((s) => toEvaluated(s, "recommended")),
    allowed: buckets.allowed.map((s) => toEvaluated(s, "allowed")),
    escalation: buckets.escalation.map((s) => toEvaluated(s, "escalation")),
    fallback: buckets.fallback.map((s) => toEvaluated(s, "fallback")),
    unavailable: buckets.unavailable.map((s) => toEvaluated(s, "unavailable")),
    singleAllowed,
    instructionsOnly: null,
    matchedRuleIds,
  };
}

function toEvaluated(s: RuntimeState, bucket: EvaluatedTarget["bucket"]): EvaluatedTarget {
  const reasons = [...s.reasons];
  if (bucket === "unavailable" && s.excludedReason) {
    reasons.unshift(s.excludedReason);
  }
  return {
    entry: s.entry,
    bucket,
    boost: s.boost,
    reasons,
    matchedRuleIds: [...new Set(s.matchedRuleIds)],
  };
}

function reasonForInclude(rule: TransferRule): string {
  return `Included by rule "${rule.name}"`;
}
function reasonForExclude(rule: TransferRule): string {
  return `Excluded by rule "${rule.name}"`;
}
