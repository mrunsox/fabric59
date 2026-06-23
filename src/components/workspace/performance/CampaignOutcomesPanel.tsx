/**
 * Phase 8 — Campaign Outcomes panel.
 *
 * Mounted in WorkspaceCampaignDetailPage. Reuses the same metrics and
 * coaching queue building blocks as the workspace overview.
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/common/KpiCard";
import {
  Phone,
  CheckCircle2,
  Target,
  Clock,
  Sparkle,
  ClipboardCheck,
  Play,
  Info,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CallSessionReplay } from "@/components/workspace/calls/CallSessionReplay";
import { CampaignCoachingQueue } from "./CampaignCoachingQueue";
import { useCampaignPerformance } from "@/hooks/workspace/usePerformance";

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

export function CampaignOutcomesPanel({ campaignId }: { campaignId: string }) {
  const [windowDays, setWindowDays] = useState(30);
  const [replayId, setReplayId] = useState<string | null>(null);
  const { data, isLoading } = useCampaignPerformance(campaignId, windowDays);

  const metrics = data?.metrics;
  const b = metrics?.dispositionBuckets;
  const bucketData = b
    ? [
        { name: "Success", value: b.success },
        { name: "Soft fail", value: b.soft_fail },
        { name: "Hard fail", value: b.hard_fail },
        { name: "Other", value: b.other },
      ]
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Outcomes</h2>
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
        <KpiCard label="Calls" value={metrics?.totalCalls ?? 0} icon={Phone} loading={isLoading} />
        <KpiCard
          label="Completion"
          value={fmtPct(metrics?.completionRate)}
          icon={CheckCircle2}
          loading={isLoading}
        />
        <KpiCard
          label="Success disp."
          value={fmtPct(metrics?.successDispositionRate)}
          icon={Target}
          loading={isLoading}
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
            metrics ? `of ${metrics.aiUsageDenominator} snapshot-covered` : undefined
          }
        />
        <KpiCard
          label="QA coverage"
          value={fmtPct(metrics?.qaCoverageRate)}
          icon={ClipboardCheck}
          loading={isLoading}
        />
      </div>

      <p className="text-[11px] text-muted-foreground">
        <Info className="h-3 w-3 inline mr-1" />
        AI-derived metrics are computed over snapshot-covered calls only ({metrics?.aiUsageDenominator ?? 0} of{" "}
        {metrics?.totalCalls ?? 0}).
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Disposition mix</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            {metrics?.totalCalls === 0 ? (
              <p className="text-sm text-muted-foreground">No outcomes.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bucketData}>
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis fontSize={11} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recent calls</CardTitle>
          </CardHeader>
          <CardContent className="max-h-56 overflow-y-auto">
            {(data?.recentSessions?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No calls yet.</p>
            ) : (
              <ul className="divide-y text-sm">
                {data!.recentSessions.map((s) => (
                  <li key={s.id} className="py-1.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-mono text-xs">{s.id.slice(0, 8)}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {new Date(s.started_at).toLocaleString()}
                      </span>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setReplayId(s.id)}>
                      <Play className="h-3 w-3 mr-1" /> Replay
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <CampaignCoachingQueue
        candidates={data?.coaching ?? []}
        loading={isLoading}
        emptyHint="No calls flagged for coaching in this window."
      />

      <Sheet open={!!replayId} onOpenChange={(o) => !o && setReplayId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Call replay</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            {replayId && <CallSessionReplay sessionId={replayId} />}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
