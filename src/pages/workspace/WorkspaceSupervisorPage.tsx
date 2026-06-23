/**
 * Phase 6 — Supervisor presence overview (read-only).
 *
 * Lists every active agent in the workspace's organization with their
 * current session, campaign, caller, and duration. Explicitly read-only:
 * no listen / whisper / barge, no queue manipulation.
 *
 * Offline policy (explicit, not ambiguous):
 *   - Source list: `agents` rows where `status = 'active'` for the workspace's
 *     organization. Inactive/disabled agents are not shown.
 *   - Per-row status mapping (see `mapAgentPresence`):
 *       on-call  → has an open `call_sessions` row mapped to phase `live`
 *                  or `connecting`
 *       wrap-up  → open session mapped to phase `wrap_up`
 *       idle     → active agent, no open session
 *       offline  → reserved for agents whose `agents.status` is not 'active'
 *                  (filtered out of this view by default)
 */
import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Radio, PhoneCall, Clock, ExternalLink } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  mapAgentPresence,
  computeElapsedMs,
  resolveCallerIdentity,
  type CallSessionRow,
  type AgentPresenceState,
} from "@/lib/workspace/cockpit/callSession";

type AgentRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  status: string | null;
};

function displayName(a: AgentRow): string {
  const name = `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim();
  return name || a.email || a.id.slice(0, 8);
}

const PRESENCE_META: Record<AgentPresenceState, { label: string; tone: string }> = {
  "on-call": { label: "On call", tone: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" },
  "wrap-up": { label: "Wrap-up", tone: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
  idle: { label: "Idle", tone: "bg-muted text-muted-foreground border-border" },
  offline: { label: "Offline", tone: "bg-muted text-muted-foreground border-border" },
};

function formatElapsed(ms: number | null): string {
  if (ms == null) return "—";
  const sec = Math.floor(ms / 1000);
  const mm = String(Math.floor(sec / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function WorkspaceSupervisorPage() {
  const { workspace } = useWorkspace();
  const qc = useQueryClient();

  const { data: agents = [] } = useQuery({
    queryKey: ["supervisor-agents", workspace?.organization_id ?? null],
    enabled: !!workspace?.organization_id,
    queryFn: async (): Promise<AgentRow[]> => {
      const { data, error } = await supabase
        .from("agents")
        .select("id, display_name, email, status")
        .eq("organization_id", workspace!.organization_id)
        .eq("status", "active")
        .order("display_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AgentRow[];
    },
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["supervisor-sessions", workspace?.id ?? null],
    enabled: !!workspace?.id,
    refetchInterval: 15000,
    queryFn: async (): Promise<CallSessionRow[]> => {
      const { data, error } = await supabase
        .from("call_sessions")
        .select(
          "id, organization_id, workspace_id, tenant_id, campaign_id, agent_id, script_session_id, five9_call_id, ani, dnis, caller_name, phase, status, started_at, ended_at, duration_seconds, metadata",
        )
        .eq("workspace_id", workspace!.id)
        .is("ended_at", null)
        .order("started_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as CallSessionRow[];
    },
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["supervisor-campaigns", workspace?.id ?? null],
    enabled: !!workspace?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, name")
        .eq("workspace_id", workspace!.id);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string }>;
    },
  });

  // Realtime — invalidate active-session list on any change.
  useEffect(() => {
    if (!workspace?.id) return;
    const channel = supabase
      .channel(`supervisor-sessions-${workspace.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "call_sessions", filter: `workspace_id=eq.${workspace.id}` },
        () => qc.invalidateQueries({ queryKey: ["supervisor-sessions", workspace.id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspace?.id, qc]);

  const campaignNameById = useMemo(
    () => new Map(campaigns.map((c) => [c.id, c.name])),
    [campaigns],
  );
  const sessionByAgentId = useMemo(() => {
    const m = new Map<string, CallSessionRow>();
    for (const s of sessions) if (s.agent_id && !m.has(s.agent_id)) m.set(s.agent_id, s);
    return m;
  }, [sessions]);

  const rows = useMemo(
    () =>
      agents.map((a) => {
        const session = sessionByAgentId.get(a.id) ?? null;
        const presence = mapAgentPresence({ agentStatus: a.status, session });
        const caller = session
          ? resolveCallerIdentity({ ani: session.ani, callerName: session.caller_name })
          : null;
        return {
          agent: a,
          session,
          presence,
          caller,
          elapsed: session ? computeElapsedMs(session) : null,
          campaign: session?.campaign_id ? campaignNameById.get(session.campaign_id) ?? null : null,
        };
      }),
    [agents, sessionByAgentId, campaignNameById],
  );

  const activeCount = rows.filter((r) => r.presence === "on-call" || r.presence === "wrap-up").length;

  if (!workspace) return null;

  return (
    <div className="space-y-6">
      <WorkspacePageHeader
        eyebrow="Supervisor"
        title="Supervisor presence"
        lede="Read-only overview of active agents and live calls. Listen, whisper, and barge controls are deferred."
      />

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground" data-testid="supervisor-summary">
        <Badge variant="outline" className="gap-1">
          <Radio className="h-3 w-3" /> {activeCount} live
        </Badge>
        <Badge variant="outline">{rows.length} active agents</Badge>
        <span>Offline = agents whose record is not active and are hidden from this view.</span>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Eye}
          title="No active agents yet"
          description="Agents marked active will appear here with their live presence."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border/40" data-testid="supervisor-list">
              {rows.map(({ agent, session, presence, caller, elapsed, campaign }) => {
                const meta = PRESENCE_META[presence];
                return (
                  <li
                    key={agent.id}
                    className="px-6 py-3 flex flex-wrap items-center justify-between gap-3"
                    data-testid={`supervisor-row-${agent.id}`}
                    data-presence={presence}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {agent.display_name ?? agent.email ?? agent.id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {campaign ?? "No active campaign"}
                        {caller && (
                          <>
                            {" · "}
                            <PhoneCall className="inline h-3 w-3 -mt-0.5 mr-0.5" />
                            <span className="font-mono">{caller.label}</span>
                            <span className="ml-1 text-[10px] uppercase tracking-wider opacity-70">
                              {caller.source === "caller_name" ? "name" : caller.source === "ani" ? "ani" : "?"}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`inline-flex items-center rounded border px-2 h-6 text-[11px] font-medium ${meta.tone}`}>
                        {meta.label}
                      </span>
                      {session && (
                        <Badge variant="outline" className="font-mono text-[11px] gap-1">
                          <Clock className="h-3 w-3" /> {formatElapsed(elapsed)}
                        </Badge>
                      )}
                      {session && (
                        <Button
                          asChild
                          size="sm"
                          variant="ghost"
                          data-testid={`supervisor-open-runs-${agent.id}`}
                        >
                          <Link to={`/w/${workspace.id}/cockpit?tab=runs&session=${session.id}`}>
                            <ExternalLink className="h-3 w-3 mr-1" /> Runs
                          </Link>
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
