/**
 * Phase 8 — Performance overview (workspace-scoped).
 *
 * Mounted as the "Performance" tab in WorkspaceAnalyticsPage. Snapshot-backed
 * metrics carry explicit coverage labels.
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/common/KpiCard";
import {
  Phone,
  CheckCircle2,
  Target,
  Clock,
  Sparkle,
  ClipboardCheck,
  Info,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspacePerformance } from "@/hooks/workspace/usePerformance";
import { useWorkspaceCampaigns } from "@/hooks/useWorkspaceCampaigns";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function fmtPct(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${Math.round(n * 100)}%`;
}
function fmtDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

const WINDOWS: Array<{ label: string; days: number }> = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

function SnapshotCoverageNote({
  covered,
  total,
}: {
  covered: number;
  total: number;
}) {
  return (
    <p className="text-[11px] text-muted-foreground">
      <Info className="h-3 w-3 inline mr-1" />
      Snapshot-backed signals cover {covered} of {total} calls. Older calls without snapshots
      are excluded from AI-derived metrics.
    </p>
  );
}

export function WorkspacePerformanceOverview() {
  const { workspace } = useWorkspace();
  const [windowDays, setWindowDays] = useState(30);
  const { data, isLoading } = useWorkspacePerformance(windowDays);
  const { data: campaigns = [] } = useWorkspaceCampaigns();

  const campaignNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of campaigns) m.set(c.id, c.name);
    return m;
  }, [campaigns]);

  const metrics = data?.metrics;
  const buckets = metrics?.dispositionBuckets;
  const bucketData = buckets
    ? [
        { name: "Success", value: buckets.success, fill: "hsl(var(--primary))" },
        { name: "Soft fail", value: buckets.soft_fail, fill: "hsl(var(--muted-foreground))" },
        { name: "Hard fail", value: buckets.hard_fail, fill: "hsl(var(--destructive))" },
        { name: "Other", value: buckets.other, fill: "hsl(var(--accent))" },
      ]
    : [];

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Workspace outcomes</h2>
            <p className="text-xs text-muted-foreground">
              Snapshot-driven performance across all campaigns in this workspace.
            </p>
          </div>
          <div className="flex gap-1">
            {WINDOWS.map((w) => (
              <button
                key={w.days}
                onClick={() => setWindowDays(w.days)}
                className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                  windowDays === w.days
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:border-primary/40"
                }`}
              >
                Last {w.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard label="Total calls" value={metrics?.totalCalls ?? 0} icon={Phone} loading={isLoading} />
          <KpiCard
            label="Completion"
            value={fmtPct(metrics?.completionRate)}
            icon={CheckCircle2}
            loading={isLoading}
            hint={metrics ? `${metrics.completedCalls} completed` : undefined}
          />
          <KpiCard
            label="Success disp."
            value={fmtPct(metrics?.successDispositionRate)}
            icon={Target}
            loading={isLoading}
            hint="of calls with outcome"
          />
          <KpiCard
            label="Avg handle"
            value={fmtDuration(metrics?.avgHandleSeconds ?? null)}
            icon={Clock}
            loading={isLoading}
          />
          <KpiCard
            label="AI usage*"
            value={fmtPct(metrics?.aiUsageRate)}
            icon={Sparkle}
            loading={isLoading}
            hint={
              metrics
                ? `of ${metrics.aiUsageDenominator} snapshot-covered calls`
                : undefined
            }
          />
          <KpiCard
            label="QA coverage"
            value={fmtPct(metrics?.qaCoverageRate)}
            icon={ClipboardCheck}
            loading={isLoading}
          />
        </div>

        {metrics && (
          <SnapshotCoverageNote
            covered={metrics.aiUsageDenominator}
            total={metrics.totalCalls}
          />
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Disposition mix</CardTitle>
            </CardHeader>
            <CardContent className="h-56">
              {bucketData.length === 0 || metrics?.totalCalls === 0 ? (
                <p className="text-sm text-muted-foreground">No outcomes in this window.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bucketData}>
                    <XAxis dataKey="name" fontSize={11} />
                    <YAxis fontSize={11} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Calls over time</CardTitle>
            </CardHeader>
            <CardContent className="h-56">
              {(data?.overTime?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">No data.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data!.overTime}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="date" fontSize={10} />
                    <YAxis fontSize={11} allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Per-campaign performance</CardTitle>
          </CardHeader>
          <CardContent>
            {(data?.perCampaign?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No campaign activity in this window.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground border-b">
                    <tr>
                      <th className="text-left py-2 pr-3">Campaign</th>
                      <th className="text-right py-2 px-2">Calls</th>
                      <th className="text-right py-2 px-2">Completion</th>
                      <th className="text-right py-2 px-2">Success</th>
                      <th className="text-right py-2 px-2">Avg handle</th>
                      <th className="text-right py-2 px-2">
                        <UITooltip>
                          <TooltipTrigger className="inline-flex items-center gap-1">
                            AI usage <Info className="h-3 w-3" />
                          </TooltipTrigger>
                          <TooltipContent>
                            % of snapshot-covered calls that used an AI suggestion
                          </TooltipContent>
                        </UITooltip>
                      </th>
                      <th className="text-right py-2 pl-2">QA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data!.perCampaign.map((row) => {
                      const name = row.campaignId
                        ? campaignNameById.get(row.campaignId) ?? "—"
                        : "(unassigned)";
                      return (
                        <tr key={row.campaignId ?? "_"} className="border-b last:border-0">
                          <td className="py-2 pr-3">
                            {row.campaignId ? (
                              <Link
                                className="hover:text-primary"
                                to={`/w/${workspace?.id}/campaigns/${row.campaignId}`}
                              >
                                {name}
                              </Link>
                            ) : (
                              <span className="text-muted-foreground">{name}</span>
                            )}
                          </td>
                          <td className="text-right py-2 px-2 tabular-nums">{row.metrics.totalCalls}</td>
                          <td className="text-right py-2 px-2 tabular-nums">{fmtPct(row.metrics.completionRate)}</td>
                          <td className="text-right py-2 px-2 tabular-nums">{fmtPct(row.metrics.successDispositionRate)}</td>
                          <td className="text-right py-2 px-2 tabular-nums">{fmtDuration(row.metrics.avgHandleSeconds)}</td>
                          <td className="text-right py-2 px-2 tabular-nums">
                            <span className="inline-flex items-center gap-1">
                              {fmtPct(row.metrics.aiUsageRate)}
                              <Badge variant="outline" className="text-[10px] px-1 py-0">
                                {row.metrics.aiUsageDenominator}/{row.metrics.totalCalls}
                              </Badge>
                            </span>
                          </td>
                          <td className="text-right py-2 pl-2 tabular-nums">{fmtPct(row.metrics.qaCoverageRate)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-[11px] text-muted-foreground">
          * AI usage rate is computed over <strong>snapshot-covered</strong> calls only (Phase 7A+).
          Calls predating snapshots are still counted in totals and handle time.
        </p>
      </div>
    </TooltipProvider>
  );
}
