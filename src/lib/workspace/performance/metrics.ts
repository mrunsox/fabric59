/**
 * Phase 8 — Outcome & Performance OS (pure metrics layer).
 *
 * On-the-fly derivation (Option A). No new schema; functions take
 * already-loaded arrays so they're trivially testable from fixtures.
 *
 * Snapshot coverage semantics:
 *  - Volume/handle-time metrics use ALL sessions.
 *  - `aiUsageRate` is denominated over SNAPSHOT-COVERED sessions only,
 *    and its label/UI must say so explicitly.
 *
 * `avgWrapSeconds` is intentionally omitted in Phase 8 — wrap-up timing
 * cannot be derived consistently from existing data today.
 */

import type { CallSessionSnapshotV1 } from "@/lib/workspace/callSessions/snapshotContract";

export type DispositionBucket = "success" | "soft_fail" | "hard_fail" | "other";

export interface PerformanceCallSession {
  id: string;
  workspace_id: string;
  campaign_id: string | null;
  status: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
}

export interface PerformanceOutcome {
  call_session_id: string | null;
  disposition: string | null;
}

export interface PerformanceQaReview {
  call_session_id: string | null;
  status: string | null;
}

export interface PerformanceSnapshotRecord {
  call_session_id: string;
  snapshot: CallSessionSnapshotV1;
}

export interface CallMetrics {
  totalCalls: number;
  completedCalls: number;
  completionRate: number; // 0..1
  dispositionBuckets: Record<DispositionBucket, number>;
  successDispositionRate: number; // 0..1 over calls with an outcome
  avgHandleSeconds: number | null;
  aiUsageRate: number | null; // 0..1 over snapshot-covered calls
  aiUsageDenominator: number; // # of sessions that have a snapshot
  qaCoverageRate: number; // 0..1 over total calls
  snapshotCoverageRate: number; // 0..1 over total calls
}

const COMPLETED_STATUSES = new Set(["completed", "wrap_up", "ended", "complete"]);

/** Deterministic, table-driven bucketing for disposition strings. */
export function bucketDisposition(raw: string | null | undefined): DispositionBucket {
  if (!raw) return "other";
  const s = raw.toLowerCase().trim();
  if (!s) return "other";
  // Success
  if (/(success|won|sale|sold|qualified|converted|booked|appointment_set|paid|enrolled|completed_sale)/.test(s)) {
    return "success";
  }
  // Hard fail
  if (/(no_answer|busy|dnc|do_not_call|disconnected|wrong_number|bad_number|invalid|abandon|hangup|hung_up|hard_decline|escalated|complaint|cancellation|cancel)/.test(s)) {
    return "hard_fail";
  }
  // Soft fail
  if (/(callback|voicemail|left_message|not_interested|follow_up|reschedule|gatekeeper|left_msg|soft_decline|undecided|info_only)/.test(s)) {
    return "soft_fail";
  }
  return "other";
}

export function computeCallMetrics(input: {
  sessions: PerformanceCallSession[];
  outcomes: PerformanceOutcome[];
  qaReviews: PerformanceQaReview[];
  snapshots: PerformanceSnapshotRecord[];
}): CallMetrics {
  const { sessions, outcomes, qaReviews, snapshots } = input;
  const totalCalls = sessions.length;

  const snapshotBySession = new Map(snapshots.map((s) => [s.call_session_id, s.snapshot]));
  const outcomeBySession = new Map<string, PerformanceOutcome>();
  for (const o of outcomes) {
    if (o.call_session_id) outcomeBySession.set(o.call_session_id, o);
  }
  const reviewedSessionIds = new Set(
    qaReviews.map((r) => r.call_session_id).filter((x): x is string => !!x),
  );

  let completedCalls = 0;
  const buckets: Record<DispositionBucket, number> = {
    success: 0,
    soft_fail: 0,
    hard_fail: 0,
    other: 0,
  };
  let durationSum = 0;
  let durationCount = 0;
  let outcomesWithBucket = 0;
  let aiUsedCount = 0;

  for (const s of sessions) {
    if (s.status && COMPLETED_STATUSES.has(s.status)) completedCalls += 1;
    if (typeof s.duration_seconds === "number" && s.duration_seconds > 0) {
      durationSum += s.duration_seconds;
      durationCount += 1;
    }
    const o = outcomeBySession.get(s.id);
    if (o) {
      const b = bucketDisposition(o.disposition);
      buckets[b] += 1;
      outcomesWithBucket += 1;
    }
    const snap = snapshotBySession.get(s.id);
    if (snap && (snap.ai_assist?.used_suggestions?.length ?? 0) > 0) {
      aiUsedCount += 1;
    }
  }

  const aiDenom = snapshotBySession.size;

  return {
    totalCalls,
    completedCalls,
    completionRate: totalCalls === 0 ? 0 : completedCalls / totalCalls,
    dispositionBuckets: buckets,
    successDispositionRate:
      outcomesWithBucket === 0 ? 0 : buckets.success / outcomesWithBucket,
    avgHandleSeconds: durationCount === 0 ? null : durationSum / durationCount,
    aiUsageRate: aiDenom === 0 ? null : aiUsedCount / aiDenom,
    aiUsageDenominator: aiDenom,
    qaCoverageRate:
      totalCalls === 0
        ? 0
        : sessions.filter((s) => reviewedSessionIds.has(s.id)).length / totalCalls,
    snapshotCoverageRate: totalCalls === 0 ? 0 : aiDenom / totalCalls,
  };
}

