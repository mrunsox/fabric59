import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Plug, BarChart3, ArrowRight, AlertTriangle, CheckCircle2, Circle } from "lucide-react";

interface ConnectorBuckets {
  total: number;
  live: number;
  errored: number;
  not_connected: number;
}

interface ReportsSummary {
  uploads30d: number;
  scheduledActive: number;
}

interface Props {
  organizationId?: string;
}

const LIVE_STATUSES = new Set(["connected", "live", "active", "ok"]);
const ERROR_STATUSES = new Set(["error", "errored", "failed", "needs_attention"]);

/**
 * Phase G — Org cockpit Connectors + Reports panel.
 * Combined operational summary for two canonical org destinations:
 * /admin/connectors and /admin/reports. Read-only counts only.
 */
export function ConnectorsReportsPanel({ organizationId }: Props) {
  const [conn, setConn] = useState<ConnectorBuckets | null>(null);
  const [reports, setReports] = useState<ReportsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizationId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      const [connRes, uploadsRes, schedRes] = await Promise.all([
        supabase
          .from("integration_connections")
          .select("status")
          .eq("organization_id", organizationId),
        supabase
          .from("report_uploads")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .gte("uploaded_at", since),
        supabase
          .from("scheduled_reports")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .eq("status", "active"),
      ]);
      if (cancelled) return;

      const rows = (connRes.data ?? []) as { status: string }[];
      const buckets: ConnectorBuckets = {
        total: rows.length,
        live: rows.filter((r) => LIVE_STATUSES.has(r.status)).length,
        errored: rows.filter((r) => ERROR_STATUSES.has(r.status)).length,
        not_connected: rows.filter(
          (r) => !LIVE_STATUSES.has(r.status) && !ERROR_STATUSES.has(r.status),
        ).length,
      };
      setConn(buckets);
      setReports({
        uploads30d: uploadsRes.count ?? 0,
        scheduledActive: schedRes.count ?? 0,
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  return (
    <Card data-testid="connectors-reports-panel">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Plug className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">Connectors and reports</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Operational state across integrations and reporting
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link to="/admin/connectors">
              Connectors <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link to="/admin/reports">
              Reports <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <>
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                <Plug className="inline h-3 w-3 mr-1 -mt-0.5" /> Connectors
              </p>
              <div className="grid grid-cols-3 gap-2">
                <ConnStat icon={CheckCircle2} tone="success" label="Live" value={conn?.live ?? 0} />
                <ConnStat
                  icon={AlertTriangle}
                  tone="destructive"
                  label="Needs attention"
                  value={conn?.errored ?? 0}
                />
                <ConnStat
                  icon={Circle}
                  tone="muted"
                  label="Not connected"
                  value={conn?.not_connected ?? 0}
                />
              </div>
            </section>

            <section>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                <BarChart3 className="inline h-3 w-3 mr-1 -mt-0.5" /> Reports
              </p>
              <div className="grid grid-cols-2 gap-2">
                <ConnStat
                  icon={BarChart3}
                  tone="primary"
                  label="Uploads · 30d"
                  value={reports?.uploads30d ?? 0}
                />
                <ConnStat
                  icon={BarChart3}
                  tone="primary"
                  label="Scheduled active"
                  value={reports?.scheduledActive ?? 0}
                />
              </div>
            </section>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ConnStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: "success" | "destructive" | "muted" | "primary";
}) {
  const toneClasses = {
    success: "text-success",
    destructive: "text-destructive",
    muted: "text-muted-foreground",
    primary: "text-primary",
  }[tone];
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className={`h-3 w-3 ${toneClasses}`} />
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-1 text-lg font-semibold text-foreground tabular-nums">{value}</p>
    </div>
  );
}
