import { Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { useNotifications, useNotificationStats } from "@/hooks/useNotifications";
import { usePostCallAutomations } from "@/hooks/usePostCallAutomations";
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

/**
 * Canonical workspace Notifications surface.
 *
 * Bridges the org-scoped notification log (`notifications`) with the
 * post-call automation rules (`post_call_automations`) so operators can see
 * both the live delivery feed and the rules that fired them in one place.
 */
export default function WorkspaceNotificationsPage() {
  const { organization } = useAuth();
  const { data: log = [], isLoading } = useNotifications(organization?.id);
  const { data: stats } = useNotificationStats();
  const { data: rules = [] } = usePostCallAutomations();

  return (
    <div className="space-y-6">
      <WorkspacePageHeader
        eyebrow="Operate"
        title="Notifications"
        lede="Outbound notifications and the post-call automation rules that produced them."
      />

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile label="Total" value={stats.total} />
          <StatTile label="Last 24h" value={stats.last24h} />
          <StatTile label="Sent" value={stats.sent} />
          <StatTile label="Failed" value={stats.failed} tone="destructive" />
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            Automation rules{" "}
            <span className="text-muted-foreground font-normal">
              ({rules.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="No automation rules yet"
              description="Create post-call automation rules to send notifications when a disposition fires."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Disposition</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.disposition_match}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {r.action_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.enabled ? "default" : "secondary"}>
                        {r.enabled ? "Enabled" : "Paused"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            Recent deliveries{" "}
            <span className="text-muted-foreground font-normal">({log.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground py-6">Loading…</div>
          ) : log.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              No notifications delivered yet.
            </p>
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
                        variant={n.status === "sent" ? "default" : n.status === "failed" ? "destructive" : "secondary"}
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
