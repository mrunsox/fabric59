import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RotateCw, Copy, Check } from "lucide-react";
import { toast } from "sonner";

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
  const [copied, setCopied] = useState(false);

  const copyKey = async () => {
    if (!run?.idempotency_key) return;
    await navigator.clipboard.writeText(run.idempotency_key);
    setCopied(true);
    toast.success("Idempotency key copied");
    setTimeout(() => setCopied(false), 1500);
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
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span className="ml-1 text-xs">{copied ? "Copied" : "Copy"}</span>
              </Button>
            </div>
          )}
          {run.external_record_id && <p><span className="text-muted-foreground">External record:</span> {run.external_record_id}</p>}
          {run.retry_of && <p><span className="text-muted-foreground">Retry of:</span> {run.retry_of}</p>}
          {run.error && <p className="col-span-2 text-destructive">Error: {run.error}</p>}
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
