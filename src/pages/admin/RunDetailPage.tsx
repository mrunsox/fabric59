import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RotateCw, Copy, Check, AlertTriangle, ShieldAlert, HelpCircle, Download, FileJson, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { classifyError, type RetryClass } from "@/lib/flow-runner/retry-classification";
import { fetchRunReport, reportToCsv, downloadFile } from "@/lib/flow-runner/run-report";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CLASS_META: Record<RetryClass, { label: string; tone: string; Icon: typeof AlertTriangle }> = {
  retriable: { label: "Retriable", tone: "border-amber-500/40 bg-amber-500/10 text-amber-700", Icon: AlertTriangle },
  non_retriable: { label: "Non-retriable", tone: "border-destructive/40 bg-destructive/10 text-destructive", Icon: ShieldAlert },
  unknown: { label: "Unknown", tone: "border-border bg-secondary/40 text-muted-foreground", Icon: HelpCircle },
};

interface RunData {
  id: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  error: string | null;
  payload: unknown;
  request_payload: unknown;
  response_payload: unknown;
  deployment_id: string;
  source_event_id: string | null;
  source_event_type: string | null;
  external_record_id: string | null;
  idempotency_key: string | null;
  retry_of: string | null;
}

export default function RunDetailPage() {
  const { id } = useParams();
  const [run, setRun] = useState<RunData | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [copied, setCopied] = useState<"idem" | "ext" | null>(null);
  const [exporting, setExporting] = useState(false);

  const copyValue = async (value: string, kind: "idem" | "ext", label: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(kind);
    toast.success(`${label} copied`);
    setTimeout(() => setCopied(null), 1500);
  };

  const copyKey = () => run?.idempotency_key && copyValue(run.idempotency_key, "idem", "Idempotency key");
  const copyExt = () => run?.external_record_id && copyValue(run.external_record_id, "ext", "External record id");

  const exportReport = async (format: "json" | "csv") => {
    if (!run) return;
    setExporting(true);
    try {
      const report = await fetchRunReport(run.id);
      const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const base = `run-report-${run.id.slice(0, 8)}-${stamp}`;
      if (format === "json") {
        downloadFile(`${base}.json`, JSON.stringify(report, null, 2), "application/json");
      } else {
        downloadFile(`${base}.csv`, reportToCsv(report), "text/csv");
      }
      toast.success(`Run report exported (${report.total_runs} run${report.total_runs === 1 ? "" : "s"})`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    supabase.from("deployment_runs").select("*").eq("id", id).maybeSingle().then(({ data }) => setRun(data as RunData));
  }, [id]);

  const retry = async () => {
    if (!run) return;
    setRetrying(true);
    try {
      const { error } = await supabase.functions.invoke("flow-runner", { body: { retry_of: run.id } });
      if (error) throw error;
      toast.success("Replay queued");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRetrying(false);
    }
  };

  if (!run) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Run detail</h1>
        <div className="flex items-center gap-2">
          <Badge variant={run.status === "succeeded" ? "default" : run.status === "failed" ? "destructive" : "secondary"}>{run.status}</Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" disabled={exporting}>
                {exporting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1" />}
                Run report
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => exportReport("json")}>
                <FileJson className="h-3.5 w-3.5 mr-2" /> Download JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportReport("csv")}>
                <FileSpreadsheet className="h-3.5 w-3.5 mr-2" /> Download CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" variant="outline" onClick={retry} disabled={retrying}>
            <RotateCw className={`h-3.5 w-3.5 mr-1 ${retrying ? "animate-spin" : ""}`} /> Replay
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Metadata</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 text-sm">
          <p><span className="text-muted-foreground">Started:</span> {new Date(run.started_at).toLocaleString()}</p>
          {run.finished_at && <p><span className="text-muted-foreground">Finished:</span> {new Date(run.finished_at).toLocaleString()}</p>}
          {run.source_event_type && <p><span className="text-muted-foreground">Source:</span> {run.source_event_type}</p>}
          {run.source_event_id && <p><span className="text-muted-foreground">Event id:</span> {run.source_event_id}</p>}
          {run.idempotency_key && (
            <div className="col-span-2 flex items-center gap-2 rounded-md border border-border/60 bg-secondary/20 px-3 py-2">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Idempotency key</span>
              <code className="flex-1 font-mono text-xs break-all">{run.idempotency_key}</code>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={copyKey}>
                {copied === "idem" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span className="ml-1 text-xs">{copied === "idem" ? "Copied" : "Copy"}</span>
              </Button>
            </div>
          )}
          {run.external_record_id && (
            <div className="col-span-2 flex items-center gap-2 rounded-md border border-border/60 bg-secondary/20 px-3 py-2">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">External record</span>
              <code className="flex-1 font-mono text-xs break-all">{run.external_record_id}</code>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={copyExt}>
                {copied === "ext" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span className="ml-1 text-xs">{copied === "ext" ? "Copied" : "Copy"}</span>
              </Button>
            </div>
          )}
          {run.retry_of && <p><span className="text-muted-foreground">Retry of:</span> {run.retry_of}</p>}
          {run.error && (() => {
            const verdict = classifyError(run.error);
            const meta = CLASS_META[verdict.cls];
            return (
              <div className="col-span-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${meta.tone}`}>
                    <meta.Icon className="h-3.5 w-3.5" />
                    {meta.label}
                    {verdict.status ? ` · ${verdict.status}` : ""}
                  </span>
                  <span className="text-xs text-muted-foreground">{verdict.reason}</span>
                </div>
                <p className="text-xs text-destructive font-mono break-all">{run.error}</p>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Request</CardTitle></CardHeader>
          <CardContent>
            <pre className="text-xs bg-secondary/30 p-4 rounded-lg overflow-auto max-h-96">{JSON.stringify(run.request_payload ?? run.payload, null, 2)}</pre>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Response</CardTitle></CardHeader>
          <CardContent>
            <pre className="text-xs bg-secondary/30 p-4 rounded-lg overflow-auto max-h-96">{JSON.stringify(run.response_payload, null, 2)}</pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
