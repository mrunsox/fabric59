import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HeartPulse, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { PremiumStatCard } from "@/components/ui/premium-stat-card";
import { useFive9Health, useFive9EventLog } from "@/hooks/useFive9Overlay";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props { clientId?: string; }

export default function Five9HealthPanel({ clientId }: Props) {
  const { data: health, isLoading } = useFive9Health(clientId);
  const { data: events } = useFive9EventLog({ client_id: clientId, limit: 25 });

  const handleReplay = async (id: string) => {
    const { data: row } = await supabase.from("five9_event_log").select("raw_payload, resolved_client_id, resolved_provider").eq("id", id).single();
    if (!row) return;
    await supabase.functions.invoke("five9-overlay-test", {
      body: { raw_payload: row.raw_payload, target_client_id: row.resolved_client_id, target_provider: row.resolved_provider },
    });
    toast.success("Event replayed (dry-run). Check simulation results.");
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <PremiumStatCard title="Events 24h" value={health?.total_24h ?? 0} icon={HeartPulse} variant="primary" />
        <PremiumStatCard title="Completed" value={health?.completed_24h ?? 0} icon={CheckCircle2} variant="success" />
        <PremiumStatCard title="Failed" value={health?.failed_24h ?? 0} icon={AlertTriangle} variant={(health?.failed_24h ?? 0) > 0 ? "destructive" : "default"} />
        <PremiumStatCard title="In Review" value={health?.review_queued_24h ?? 0} icon={Clock} variant={(health?.review_queued_24h ?? 0) > 0 ? "warning" : "default"} />
      </div>

      {(health?.recent_errors ?? []).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base text-destructive">Recent Errors</CardTitle></CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              {health?.recent_errors.map((e, i) => <li key={i} className="font-mono text-xs">{e}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Five9 Events</CardTitle>
          <CardDescription>Last event: {health?.last_event_at ? formatDistanceToNow(new Date(health.last_event_at), { addSuffix: true }) : "never"}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Domain / Campaign</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>}
              {!isLoading && (events ?? []).length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No Five9 events yet</TableCell></TableRow>
              )}
              {(events ?? []).map((e: any) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{e.event_type}</Badge></TableCell>
                  <TableCell className="text-xs">{[e.five9_domain, e.campaign_name].filter(Boolean).join(" · ")}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs capitalize">{e.resolved_provider ?? "—"}</Badge></TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${e.status === "completed" ? "bg-success/15 text-success border-success/30" : e.status === "failed" ? "bg-destructive/15 text-destructive border-destructive/30" : e.status === "review_queued" ? "bg-warning/15 text-warning border-warning/30" : ""}`}>
                      {e.status}
                    </Badge>
                  </TableCell>
                  <TableCell><Button size="sm" variant="ghost" onClick={() => handleReplay(e.id)}>Replay</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
