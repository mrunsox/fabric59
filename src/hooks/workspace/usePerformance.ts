/**
 * Phase 8 — Workspace + Campaign performance data hook.
 *
 * On-the-fly aggregation over call_sessions / call_outcomes / qa_reviews /
 * call_session_snapshots. No materialized tables. Underlying tables remain
 * org-scoped today (see WorkspaceAnalyticsPage note) — we filter by
 * workspace_id when present and fall back to organization_id.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  computeCallMetrics,
  selectCoachingCandidates,
  summarizeOverTime,
  type CallMetrics,
  type CoachingCandidate,
  type DailyVolumePoint,
  type PerformanceCallSession,
  type PerformanceOutcome,
  type PerformanceQaReview,
  type PerformanceSnapshotRecord,
} from "@/lib/workspace/performance/metrics";

const SESSION_COLS = "id,workspace_id,campaign_id,status,started_at,ended_at,duration_seconds";

interface RawSnapshot {
  call_session_id: string;
  snapshot: PerformanceSnapshotRecord["snapshot"];
}

async function loadWindow(
  workspaceId: string,
  orgId: string,
  windowDays: number,
  campaignId?: string,
): Promise<{
  sessions: PerformanceCallSession[];
  outcomes: PerformanceOutcome[];
  qaReviews: PerformanceQaReview[];
  snapshots: PerformanceSnapshotRecord[];
}> {
  const since = new Date(Date.now() - windowDays * 24 * 3600 * 1000).toISOString();

  let sq = supabase
    .from("call_sessions")
    .select(SESSION_COLS)
    .gte("started_at", since)
    .order("started_at", { ascending: false })
    .limit(2000);
  // Prefer workspace_id if column is populated; fall back to org filter.
  sq = sq.or(`workspace_id.eq.${workspaceId},organization_id.eq.${orgId}`);
  if (campaignId) sq = sq.eq("campaign_id", campaignId);

  const { data: sessionsRaw, error: se } = await sq;
  if (se) throw se;
  const sessions = (sessionsRaw ?? []) as PerformanceCallSession[];
  const sessionIds = sessions.map((s) => s.id);

  if (sessionIds.length === 0) {
    return { sessions: [], outcomes: [], qaReviews: [], snapshots: [] };
  }

  const [oRes, qRes, snapRes] = await Promise.all([
    supabase
      .from("call_outcomes")
      .select("call_session_id,disposition")
      .in("call_session_id", sessionIds),
    supabase
      .from("qa_reviews")
      .select("call_session_id,status")
      .in("call_session_id", sessionIds),
    supabase
      .from("call_session_snapshots" as never)
      .select("call_session_id,snapshot")
      .in("call_session_id", sessionIds)
      .order("created_at", { ascending: false }),
  ]);

  if (oRes.error) throw oRes.error;
  if (qRes.error) throw qRes.error;
  if (snapRes.error) throw snapRes.error;

  // Keep only the latest snapshot per session (snapshots are append-only).
  const latest = new Map<string, RawSnapshot>();
  for (const row of (snapRes.data as RawSnapshot[] | null) ?? []) {
    if (!latest.has(row.call_session_id)) latest.set(row.call_session_id, row);
  }

  return {
    sessions,
    outcomes: (oRes.data ?? []) as PerformanceOutcome[],
    qaReviews: (qRes.data ?? []) as PerformanceQaReview[],
    snapshots: [...latest.values()].map((r) => ({
      call_session_id: r.call_session_id,
      snapshot: r.snapshot,
    })),
  };
}

export interface WorkspacePerformanceData {
  metrics: CallMetrics;
  overTime: DailyVolumePoint[];
  perCampaign: Array<{ campaignId: string | null; metrics: CallMetrics }>;
}

export function useWorkspacePerformance(windowDays: number) {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ["workspace-performance", workspace?.id ?? null, windowDays],
    enabled: !!workspace,
    queryFn: async (): Promise<WorkspacePerformanceData> => {
      const data = await loadWindow(workspace!.id, workspace!.organization_id, windowDays);
      const metrics = computeCallMetrics(data);
      const overTime = summarizeOverTime(data.sessions, Math.min(windowDays, 30));

      const byCampaign = new Map<string | null, PerformanceCallSession[]>();
      for (const s of data.sessions) {
        const key = s.campaign_id;
        const arr = byCampaign.get(key) ?? [];
        arr.push(s);
        byCampaign.set(key, arr);
      }
      const perCampaign = [...byCampaign.entries()].map(([campaignId, sessions]) => {
        const ids = new Set(sessions.map((s) => s.id));
        return {
          campaignId,
          metrics: computeCallMetrics({
            sessions,
            outcomes: data.outcomes.filter((o) => o.call_session_id && ids.has(o.call_session_id)),
            qaReviews: data.qaReviews.filter(
              (r) => r.call_session_id && ids.has(r.call_session_id),
            ),
            snapshots: data.snapshots.filter((s) => ids.has(s.call_session_id)),
          }),
        };
      });

      return { metrics, overTime, perCampaign };
    },
  });
}

export interface CampaignPerformanceData {
  metrics: CallMetrics;
  overTime: DailyVolumePoint[];
  recentSessions: PerformanceCallSession[];
  coaching: CoachingCandidate[];
}

export function useCampaignPerformance(campaignId: string | undefined, windowDays: number) {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ["campaign-performance", campaignId, windowDays],
    enabled: !!workspace && !!campaignId,
    queryFn: async (): Promise<CampaignPerformanceData> => {
      const data = await loadWindow(
        workspace!.id,
        workspace!.organization_id,
        windowDays,
        campaignId!,
      );
      const metrics = computeCallMetrics(data);
      const overTime = summarizeOverTime(data.sessions, Math.min(windowDays, 30));
      const coaching = selectCoachingCandidates({ ...data, limit: 20 });
      return {
        metrics,
        overTime,
        recentSessions: data.sessions.slice(0, 25),
        coaching,
      };
    },
  });
}
