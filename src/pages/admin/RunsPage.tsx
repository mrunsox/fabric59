import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, RotateCw } from "lucide-react";
import { toast } from "sonner";

interface Run {
  id: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  error: string | null;
  deployment_id: string;
  retry_of: string | null;
  external_record_id: string | null;
}

export default function RunsPage() {
  const { organization } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [depFilter, setDepFilter] = useState("all");
  const [retrying, setRetrying] = useState<string | null>(null);

  const { data: runs = [] } = useQuery({
    queryKey: ["runs", organization?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("deployment_runs")
        .select("id, status, started_at, finished_at, error, deployment_id, retry_of, external_record_id")
        .eq("organization_id", organization!.id)
        .order("started_at", { ascending: false })
        .limit(200);
      return (data || []) as Run[];
    },
    enabled: !!organization,
  });

  const deployments = useMemo(() => Array.from(new Set(runs.map((r) => r.deployment_id))), [runs]);
  const filtered = runs.filter((r) =>
    (statusFilter === "all" || r.status === statusFilter) &&
    (depFilter === "all" || r.deployment_id === depFilter)
  );

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

      <div className="flex flex-wrap gap-2">
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
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Deployment runs</CardTitle></CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="px-6 py-4 text-sm text-muted-foreground">No runs match.</p>
          ) : (
            <ul className="divide-y divide-border/40">
              {filtered.map((r) => (
                <li key={r.id} className="px-6 py-3 flex items-center justify-between gap-4">
                  <div className="flex-1 cursor-pointer" onClick={() => navigate(`/admin/runs/${r.id}`)}>
                    <p className="text-sm font-medium">{new Date(r.started_at).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      Dep {r.deployment_id.slice(0, 8)}…
                      {r.retry_of ? ` · retry of ${r.retry_of.slice(0, 8)}…` : ""}
                      {r.external_record_id ? ` · ext ${r.external_record_id}` : ""}
                    </p>
                    {r.error && <p className="text-xs text-destructive mt-0.5">{r.error}</p>}
                  </div>
                  <Badge variant={r.status === "succeeded" ? "default" : r.status === "failed" ? "destructive" : "secondary"}>{r.status}</Badge>
                  {(r.status === "failed" || r.status === "succeeded") && (
                    <Button size="sm" variant="ghost" disabled={retrying === r.id} onClick={() => retry(r.id)}>
                      <RotateCw className={`h-3.5 w-3.5 mr-1 ${retrying === r.id ? "animate-spin" : ""}`} /> Retry
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
