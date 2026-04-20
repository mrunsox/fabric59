import { useFive9EventLog } from "@/hooks/useFive9Overlay";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Props {
  clientId: string;
  campaignRouteId?: string;
}

export default function CampaignHealthPanel({ clientId, campaignRouteId }: Props) {
  const { data: events, isLoading } = useFive9EventLog({ client_id: clientId });

  // Filter to events tagged with this campaign route if column populated.
  const filtered = ((events ?? []) as any[]).filter((e) =>
    campaignRouteId ? e.matched_route_id === campaignRouteId || !e.matched_route_id : true,
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Campaign Event Log</CardTitle>
        </div>
        <CardDescription>
          Events scoped to this campaign route. Connection-level health lives under Client → Legal
          Connect → Health.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 rounded bg-muted animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No events yet — run a test from the Simulation tab to generate activity.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-foreground/80 font-medium">When</TableHead>
                  <TableHead className="text-foreground/80 font-medium">Event</TableHead>
                  <TableHead className="text-foreground/80 font-medium">Status</TableHead>
                  <TableHead className="text-foreground/80 font-medium">Correlation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 50).map((e) => (
                  <TableRow key={e.id} className="border-border">
                    <TableCell className="text-foreground text-sm whitespace-nowrap">
                      {e.created_at
                        ? formatDistanceToNow(new Date(e.created_at), { addSuffix: true })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-foreground font-mono text-xs">
                      {e.event_type ?? "unknown"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          e.status === "success" || e.status === "ok"
                            ? "default"
                            : e.status === "error" || e.status === "failed"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {e.status ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs truncate max-w-[200px]">
                      {e.correlation_id ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
