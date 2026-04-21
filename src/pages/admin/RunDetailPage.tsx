import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface RunData {
  id: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  error: string | null;
  payload: unknown;
  deployment_id: string;
}

export default function RunDetailPage() {
  const { id } = useParams();
  const [run, setRun] = useState<RunData | null>(null);

  useEffect(() => {
    if (!id) return;
    supabase.from("deployment_runs").select("*").eq("id", id).maybeSingle().then(({ data }) => setRun(data as RunData));
  }, [id]);

  if (!run) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Run detail</h1>
        <Badge variant={run.status === "success" ? "default" : run.status === "failed" ? "destructive" : "secondary"}>{run.status}</Badge>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Timeline</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="text-muted-foreground">Started:</span> {new Date(run.started_at).toLocaleString()}</p>
          {run.finished_at && <p><span className="text-muted-foreground">Finished:</span> {new Date(run.finished_at).toLocaleString()}</p>}
          {run.error && <p className="text-destructive">Error: {run.error}</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Payload</CardTitle></CardHeader>
        <CardContent>
          <pre className="text-xs bg-secondary/30 p-4 rounded-lg overflow-auto max-h-96">{JSON.stringify(run.payload, null, 2)}</pre>
        </CardContent>
      </Card>
    </div>
  );
}
