import { useMemo } from "react";
import { useNotifications, useNotificationStats } from "@/hooks/useNotifications";
import { useTenants } from "@/hooks/useTenants";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Bell, CheckCircle2, XCircle, Activity } from "lucide-react";
import { format } from "date-fns";

/**
 * Phase 5 — Canonical /org/notifications.
 *
 * Read-only org notifications log. The notifications table holds outbound
 * delivery records (Slack/email/etc.) keyed by client. Preferences and routing
 * are owned by the integrations layer and dispositions; we deliberately do not
 * render dead toggles here.
 */
export default function OrgNotificationsPage() {
  const { data: stats } = useNotificationStats();
  const { data: notifications = [], isLoading } = useNotifications();
  const { data: tenants = [] } = useTenants();

  const tenantName = useMemo(() => {
    const m = new Map(tenants.map((t) => [t.id, t.name] as const));
    return (id: string) => m.get(id) ?? "—";
  }, [tenants]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8 animate-fade-in">
      <OrgPageHeader
        eyebrow="Organization"
        title="Notifications"
        lede="Recent outbound notification deliveries across the organization. Channel routing and preferences live with the relevant connector and disposition."
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Total" value={stats?.total ?? 0} icon={Bell} />
        <Stat label="Sent" value={stats?.sent ?? 0} icon={CheckCircle2} tone="success" />
        <Stat label="Failed" value={stats?.failed ?? 0} icon={XCircle} tone={stats?.failed ? "danger" : undefined} />
        <Stat label="Last 24h" value={stats?.last24h ?? 0} icon={Activity} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
          ) : notifications.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="No notifications yet"
              description="When a workflow or integration sends a notification, it will appear here."
            />
          ) : (
            <div className="divide-y divide-border/60">
              {notifications.slice(0, 50).map((n) => (
                <div key={n.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      <span className="capitalize">{n.channel}</span>
                      <span className="text-muted-foreground"> · </span>
                      <span className="capitalize">{n.trigger_event.replace(/_/g, " ")}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {tenantName(n.tenant_id)} · {n.recipient}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge status={n.status} />
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {format(new Date(n.created_at), "MMM d, HH:mm")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "success" | "danger";
}) {
  const toneClass =
    tone === "success" ? "text-success" : tone === "danger" ? "text-destructive" : "text-foreground";
  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
          <Icon className={`h-3.5 w-3.5 ${toneClass}`} />
          <span>{label}</span>
        </div>
        <p className={`text-2xl font-semibold mt-1 tabular-nums ${toneClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
