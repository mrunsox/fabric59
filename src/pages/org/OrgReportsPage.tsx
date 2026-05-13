import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useScheduledReports } from "@/hooks/useScheduledReports";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { BarChart3, Clock, FileSpreadsheet, ArrowRight } from "lucide-react";
import { format } from "date-fns";

/**
 * Phase 5 — Canonical /org/reports.
 *
 * Honest org-level reporting surface: live counts of scheduled reports and
 * recent uploads, plus entry points into the workspace-scoped analytics where
 * the real reporting lives. No fabricated KPIs or charts.
 */
export default function OrgReportsPage() {
  const { organization } = useAuth();
  const { data: scheduled = [], isLoading: schedLoading } = useScheduledReports();

  const { data: uploads30d } = useQuery({
    queryKey: ["org-report-uploads-30d", organization?.id],
    enabled: !!organization?.id,
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      const { count, error } = await supabase
        .from("report_uploads")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organization!.id)
        .gte("uploaded_at", since);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: workspaces = [] } = useQuery({
    queryKey: ["org-workspaces-for-reports", organization?.id],
    enabled: !!organization?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspaces")
        .select("id, name, is_default")
        .eq("organization_id", organization!.id)
        .order("is_default", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const activeScheduled = scheduled.filter((r) => r.status === "active");

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8 animate-fade-in">
      <OrgPageHeader
        eyebrow="Organization"
        title="Reports"
        lede="Org-level reporting overview. Live analytics surfaces sit inside each workspace; scheduled reports and uploads are managed at the org level."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Scheduled reports" value={schedLoading ? "—" : String(scheduled.length)} hint={`${activeScheduled.length} active`} icon={Clock} />
        <Stat label="Uploads · 30d" value={uploads30d === undefined ? "—" : String(uploads30d)} hint="Across this organization" icon={FileSpreadsheet} />
        <Stat label="Workspaces" value={String(workspaces.length)} hint="Each has its own analytics" icon={BarChart3} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Scheduled reports</CardTitle>
        </CardHeader>
        <CardContent>
          {schedLoading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
          ) : scheduled.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No scheduled reports"
              description="Recurring exports will appear here once they're configured. Schedules are created from a workspace's analytics surface."
            />
          ) : (
            <div className="divide-y divide-border/60">
              {scheduled.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium capitalize truncate">
                      {r.frequency} · {r.date_range_type.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 uppercase">
                      {r.export_format}
                      {r.last_run_at && (
                        <>
                          {" · last run "}
                          {format(new Date(r.last_run_at), "MMM d, HH:mm")}
                        </>
                      )}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Open analytics in a workspace</CardTitle>
        </CardHeader>
        <CardContent>
          {workspaces.length === 0 ? (
            <EmptyState icon={BarChart3} title="No workspaces yet" description="Create a workspace to access analytics." />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {workspaces.map((w) => (
                <Link
                  key={w.id}
                  to={`/w/${w.id}/analytics`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-4 py-3 hover:border-primary/40 hover:bg-accent/40 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{w.name}</p>
                    <p className="text-[11px] text-muted-foreground">{w.is_default ? "Default workspace" : "Workspace"}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
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
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          <span>{label}</span>
        </div>
        <p className="text-2xl font-semibold mt-1 tabular-nums">{value}</p>
        {hint && <p className="text-xs text-muted-foreground mt-1 truncate">{hint}</p>}
      </CardContent>
    </Card>
  );
}
