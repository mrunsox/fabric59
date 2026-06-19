/**
 * Brain Health dashboard (Phase 8).
 *
 * Read-only operational view. Aggregates existing `bb_*` telemetry rows from
 * `platform_events` and counts from governance tables. No raw query text,
 * snippets, notes, or source payloads — counts/durations/error rates only.
 *
 * Distinguishes "no data" (zero matching events) from "failure" (query
 * error) in every card.
 */
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import { BbPermissionDenied } from "@/components/business-brain/BbPermissionDenied";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { emitBbEvent } from "@/lib/business-brain/telemetry";
import {
  getVerticalCoverageSummary,
  listConflicts,
  listStaleFacts,
  listVerticalGaps,
  listGapTopics,
} from "@/lib/business-brain/bridge/governance";
import { AlertCircle, Loader2, TrendingDown, TrendingUp, Minus } from "lucide-react";

const WINDOWS = [
  { key: "7", label: "7d", days: 7 },
  { key: "30", label: "30d", days: 30 },
  { key: "90", label: "90d", days: 90 },
] as const;
type WindowKey = (typeof WINDOWS)[number]["key"];

type EventRow = {
  event_type: string;
  payload: Record<string, unknown> | null;
  created_at: string;
};

function countByType(rows: EventRow[], types: string[]): number {
  const s = new Set(types);
  return rows.reduce((n, r) => (s.has(r.event_type) ? n + 1 : n), 0);
}

function avgLatencyMs(rows: EventRow[], types: string[]): number | null {
  const s = new Set(types);
  const lat: number[] = [];
  for (const r of rows) {
    if (!s.has(r.event_type)) continue;
    const v = r.payload?.["latencyMs"];
    if (typeof v === "number") lat.push(v);
  }
  if (lat.length === 0) return null;
  return Math.round(lat.reduce((a, b) => a + b, 0) / lat.length);
}

function errorRate(rows: EventRow[], okTypes: string[], failTypes: string[]): { rate: number; total: number } {
  const o = new Set(okTypes);
  const f = new Set(failTypes);
  let ok = 0;
  let fail = 0;
  for (const r of rows) {
    if (o.has(r.event_type)) ok++;
    else if (f.has(r.event_type)) fail++;
  }
  const total = ok + fail;
  return { rate: total === 0 ? 0 : fail / total, total };
}