export interface DailyVolumePoint {
  date: string; // YYYY-MM-DD (UTC)
  count: number;
}

export function summarizeOverTime(
  sessions: PerformanceCallSession[],
  windowDays: number,
): DailyVolumePoint[] {
  const byDay = new Map<string, number>();
  for (let i = windowDays - 1; i >= 0; i -= 1) {
    const d = new Date(Date.now() - i * 24 * 3600 * 1000);
    byDay.set(d.toISOString().slice(0, 10), 0);
  }
  for (const s of sessions) {
    const key = s.started_at.slice(0, 10);
    if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }
  return [...byDay.entries()].map(([date, count]) => ({ date, count }));
}

export interface CoachingCandidate {
  sessionId: string;
  startedAt: string;
  campaignId: string | null;
  reasons: string[]; // human-readable chips
  rank: number; // higher = more important
  reviewed: boolean;
}

/**
 * Deterministic ranking — capped at `limit` (default 20):
 *   hard_fail > soft_fail > AI-tagged > newest
 * Reviewed calls are marked but retained per Phase 8 spec.
 */
export function selectCoachingCandidates(input: {
  sessions: PerformanceCallSession[];
  outcomes: PerformanceOutcome[];
  qaReviews: PerformanceQaReview[];
  snapshots: PerformanceSnapshotRecord[];
  aiTags?: Map<string, string[]>; // sessionId -> tags (e.g. from AI summary)
  limit?: number;
}): CoachingCandidate[] {
  const { sessions, outcomes, qaReviews, snapshots } = input;
  const limit = input.limit ?? 20;

  const outcomeBySession = new Map<string, PerformanceOutcome>();
  for (const o of outcomes) if (o.call_session_id) outcomeBySession.set(o.call_session_id, o);
  const reviewedSessionIds = new Set(
    qaReviews.map((r) => r.call_session_id).filter((x): x is string => !!x),
  );
  const snapshotBySession = new Map(snapshots.map((s) => [s.call_session_id, s.snapshot]));

  const FLAG_TAGS = new Set([
    "frustrated",
    "cancellation_risk",
    "complaint",
    "escalation",
    "confused",
    "angry",
  ]);

  const scored: CoachingCandidate[] = [];
  for (const s of sessions) {
    const reasons: string[] = [];
    let rank = 0;

    const o = outcomeBySession.get(s.id);
    const bucket = bucketDisposition(o?.disposition ?? null);
    if (bucket === "hard_fail") {
      reasons.push("Hard fail");
      rank += 1000;
    } else if (bucket === "soft_fail") {
      reasons.push("Soft fail");
      rank += 500;
    }

    // Merge explicit tags (e.g. from server-side AI summaries) with
    // tags inferred directly from the snapshot payload (notes excerpt +
    // disposition label keyword scan). Both flow through the same FLAG_TAGS
    // gate so the coaching reasons stay short and predictable.
    const snap = snapshotBySession.get(s.id);
    const inferred = snap ? extractAiTagsFromSnapshot(snap) : [];
    const combined = new Set<string>([
      ...(input.aiTags?.get(s.id) ?? []),
      ...inferred,
    ]);
    const seenReasons = new Set<string>();
    for (const t of combined) {
      const norm = t.toLowerCase().replace(/\s+/g, "_");
      if (FLAG_TAGS.has(norm) && !seenReasons.has(norm)) {
        reasons.push(formatTagLabel(norm));
        seenReasons.add(norm);
        rank += 100;
      }
    }

    // Newest tie-breaker (ms since epoch, scaled small so it never beats bucket)
    rank += new Date(s.started_at).getTime() / 1e12;

    if (rank > 0 || reasons.length > 0) {
      scored.push({
        sessionId: s.id,
        startedAt: s.started_at,
        campaignId: s.campaign_id,
        reasons,
        rank,
        reviewed: reviewedSessionIds.has(s.id),
      });
    }
  }

  scored.sort((a, b) => b.rank - a.rank);
  return scored.slice(0, limit);
}

/**
 * Phase 9 — Derive a compact tag set from a snapshot's free-text surfaces
 * (outcome notes excerpt + disposition label). Pure keyword scan; never
 * calls a model. Returns canonical FLAG_TAGS-shaped strings.
 */
const TAG_KEYWORDS: Array<{ tag: string; pattern: RegExp }> = [
  { tag: "frustrated", pattern: /\b(frustrat|annoyed|upset)/i },
  { tag: "angry", pattern: /\b(angry|furious|irate)/i },
  { tag: "cancellation_risk", pattern: /\b(cancel|cancellation|churn)/i },
  { tag: "complaint", pattern: /\b(complaint|complain|dissatisfied)/i },
  { tag: "escalation", pattern: /\b(escalat|supervisor|manager)/i },
  { tag: "confused", pattern: /\b(confus|unclear|don'?t understand)/i },
];

export function extractAiTagsFromSnapshot(
  snap: CallSessionSnapshotV1 | null | undefined,
): string[] {
  if (!snap) return [];
  const haystack = [
    snap.outcome?.notes_excerpt ?? "",
    snap.outcome?.disposition_label ?? "",
  ]
    .join(" ")
    .trim();
  if (!haystack) return [];
  const hits = new Set<string>();
  for (const { tag, pattern } of TAG_KEYWORDS) {
    if (pattern.test(haystack)) hits.add(tag);
  }
  return [...hits];
}

function formatTagLabel(norm: string): string {
  return norm
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

