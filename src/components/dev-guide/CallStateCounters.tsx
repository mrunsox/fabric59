import { useEffect, useState, useCallback, forwardRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity, PhoneCall, PhoneOff, ClipboardCheck, CheckCircle2, RefreshCw } from "lucide-react";

type StateKey = "connected" | "ended" | "acw" | "disposed";

const STATES: { key: StateKey; label: string; match: string[]; icon: typeof PhoneCall; tone: string }[] = [
  { key: "connected", label: "Connected", match: ["connected", "in_progress", "active"], icon: PhoneCall, tone: "text-emerald-600 bg-emerald-500/10 border-emerald-500/30" },
  { key: "ended", label: "Ended", match: ["ended"], icon: PhoneOff, tone: "text-amber-600 bg-amber-500/10 border-amber-500/30" },
  { key: "acw", label: "ACW (Wrap-up)", match: ["acw", "wrap_up", "wrapup"], icon: ClipboardCheck, tone: "text-sky-600 bg-sky-500/10 border-sky-500/30" },
  { key: "disposed", label: "Disposed", match: ["disposed", "closed", "completed"], icon: CheckCircle2, tone: "text-violet-600 bg-violet-500/10 border-violet-500/30" },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export const CallStateCounters = forwardRef<HTMLDivElement>(function CallStateCounters(_props, ref) {
  const [counts, setCounts] = useState<Record<StateKey, number>>({ connected: 0, ended: 0, acw: 0, disposed: 0 });
  const [other, setOther] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await db
        .from("call_sessions")
        .select("status")
        .limit(10000);
      if (error) throw error;
      const next: Record<StateKey, number> = { connected: 0, ended: 0, acw: 0, disposed: 0 };
      const otherMap: Record<string, number> = {};
      for (const row of (data ?? []) as { status: string | null }[]) {
        const s = (row.status ?? "").toLowerCase();
        const bucket = STATES.find((b) => b.match.includes(s));
        if (bucket) next[bucket.key]++;
        else if (s) otherMap[s] = (otherMap[s] ?? 0) + 1;
      }
      setCounts(next);
      setOther(otherMap);
      setUpdatedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("call-flow-counters")
      .on("postgres_changes", { event: "*", schema: "public", table: "call_sessions" }, () => load())
      .subscribe();
    const interval = setInterval(load, 30_000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [load]);

  const total = counts.connected + counts.ended + counts.acw + counts.disposed;

  return (
    <div ref={ref} className="rounded-lg border border-border/60 bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Live call session counters</h3>
          <span className="text-xs text-muted-foreground">Realtime from <code>call_sessions.status</code></span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>Total tracked: <span className="text-foreground font-medium tabular-nums">{total}</span></span>
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
}
