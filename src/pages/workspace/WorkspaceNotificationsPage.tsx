import { Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { useNotifications, useNotificationStats } from "@/hooks/useNotifications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Phase D: PostCallAutomationsContent is mounted here as the canonical
// "Post-call rules" tab. The legacy /admin/automations route silent-redirects
// to /w/:workspaceId/notifications and the standalone admin page file is
// retained only as a re-export of this same component.
import { PostCallAutomationsContent } from "@/pages/admin/PostCallAutomationsPage";

/**
 * Canonical workspace Notifications surface.
 *
 * Combines the org-scoped notification log (`notifications`) with the
 * post-call automation rule editor (`post_call_automations`) so operators
 * can manage triggers and inspect deliveries in one place.
 */
export default function WorkspaceNotificationsPage() {
  const { organization } = useAuth();
  const { data: log = [], isLoading } = useNotifications(organization?.id);
  const { data: stats } = useNotificationStats();

  return (
    <div className="space-y-6">
      <WorkspacePageHeader
        eyebrow="Operate"
        title="Notifications"
        lede="Inspect deliveries (log) or edit the rules that produce them (config)."
      />

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile label="Total" value={stats.total} />
          <StatTile label="Last 24h" value={stats.last24h} />
          <StatTile label="Sent" value={stats.sent} />
          <StatTile label="Failed" value={stats.failed} tone="destructive" />
        </div>
      )}

      <Tabs defaultValue="deliveries" className="space-y-4">
        <TabsList>
          <TabsTrigger value="deliveries">Log — Deliveries</TabsTrigger>
          <TabsTrigger value="rules">Config — Post-call rules</TabsTrigger>
        </TabsList>

        <TabsContent value="deliveries">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Recent deliveries{" "}
                <span className="text-muted-foreground font-normal">
                  ({log.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-sm text-muted-foreground py-6">Loading…</div>
              ) : log.length === 0 ? (
                <EmptyState
                  icon={Bell}
                  title="No notifications delivered yet"
                  description="Notifications produced by post-call rules will appear here."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Channel</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Trigger</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                      <TableHead className="w-40">Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {log.slice(0, 50).map((n) => (
                      <TableRow key={n.id}>
                        <TableCell>
                          <Badge variant="outline" className="font-normal">
                            {n.channel}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{n.recipient}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {n.trigger_event}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              n.status === "sent"
                                ? "default"
                                : n.status === "failed"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {n.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {new Date(n.created_at).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules">
          <PostCallAutomationsContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "destructive";
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p
          className={`text-2xl font-semibold tabular-nums ${
            tone === "destructive" ? "text-destructive" : "text-foreground"
          }`}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
