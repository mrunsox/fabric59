import { Link, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/common/KpiCard";
import { EmptyState } from "@/components/common/EmptyState";
import {
  Phone,
  Target,
  ClipboardCheck,
  Megaphone,
  BookOpen,
  CheckCircle2,
  BarChart3,
} from "lucide-react";
import {
  useWorkspaceKpis,
  useWorkspaceDispositions,
} from "@/hooks/useWorkspaceAnalytics";

/**
 * Phase 8 — Canonical workspace analytics surface.
 *
 * Replaces fragmented org-level dashboards as the workspace-first analytics
 * entry point. Underlying data is currently org-scoped; workspace-scoping of
 * call_sessions/qa_reviews is a Phase 8 follow-up tracked in /outline.
 */
export default function WorkspaceAnalyticsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { data: kpis, isLoading } = useWorkspaceKpis();
  const { data: dispositions = [], isLoading: dispLoading } = useWorkspaceDispositions(30);

  const totalDisp = dispositions.reduce((s, d) => s + d.count, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Workspace-scoped operational insight. Last 7 days unless noted.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Calls (7d)"
          value={kpis?.callsLast7d ?? 0}
          icon={Phone}
          loading={isLoading}
          hint={`${kpis?.callsTotal ?? 0} all time`}
        />
        <KpiCard
          label="Outcomes (7d)"
          value={kpis?.outcomesLast7d ?? 0}
          icon={Target}
          loading={isLoading}
        />
        <KpiCard
          label="QA Pending"
          value={kpis?.qaPending ?? 0}
          icon={ClipboardCheck}
          loading={isLoading}
          hint={`${kpis?.qaCompleted ?? 0} completed`}
        />
        <KpiCard
          label="Active Campaigns"
          value={kpis?.campaignsActive ?? 0}
          icon={Megaphone}
          loading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <KpiCard
          label="Published Guides"
          value={kpis?.guidesPublished ?? 0}
          icon={BookOpen}
          loading={isLoading}
        />
        <KpiCard
          label="QA Pass Rate (proxy)"
          value={
            (kpis?.qaCompleted ?? 0) + (kpis?.qaPending ?? 0) === 0
              ? "—"
              : `${Math.round(
                  ((kpis?.qaCompleted ?? 0) /
                    Math.max(1, (kpis?.qaCompleted ?? 0) + (kpis?.qaPending ?? 0))) *
                    100,
                )}%`
          }
          icon={CheckCircle2}
          loading={isLoading}
          hint="Reviewed / total reviews"
        />
        <KpiCard
          label="Avg Calls / Day (7d)"
          value={Math.round((kpis?.callsLast7d ?? 0) / 7)}
          icon={BarChart3}
          loading={isLoading}
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Top dispositions (30d)</CardTitle>
        </CardHeader>
        <CardContent>
          {dispLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : dispositions.length === 0 ? (
            <EmptyState
              icon={Target}
              title="No disposition data yet"
              description="Once outcomes start landing from live calls, top dispositions will appear here."
            />
          ) : (
            <div className="space-y-2">
              {dispositions.map((d) => {
                const pct = totalDisp ? Math.round((d.count / totalDisp) * 100) : 0;
                return (
                  <div key={d.disposition} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium truncate">{d.disposition}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {d.count} · {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Drill-downs</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <Link
            to={`/app/workspaces/${workspaceId}/qa`}
            className="border rounded-md p-3 hover:border-primary/40 transition-colors"
          >
            <div className="font-medium">QA queue</div>
            <div className="text-xs text-muted-foreground">Review pending sessions</div>
          </Link>
          <Link
            to={`/app/workspaces/${workspaceId}/campaigns`}
            className="border rounded-md p-3 hover:border-primary/40 transition-colors"
          >
            <div className="font-medium">Campaigns</div>
            <div className="text-xs text-muted-foreground">Status + performance</div>
          </Link>
          <Link
            to={`/app/workspaces/${workspaceId}/guides`}
            className="border rounded-md p-3 hover:border-primary/40 transition-colors"
          >
            <div className="font-medium">Guides</div>
            <div className="text-xs text-muted-foreground">Authoring + versions</div>
          </Link>
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground">
        <Badge variant="outline" className="mr-1.5 text-[10px]">
          Phase 8
        </Badge>
        Underlying data tables remain org-scoped. Strict workspace_id plumbing on call_sessions,
        qa_reviews, and invoices is tracked as a Phase 8 follow-up.
      </p>
    </div>
  );
}
