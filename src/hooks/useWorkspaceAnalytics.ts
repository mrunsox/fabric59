import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

/**
 * Phase 8 — Canonical workspace analytics hooks.
 *
 * Note: Underlying data tables (call_sessions, qa_reviews, invoices, etc.) are
 * still org-scoped today. Until workspace_id is plumbed through those tables,
 * we read at organization_id and label results as workspace-scoped at the UI
 * level. This is documented in /outline as a Phase 8 limitation.
 */

export type WorkspaceKpis = {
  callsTotal: number;
  callsLast7d: number;
  outcomesLast7d: number;
  qaPending: number;
  qaCompleted: number;
  campaignsActive: number;
  guidesPublished: number;
};

export function useWorkspaceKpis() {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ["workspace-kpis", workspace?.id ?? null],
    enabled: !!workspace,
    queryFn: async (): Promise<WorkspaceKpis> => {
      const orgId = workspace!.organization_id;
      const wsId = workspace!.id;
      const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

      const [callsTotal, callsRecent, outcomesRecent, qaPending, qaCompleted, campaignsActive, guidesPub] =
        await Promise.all([
          supabase.from("call_sessions").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
          supabase
            .from("call_sessions")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", orgId)
            .gte("started_at", since),
          supabase
            .from("call_sessions")
            .select("id, started_at, call_outcomes!inner(id)" as never, { count: "exact", head: true })
            .eq("organization_id", orgId)
            .gte("started_at", since),
          supabase
            .from("qa_reviews")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", orgId)
            .eq("status", "pending"),
          supabase
            .from("qa_reviews")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", orgId)
            .eq("status", "completed"),
          supabase
            .from("campaigns" as never)
            .select("id", { count: "exact", head: true })
            .eq("workspace_id", wsId)
            .in("status", ["live", "ready"] as never),
          supabase
            .from("guides" as never)
            .select("id", { count: "exact", head: true })
            .eq("workspace_id", wsId)
            .eq("status", "published" as never),
        ]);

      return {
        callsTotal: callsTotal.count ?? 0,
        callsLast7d: callsRecent.count ?? 0,
        outcomesLast7d: outcomesRecent.count ?? 0,
        qaPending: qaPending.count ?? 0,
        qaCompleted: qaCompleted.count ?? 0,
        campaignsActive: campaignsActive.count ?? 0,
        guidesPublished: guidesPub.count ?? 0,
      };
    },
  });
}

export type DispositionRow = { disposition: string; count: number };

export function useWorkspaceDispositions(days = 30) {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ["workspace-dispositions", workspace?.organization_id ?? null, days],
    enabled: !!workspace,
    queryFn: async (): Promise<DispositionRow[]> => {
      const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
      const { data, error } = await supabase
        .from("call_outcomes")
        .select("disposition, call_sessions!inner(organization_id, started_at)")
        .gte("call_sessions.started_at", since)
        .eq("call_sessions.organization_id", workspace!.organization_id)
        .limit(2000);
      if (error) throw error;
      const counts = new Map<string, number>();
      for (const row of (data ?? []) as Array<{ disposition: string | null }>) {
        const key = row.disposition ?? "unspecified";
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      return Array.from(counts.entries())
        .map(([disposition, count]) => ({ disposition, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    },
  });
}
