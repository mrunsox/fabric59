import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";

export default function RunsPage() {
  const { organization } = useAuth();
  const navigate = useNavigate();

  const { data: runs = [] } = useQuery({
    queryKey: ["runs", organization?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("deployment_runs")
        .select("id, status, started_at, finished_at, error, deployment_id")
        .eq("organization_id", organization!.id)
        .order("started_at", { ascending: false })
        .limit(100);
      return data || [];
    },
    enabled: !!organization,
  });

  const { data: events = [] } = useQuery({
    queryKey: ["recent-events", organization?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("five9_event_log")
        .select("id, event_type, status, created_at, campaign_name, error")
        .eq("organization_id", organization!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!organization,
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Activity className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Runs</h1>
          <p className="text-sm text-muted-foreground mt-1">Execution history for deployments and Five9 events</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Deployment runs</CardTitle></CardHeader>
        <CardContent className="p-0">
          {runs.length === 0 ? (
            <p className="px-6 py-4 text-sm text-muted-foreground">No deployment runs yet.</p>
          ) : (
            <ul className="divide-y divide-border/40">
              {runs.map((r) => (
                <li key={r.id} className="px-6 py-3 flex items-center justify-between cursor-pointer hover:bg-secondary/20" onClick={() => navigate(`/admin/runs/${r.id}`)}>
                  <div>
                    <p className="text-sm font-medium">{new Date(r.started_at).toLocaleString()}</p>
                    {r.error && <p className="text-xs text-destructive mt-0.5">{r.error}</p>}
                  </div>
                  <Badge variant={r.status === "success" ? "default" : r.status === "failed" ? "destructive" : "secondary"}>{r.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent Five9 events</CardTitle></CardHeader>
        <CardContent className="p-0">
          {events.length === 0 ? (
            <p className="px-6 py-4 text-sm text-muted-foreground">No Five9 events yet.</p>
          ) : (
            <ul className="divide-y divide-border/40">
              {events.map((e) => (
                <li key={e.id} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{e.event_type} · {e.campaign_name || "—"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{new Date(e.created_at).toLocaleString()}</p>
                  </div>
                  <Badge variant={e.status === "processed" ? "default" : e.status === "failed" ? "destructive" : "secondary"}>{e.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
