import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, AlertTriangle, CheckCircle2, RefreshCw, BellRing } from "lucide-react";
import {
  useAckAlert,
  useEvaluateAlerts,
  useLegalConnectHealth,
  type LegalConnectAlert,
  type TenantHealth,
} from "@/hooks/useLegalConnectHealth";
import { cn } from "@/lib/utils";

const SEVERITY: Record<LegalConnectAlert["severity"], string> = {
  info: "border-border text-muted-foreground",
  warning: "border-warning/40 text-warning bg-warning/10",
  critical: "border-destructive/40 text-destructive bg-destructive/10",
};

function HealthRow({ h }: { h: TenantHealth }) {
  const successCls =
    h.success_rate_24h === null
      ? "text-muted-foreground"
      : h.success_rate_24h >= 95
      ? "text-success"
      : h.success_rate_24h >= 70
      ? "text-warning"
      : "text-destructive";
  return (
    <tr className="border-t border-border/40">
      <td className="p-2">
        <div className="font-medium text-sm">{h.client_name}</div>
        <div className="text-[10px] text-muted-foreground capitalize">
          {h.rollout_status.replace(/_/g, " ")} · {h.readiness_state.replace(/_/g, " ")}
        </div>
      </td>
      <td className="p-2 text-xs">{h.jobs_24h} <span className="text-muted-foreground">/ {h.jobs_7d} 7d</span></td>
      <td className={cn("p-2 text-xs font-medium", successCls)}>
        {h.success_rate_24h === null ? "—" : `${h.success_rate_24h}%`}
        <div className="text-[10px] text-muted-foreground font-normal">
          {h.succeeded_24h} ok · {h.failed_24h} fail
        </div>
      </td>
      <td className="p-2 text-xs">
        {h.rate_limited_24h > 0 ? (
          <Badge variant="outline" className="border-warning/40 text-warning bg-warning/10 text-[10px]">
            {h.rate_limited_24h} hits
          </Badge>
        ) : (
          <span className="text-muted-foreground">0</span>
        )}
        <div className="text-[10px] text-muted-foreground mt-0.5">
          {h.limits.max_jobs_per_minute}/m · {h.limits.max_jobs_per_hour}/h
        </div>
      </td>
      <td className="p-2 text-xs">
        {h.top_error_class ? (
          <Badge variant="outline" className="border-destructive/30 text-destructive text-[10px]">
            {h.top_error_class.kind} ×{h.top_error_class.count}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="p-2 text-xs">
        {h.open_alerts > 0 ? (
          <Badge variant="outline" className="border-destructive/40 text-destructive bg-destructive/10 text-[10px]">
            <BellRing className="h-3 w-3 mr-1" /> {h.open_alerts}
          </Badge>
        ) : (
          <Badge variant="outline" className="border-success/30 text-success text-[10px]">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Clear
          </Badge>
        )}
      </td>
    </tr>
  );
}

export default function TenantHealthPanel({ organizationId }: { organizationId?: string | null }) {
  const { data, isLoading, refetch } = useLegalConnectHealth(organizationId);
  const evalMut = useEvaluateAlerts(organizationId);
  const ackMut = useAckAlert(organizationId);

  const health = data?.health ?? [];
  const alerts = data?.alerts ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" /> Tenant health (24h)
              </CardTitle>
              <CardDescription className="text-xs">
                Per-tenant Legal Connect job stats and alert state for design partners.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isLoading}>
                <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isLoading && "animate-spin")} />
                Refresh
              </Button>
              <Button size="sm" onClick={() => evalMut.mutate()} disabled={evalMut.isPending}>
                Evaluate alerts
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {health.length === 0 ? (
            <p className="text-xs text-muted-foreground">No design-partner tenants yet.</p>
          ) : (
            <div className="overflow-hidden rounded-md border border-border/60">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-muted-foreground text-[11px]">
                  <tr>
                    <th className="text-left p-2 font-medium">Client</th>
                    <th className="text-left p-2 font-medium">Jobs 24h</th>
                    <th className="text-left p-2 font-medium">Success</th>
                    <th className="text-left p-2 font-medium">Rate limits</th>
                    <th className="text-left p-2 font-medium">Top error</th>
                    <th className="text-left p-2 font-medium">Alerts</th>
                  </tr>
                </thead>
                <tbody>
                  {health.map((h) => <HealthRow key={h.client_id} h={h} />)}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" /> Open alerts ({alerts.filter((a) => a.status === "open").length})
          </CardTitle>
          <CardDescription className="text-xs">
            Auto-generated by the health evaluator: high failure rate, auth failures, repeated rate
            limits, or zero jobs while live.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-xs text-muted-foreground">No alerts. Click "Evaluate alerts" after a window of activity.</p>
          ) : (
            <div className="space-y-2">
              {alerts.map((a) => {
                const tenant = health.find((h) => h.client_id === a.client_id);
                return (
                  <div key={a.id} className={cn("rounded-md border p-3 flex items-start justify-between gap-3", SEVERITY[a.severity])}>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold">{a.title}</div>
                      <div className="text-[11px] opacity-80">
                        {tenant?.client_name ?? a.client_id} · {a.alert_kind} · {new Date(a.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {a.status === "open" && (
                        <Button size="sm" variant="ghost" onClick={() => ackMut.mutate({ alert_id: a.id })}>Ack</Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => ackMut.mutate({ alert_id: a.id, resolve: true })}>Resolve</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
