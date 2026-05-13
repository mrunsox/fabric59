import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIntegrationProviders } from "@/hooks/useWorkspaceIntegrations";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Plug, ArrowRight, AlertTriangle, CheckCircle2 } from "lucide-react";

/**
 * Phase 5 — Canonical /org/connectors.
 *
 * Org-level connectors catalog. Every active platform provider is listed once;
 * each tile shows org-rolled-up connection state across all workspaces. Click a
 * tile to drill into /org/connectors/:slug. No fake providers, no fake KPIs.
 */

const LIVE_STATUSES = new Set(["connected", "live", "active", "ok"]);
const ERROR_STATUSES = new Set(["error", "errored", "failed", "needs_attention"]);

type OrgConnRow = { provider_id: string; status: string };

export default function OrgConnectorsPage() {
  const { organization } = useAuth();
  const { data: providers = [], isLoading: providersLoading } = useIntegrationProviders();

  const { data: connections = [], isLoading: connsLoading } = useQuery({
    queryKey: ["org-connectors", organization?.id],
    enabled: !!organization?.id,
    queryFn: async (): Promise<OrgConnRow[]> => {
      const { data, error } = await supabase
        .from("integration_connections" as never)
        .select("provider_id, status")
        .eq("organization_id", organization!.id);
      if (error) throw error;
      return (data ?? []) as unknown as OrgConnRow[];
    },
  });

  const buckets = useMemo(() => {
    const byProvider: Record<string, { total: number; live: number; errored: number; other: number }> = {};
    for (const c of connections) {
      const b = (byProvider[c.provider_id] ??= { total: 0, live: 0, errored: 0, other: 0 });
      b.total++;
      if (LIVE_STATUSES.has(c.status)) b.live++;
      else if (ERROR_STATUSES.has(c.status)) b.errored++;
      else b.other++;
    }
    return byProvider;
  }, [connections]);

  const totals = useMemo(
    () =>
      connections.reduce(
        (acc, c) => {
          acc.total++;
          if (LIVE_STATUSES.has(c.status)) acc.live++;
          else if (ERROR_STATUSES.has(c.status)) acc.errored++;
          return acc;
        },
        { total: 0, live: 0, errored: 0 },
      ),
    [connections],
  );

  const loading = providersLoading || connsLoading;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8 animate-fade-in">
      <OrgPageHeader
        eyebrow="Organization"
        title="Connectors"
        lede="Org-level catalog of platform connectors. Configure providers and inspect live, attention-needed, and not-yet-connected states across every workspace."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryStat label="Providers available" value={providers.length} />
        <SummaryStat
          label="Live connections"
          value={totals.live}
          tone={totals.live > 0 ? "success" : undefined}
          icon={CheckCircle2}
        />
        <SummaryStat
          label="Need attention"
          value={totals.errored}
          tone={totals.errored > 0 ? "danger" : undefined}
          icon={AlertTriangle}
        />
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">Loading…</CardContent>
        </Card>
      ) : providers.length === 0 ? (
        <EmptyState
          icon={Plug}
          title="No connectors available"
          description="Platform connectors haven't been registered yet. Once they're enabled they'll appear here."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((p) => {
            const b = buckets[p.id];
            const state =
              !b || b.total === 0
                ? "available"
                : b.errored > 0
                  ? "needs_attention"
                  : b.live > 0
                    ? "live"
                    : "not_connected";
            return (
              <Link
                key={p.id}
                to={`/org/connectors/${p.id}`}
                className="group rounded-lg border border-border/60 bg-card p-4 hover:border-primary/40 hover:bg-accent/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-lg bg-secondary/40 flex items-center justify-center shrink-0">
                      <Plug className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.display_name}</p>
                      <p className="text-[11px] text-muted-foreground capitalize">{p.category}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <StatusBadge status={state} />
                  {b && b.total > 0 ? (
                    <Badge variant="outline" className="text-[10px]">
                      {b.total} connection{b.total === 1 ? "" : "s"}
                    </Badge>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">Not yet configured</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SummaryStat({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number;
  tone?: "success" | "danger";
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const toneClass =
    tone === "success" ? "text-success" : tone === "danger" ? "text-destructive" : "text-foreground";
  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
          {Icon && <Icon className={`h-3.5 w-3.5 ${toneClass}`} />}
          <span>{label}</span>
        </div>
        <p className={`text-2xl font-semibold mt-1 tabular-nums ${toneClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
