/**
 * Phase 6 — useCallSession.
 *
 * Hydrates a canonical `call_sessions` row for the cockpit. Resolves either
 * by explicit id (deep links / Supervisor) or by `(workspace_id, agent_id)`
 * for "the agent's current call". Subscribes to realtime updates on the row
 * so the phase pill, elapsed timer, and caller chip all stay in sync.
 *
 * No telephony control here — this is read-only presence.
 */
import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  buildPresenceSnapshot,
  type CallPresenceSnapshot,
  type CallSessionRow,
} from "@/lib/workspace/cockpit/callSession";

const SESSION_COLUMNS =
  "id, organization_id, workspace_id, tenant_id, campaign_id, agent_id, script_session_id, five9_call_id, ani, dnis, caller_name, phase, status, started_at, ended_at, duration_seconds, metadata";

export interface UseCallSessionInput {
  workspaceId: string | null | undefined;
  /** Resolve by id (deep-link / supervisor → cockpit). */
  sessionId?: string | null;
  /** Resolve current open session for this agent within the workspace. */
  agentId?: string | null;
  /** Tick to recompute elapsed time. */
  nowTick?: number;
}

export interface UseCallSessionResult {
  session: CallSessionRow | null;
  presence: CallPresenceSnapshot;
  isLoading: boolean;
  error: Error | null;
}

export function useCallSession(input: UseCallSessionInput): UseCallSessionResult {
  const { workspaceId, sessionId, agentId, nowTick } = input;
  const qc = useQueryClient();

  const queryKey = ["workspace-call-session", workspaceId ?? null, sessionId ?? null, agentId ?? null];

  const { data, isLoading, error } = useQuery({
    queryKey,
    enabled: !!workspaceId && (!!sessionId || !!agentId),
    queryFn: async (): Promise<CallSessionRow | null> => {
      if (sessionId) {
        const { data, error } = await supabase
          .from("call_sessions")
          .select(SESSION_COLUMNS)
          .eq("id", sessionId)
          .maybeSingle();
        if (error) throw error;
        return (data as unknown as CallSessionRow) ?? null;
      }
      // Otherwise: latest open session for the agent in this workspace.
      const { data, error } = await supabase
        .from("call_sessions")
        .select(SESSION_COLUMNS)
        .eq("workspace_id", workspaceId!)
        .eq("agent_id", agentId!)
        .is("ended_at", null)
        .order("started_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return ((data?.[0] as unknown) as CallSessionRow) ?? null;
    },
  });

  // Realtime: targeted subscription on the resolved session id, or on the
  // workspace when we're still waiting for one to appear.
  useEffect(() => {
    if (!workspaceId) return;
    const channel = supabase
      .channel(`call-session-${workspaceId}-${sessionId ?? agentId ?? "any"}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "call_sessions",
          filter: data?.id ? `id=eq.${data.id}` : `workspace_id=eq.${workspaceId}`,
        },
        () => qc.invalidateQueries({ queryKey }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, sessionId, agentId, data?.id]);

  const presence = useMemo(
    () => buildPresenceSnapshot((data as CallSessionRow | null) ?? null, new Date(nowTick ?? Date.now())),
    [data, nowTick],
  );

  return {
    session: (data as CallSessionRow | null) ?? null,
    presence,
    isLoading,
    error: (error as Error | null) ?? null,
  };
}