export default function BrainHealthPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { organization, isWorkspaceAdmin, isMasterAdmin } = useAuth();
  const [windowKey, setWindowKey] = useState<WindowKey>("30");

  useEffect(() => {
    if (workspaceId) {
      emitBbEvent("bb_health_view_opened", {
        workspaceId,
        organizationId: organization?.id ?? null,
      });
    }
  }, [workspaceId, organization?.id]);

  const allowed = isWorkspaceAdmin || isMasterAdmin;

  // Pull 90 days once; bucket client-side for the active window AND for delta.
  const eventsQ = useQuery({
    queryKey: ["bb-health-events", organization?.id, workspaceId],
    enabled: !!organization?.id,
    queryFn: async (): Promise<EventRow[]> => {
      const since = new Date(Date.now() - 90 * 86400_000).toISOString();
      const { data, error } = await supabase
        .from("platform_events")
        .select("event_type,payload,created_at")
        .eq("organization_id", organization!.id)
        .eq("source", "business-brain")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(10000);
      if (error) throw error;
      return ((data ?? []) as unknown) as EventRow[];
    },
  });

  const coverageQ = useQuery({
    queryKey: ["bb-vertical-coverage", workspaceId],
    enabled: !!workspaceId,
    queryFn: () => getVerticalCoverageSummary(workspaceId!),
  });
  const conflictsQ = useQuery({
    queryKey: ["bb-open-conflicts", workspaceId],
    enabled: !!workspaceId,
    queryFn: () => listConflicts(workspaceId!, "open"),
  });
  const staleQ = useQuery({
    queryKey: ["bb-stale-facts", workspaceId],
    enabled: !!workspaceId,
    queryFn: () => listStaleFacts({ workspaceId: workspaceId! }),
  });
  const gapsQ = useQuery({
    queryKey: ["bb-vertical-gaps", workspaceId],
    enabled: !!workspaceId,
    queryFn: () => listVerticalGaps(workspaceId!, { status: "open" }),
  });
  const topicsQ = useQuery({
    queryKey: ["bb-gap-topics-open", workspaceId],
    enabled: !!workspaceId,
    queryFn: () => listGapTopics(workspaceId!, { status: "open" }),
  });

  const ws = useMemo(() => WINDOWS.find((w) => w.key === windowKey)!, [windowKey]);

  const { current, previous } = useMemo(() => {
    const all = eventsQ.data ?? [];
    const now = Date.now();
    const curFrom = now - ws.days * 86400_000;
    const prevFrom = now - 2 * ws.days * 86400_000;
    const cur: EventRow[] = [];
    const prev: EventRow[] = [];
    for (const r of all) {
      const t = new Date(r.created_at).getTime();
      if (t >= curFrom) cur.push(r);
      else if (t >= prevFrom) prev.push(r);
    }
    return { current: cur, previous: prev };
  }, [eventsQ.data, ws.days]);

  if (!allowed) {
    return (
      <div className="space-y-6">
        <WorkspacePageHeader title="Brain health" lede="Operational view for the Business Brain." />
        <BbPermissionDenied
          resource="Brain health"
          requiredRole="workspace admin, owner, or master admin"
        />
      </div>
    );
  }

  const dataFetchedAt = eventsQ.dataUpdatedAt
    ? new Date(eventsQ.dataUpdatedAt)
    : null;

  return (
    <div className="space-y-6">
      <WorkspacePageHeader
        title="Brain health"
        lede="Usage, quality, and operational signals for the Business Brain."
        action={
          <Tabs value={windowKey} onValueChange={(v) => setWindowKey(v as WindowKey)}>
            <TabsList>
              {WINDOWS.map((w) => (
                <TabsTrigger key={w.key} value={w.key}>
                  {w.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        }
      />

      {/* Phase 1: explicit window + freshness label so empty cards don't read as broken. */}
      <p
        className="text-xs text-muted-foreground"
        data-testid="bb-health-freshness"
      >
        Showing the last {ws.label} of activity.{" "}
        {dataFetchedAt
          ? `Last updated ${dataFetchedAt.toLocaleTimeString()}.`
          : "Loading…"}
      </p>


      {eventsQ.isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading telemetry…
        </div>
      )}
      {eventsQ.error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" /> Could not load telemetry.
        </div>
      )}

      <Section title="Usage" description="What people are doing with the Brain.">
        <MetricCard
          label="Brain searches"
          current={countByType(current, ["bb_search_query_submitted"])}
          previous={countByType(previous, ["bb_search_query_submitted"])}
          loading={eventsQ.isLoading}
          error={!!eventsQ.error}
        />
        <MetricCard
          label="ASC suggestions shown"
          current={countByType(current, ["bb_asc_suggestions_loaded"])}
          previous={countByType(previous, ["bb_asc_suggestions_loaded"])}
          loading={eventsQ.isLoading}
          error={!!eventsQ.error}
        />
        <MetricCard
          label="ASC suggestions used"
          current={countByType(current, ["bb_asc_suggestion_used"])}
          previous={countByType(previous, ["bb_asc_suggestion_used"])}
          loading={eventsQ.isLoading}
          error={!!eventsQ.error}
        />
        <MetricCard
          label="Assist cards shown"
          current={countByType(current, ["bb_assist_panel_shown", "bb_assist_card_opened"])}
          previous={countByType(previous, ["bb_assist_panel_shown", "bb_assist_card_opened"])}
          loading={eventsQ.isLoading}
          error={!!eventsQ.error}
        />
        <MetricCard
          label="Assist cards inserted"
          current={countByType(current, ["bb_assist_card_inserted"])}
          previous={countByType(previous, ["bb_assist_card_inserted"])}
          loading={eventsQ.isLoading}
          error={!!eventsQ.error}
        />
      </Section>

      <Section title="Quality & governance" description="Point-in-time counts from governance tables.">
        <CountCard
          label="Open conflicts"
          count={conflictsQ.data?.length ?? null}
          loading={conflictsQ.isLoading}
          error={!!conflictsQ.error}
        />
        <CountCard
          label="Stale facts"
          count={staleQ.data?.length ?? null}
          loading={staleQ.isLoading}
          error={!!staleQ.error}
        />
        <CountCard
          label="Open coverage gaps"
          count={gapsQ.data?.length ?? null}
          loading={gapsQ.isLoading}
          error={!!gapsQ.error}
        />
        <CountCard
          label="Open demand topics"
          count={topicsQ.data?.length ?? null}
          loading={topicsQ.isLoading}
          error={!!topicsQ.error}
        />
      </Section>

      <Card>
        <CardHeader>
          <CardTitle>Coverage by required entity type</CardTitle>
          <CardDescription>From the active vertical profile.</CardDescription>
        </CardHeader>
        <CardContent>
          {coverageQ.isLoading && (
            <div className="text-sm text-muted-foreground">Loading…</div>
          )}
          {coverageQ.error && (
            <div className="text-sm text-destructive">Could not load coverage.</div>
          )}
          {!coverageQ.isLoading && !coverageQ.error && (coverageQ.data ?? []).length === 0 && (
            <div className="text-sm text-muted-foreground">
              No vertical profile assigned or no required entities.
            </div>
          )}
          {(coverageQ.data ?? []).length > 0 && (
            <div className="divide-y text-sm">
              {(coverageQ.data ?? []).map((c) => (
                <div key={c.entityType} className="flex items-center justify-between py-2">
                  <span className="capitalize">{c.entityType.replace(/_/g, " ")}</span>
                  <span className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      {c.actualCount} / {c.requiredCount}
                    </span>
                    <Badge variant={c.coverageRatio >= 1 ? "default" : "outline"}>
                      {Math.round(c.coverageRatio * 100)}%
                    </Badge>
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Section title="Ops" description="Latency and error rates from edge function telemetry.">
        <OpsCard
          label="bb-search"
          avgMs={avgLatencyMs(current, ["bb_search_query_submitted"])}
          loading={eventsQ.isLoading}
          error={!!eventsQ.error}
        />
        <OpsCard
          label="bb-embed"
          avgMs={avgLatencyMs(current, ["bb_embed_run_completed"])}
          loading={eventsQ.isLoading}
          error={!!eventsQ.error}
        />
        <ErrorRateCard
          label="Ingest"
          okTypes={["bb_source_processed"]}
          failTypes={["bb_source_failed"]}
          rows={current}
          loading={eventsQ.isLoading}
          error={!!eventsQ.error}
        />
      </Section>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3">
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {children}
      </div>
    </div>
  );
}

function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

function MetricCard({
  label,
  current,
  previous,
  loading,
  error,
}: {
  label: string;
  current: number;
  previous: number;
  loading: boolean;
  error: boolean;
}) {
  const d = deltaPct(current, previous);
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        {error ? (
          <div className="text-sm text-destructive">Failed</div>
        ) : loading ? (
          <div className="text-sm text-muted-foreground">…</div>
        ) : current === 0 && previous === 0 ? (
          <>
            <div className="text-xl font-semibold">0</div>
            <Badge variant="outline" className="text-[10px]">No data</Badge>
          </>
        ) : (
          <>
            <div className="text-xl font-semibold">{current.toLocaleString()}</div>
            <DeltaBadge pct={d} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function DeltaBadge({ pct }: { pct: number | null }) {
  if (pct === null) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
        <TrendingUp className="h-3 w-3" /> new
      </span>
    );
  }
  if (pct === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
        <Minus className="h-3 w-3" /> flat
      </span>
    );
  }
  const up = pct > 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={"inline-flex items-center gap-1 text-[10px] " + (up ? "text-success" : "text-warning")}>
      <Icon className="h-3 w-3" /> {Math.abs(Math.round(pct))}% vs prev
    </span>
  );
}

function CountCard({
  label,
  count,
  loading,
  error,
}: {
  label: string;
  count: number | null;
  loading: boolean;
  error: boolean;
}) {
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        {error ? (
          <div className="text-sm text-destructive">Failed</div>
        ) : loading || count === null ? (
          <div className="text-sm text-muted-foreground">…</div>
        ) : count === 0 ? (
          <>
            <div className="text-xl font-semibold">0</div>
            <Badge variant="outline" className="text-[10px]">No data</Badge>
          </>
        ) : (
          <div className="text-xl font-semibold">{count.toLocaleString()}</div>
        )}
      </CardContent>
    </Card>
  );
}

function OpsCard({
  label,
  avgMs,
  loading,
  error,
}: {
  label: string;
  avgMs: number | null;
  loading: boolean;
  error: boolean;
}) {
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <div className="text-xs text-muted-foreground">{label} · avg latency</div>
        {error ? (
          <div className="text-sm text-destructive">Failed</div>
        ) : loading ? (
          <div className="text-sm text-muted-foreground">…</div>
        ) : avgMs === null ? (
          <Badge variant="outline" className="text-[10px]">No data</Badge>
        ) : (
          <div className="text-xl font-semibold">{avgMs} ms</div>
        )}
      </CardContent>
    </Card>
  );
}

function ErrorRateCard({
  label,
  okTypes,
  failTypes,
  rows,
  loading,
  error,
}: {
  label: string;
  okTypes: string[];
  failTypes: string[];
  rows: EventRow[];
  loading: boolean;
  error: boolean;
}) {
  const r = errorRate(rows, okTypes, failTypes);
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <div className="text-xs text-muted-foreground">{label} · error rate</div>
        {error ? (
          <div className="text-sm text-destructive">Failed</div>
        ) : loading ? (
          <div className="text-sm text-muted-foreground">…</div>
        ) : r.total === 0 ? (
          <Badge variant="outline" className="text-[10px]">No data</Badge>
        ) : (
          <div className="text-xl font-semibold">{Math.round(r.rate * 100)}%</div>
        )}
      </CardContent>
    </Card>
  );
}
