import { useEffect, useState, useCallback, forwardRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenants } from "@/hooks/useTenants";
import {
  Activity,
  PhoneCall,
  PhoneOff,
  ClipboardCheck,
  CheckCircle2,
  RefreshCw,
  Clock,
  AlertTriangle,
} from "lucide-react";

type StateKey =
  | "active"
  | "queued"
  | "ended"
  | "acw"
  | "completed"
  | "failed";

const STATES: {
  key: StateKey;
  label: string;
  match: string[];
  icon: typeof PhoneCall;
  tone: string;
}[] = [
  { key: "active", label: "Active / Connected", match: ["connected", "in_progress", "active", "live"], icon: PhoneCall, tone: "text-emerald-600 bg-emerald-500/10 border-emerald-500/30" },
  { key: "queued", label: "Queued / Routing", match: ["queued", "routing", "ringing", "incoming"], icon: Clock, tone: "text-sky-600 bg-sky-500/10 border-sky-500/30" },
  { key: "ended", label: "Ended", match: ["ended"], icon: PhoneOff, tone: "text-amber-600 bg-amber-500/10 border-amber-500/30" },
  { key: "acw", label: "ACW (Wrap-up)", match: ["acw", "wrap_up", "wrapup"], icon: ClipboardCheck, tone: "text-indigo-600 bg-indigo-500/10 border-indigo-500/30" },
  { key: "completed", label: "Completed / Disposed", match: ["disposed", "closed", "completed"], icon: CheckCircle2, tone: "text-violet-600 bg-violet-500/10 border-violet-500/30" },
  { key: "failed", label: "Failed / Abandoned", match: ["failed", "abandoned", "error", "dropped"], icon: AlertTriangle, tone: "text-rose-600 bg-rose-500/10 border-rose-500/30" },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type Row = { status: string | null; tenant_id: string | null };

export const CallStateCounters = forwardRef<HTMLDivElement>(function CallStateCounters(_props, ref) {
  const { data: tenants = [] } = useTenants();
  const [tenantFilter, setTenantFilter] = useState<string>("all");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let q = db.from("call_sessions").select("status, tenant_id").limit(10000);
      if (tenantFilter !== "all") q = q.eq("tenant_id", tenantFilter);
      const { data, error } = await q;
      if (error) throw error;
      setRows((data ?? []) as Row[]);
      setUpdatedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [tenantFilter]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`call-flow-counters-${tenantFilter}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "call_sessions" },
        () => load(),
      )
      .subscribe();
    const interval = setInterval(load, 30_000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [load, tenantFilter]);

  const { counts, other, total } = useMemo(() => {
    const next = STATES.reduce<Record<StateKey, number>>((acc, s) => {
      acc[s.key] = 0;
      return acc;
    }, {} as Record<StateKey, number>);
    const otherMap: Record<string, number> = {};
    for (const r of rows) {
      const s = (r.status ?? "").toLowerCase().trim();
      const bucket = STATES.find((b) => b.match.includes(s));
      if (bucket) next[bucket.key]++;
      else if (s) otherMap[s] = (otherMap[s] ?? 0) + 1;
    }
    return { counts: next, other: otherMap, total: rows.length };
  }, [rows]);

  return (
    <div ref={ref} className="rounded-lg border border-border/60 bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Live call session counters</h3>
          <span className="text-xs text-muted-foreground">
            From <code>call_sessions</code> · Five9 telemetry
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <select
            value={tenantFilter}
            onChange={(e) => setTenantFilter(e.target.value)}
            className="rounded border border-border/60 bg-background px-2 py-1 text-xs focus:border-primary/40 focus:outline-none"
            aria-label="Filter by tenant"
          >
            <option value="all">All tenants</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          {updatedAt && <span>Updated {updatedAt.toLocaleTimeString()}</span>}
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1 rounded border border-border/60 bg-background px-2 py-1 hover:border-primary/40 disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {STATES.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.key} className="rounded-md border border-border/60 bg-background p-3">
              <div className="flex items-center justify-between mb-2">
                <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md border ${s.tone}`}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.key}</span>
              </div>
              <div className="text-2xl font-semibold text-foreground tabular-nums">{counts[s.key]}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
        <span>
          Total tracked: <span className="text-foreground font-medium tabular-nums">{total}</span>
          {tenantFilter !== "all" && (
            <span className="ml-2 opacity-70">
              (tenant: {tenants.find((t) => t.id === tenantFilter)?.name ?? tenantFilter})
            </span>
          )}
        </span>
        {Object.keys(other).length > 0 && (
          <span className="truncate">
            Other states:{" "}
            {Object.entries(other).map(([k, v]) => (
              <span key={k} className="ml-1 font-mono text-[11px]">{k}={v}</span>
            ))}
          </span>
        )}
      </div>
    </div>
  );
});
CallStateCounters.displayName = "CallStateCounters";
