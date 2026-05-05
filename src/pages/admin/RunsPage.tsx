import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, RotateCw, AlertTriangle, ShieldAlert, HelpCircle, Search, X, Link2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { classifyError, type RetryClass } from "@/lib/flow-runner/retry-classification";

const CLASS_META: Record<RetryClass, { label: string; tone: string; Icon: typeof AlertTriangle }> = {
  retriable: { label: "Retriable", tone: "border-amber-500/40 bg-amber-500/10 text-amber-700", Icon: AlertTriangle },
  non_retriable: { label: "Non-retriable", tone: "border-destructive/40 bg-destructive/10 text-destructive", Icon: ShieldAlert },
  unknown: { label: "Unknown", tone: "border-border bg-secondary/40 text-muted-foreground", Icon: HelpCircle },
};

interface Run {
  id: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  error: string | null;
  deployment_id: string;
  retry_of: string | null;
  external_record_id: string | null;
  idempotency_key: string | null;
}

export default function RunsPage() {
  const { organization } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [depFilter, setDepFilter] = useState("all");
  const [retrying, setRetrying] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data: runs = [] } = useQuery({
    queryKey: ["runs", organization?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("deployment_runs")
        .select("id, status, started_at, finished_at, error, deployment_id, retry_of, external_record_id, idempotency_key")
        .eq("organization_id", organization!.id)
        .order("started_at", { ascending: false })
        .limit(200);
      return (data || []) as Run[];
    },
    enabled: !!organization,
  });

  const deployments = useMemo(() => Array.from(new Set(runs.map((r) => r.deployment_id))), [runs]);
  const q = search.trim().toLowerCase();
  const filtered = runs.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (depFilter !== "all" && r.deployment_id !== depFilter) return false;
    if (q) {
      const hay = [r.idempotency_key, r.retry_of, r.id, r.external_record_id]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  // Group related runs: a run is "related" if it shares idempotency_key OR is in a retry_of chain
  const relatedGroupId = (r: Run) => r.idempotency_key || r.retry_of || r.id;
  const groupCounts = useMemo(() => {
    const m = new Map<string, number>();
    runs.forEach((r) => {
      const k = relatedGroupId(r);
      m.set(k, (m.get(k) || 0) + 1);
    });
    return m;
  }, [runs]);

  const retry = async (runId: string) => {
    setRetrying(runId);
    try {
      const { data, error } = await supabase.functions.invoke("flow-runner", {
        body: { retry_of: runId },
      });
      if (error) throw error;
      toast.success(`Replayed (run ${(data as { run_id?: string })?.run_id?.slice(0, 8) ?? ""})`);
      qc.invalidateQueries({ queryKey: ["runs"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRetrying(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Activity className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Runs</h1>
          <p className="text-sm text-muted-foreground mt-1">Execution history with retry and replay</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by idempotency key, retry_of, run id, external id…"
            className="pl-8 pr-8"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["all", "running", "succeeded", "failed", "skipped"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={depFilter} onValueChange={setDepFilter}>
          <SelectTrigger className="w-[260px]"><SelectValue placeholder="Deployment" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All deployments</SelectItem>
            {deployments.map((d) => <SelectItem key={d} value={d}>{d.slice(0, 8)}…</SelectItem>)}
          </SelectContent>
        </Select>
        {q && (
          <span className="text-xs text-muted-foreground">
            {filtered.length} of {runs.length} match
          </span>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Deployment runs</CardTitle></CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="px-6 py-4 text-sm text-muted-foreground">No runs match.</p>
          ) : (
            <ul className="divide-y divide-border/40">
              {filtered.map((r) => {
                const verdict = r.status === "failed" ? classifyError(r.error) : null;
                const meta = verdict ? CLASS_META[verdict.cls] : null;
                const retryDisabled = retrying === r.id || verdict?.cls === "non_retriable";
                return (
                  <li key={r.id} className="px-6 py-3 flex items-center justify-between gap-4">
                    <div className="flex-1 cursor-pointer min-w-0" onClick={() => navigate(`/admin/runs/${r.id}`)}>
                      <p className="text-sm font-medium">{new Date(r.started_at).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        Dep {r.deployment_id.slice(0, 8)}…
                        {r.retry_of ? ` · retry of ${r.retry_of.slice(0, 8)}…` : ""}
                        {r.external_record_id ? ` · ext ${r.external_record_id}` : ""}
                      </p>
                      {r.error && (
                        <div className="mt-1 flex items-start gap-2">
                          {meta && (
                            <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${meta.tone}`}>
                              <meta.Icon className="h-3 w-3" />
                              {meta.label}
                              {verdict?.status ? ` · ${verdict.status}` : ""}
                            </span>
                          )}
                          <p className="text-xs text-destructive flex-1 truncate" title={r.error}>{r.error}</p>
                        </div>
                      )}
                    </div>
                    <Badge variant={r.status === "succeeded" ? "default" : r.status === "failed" ? "destructive" : "secondary"}>{r.status}</Badge>
                    {(r.status === "failed" || r.status === "succeeded") && (
                      <TooltipProvider delayDuration={150}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={retryDisabled}
                                onClick={() => retry(r.id)}
                              >
                                <RotateCw className={`h-3.5 w-3.5 mr-1 ${retrying === r.id ? "animate-spin" : ""}`} /> Retry
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-xs text-xs">
                            {verdict?.reason ?? "Replay this run with the same idempotency key."}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
