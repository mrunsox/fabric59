import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClipboardCheck, CheckCircle2, Clock, PlayCircle } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { KpiCard } from "@/components/common/KpiCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import { CallSessionReplay } from "@/components/workspace/calls/CallSessionReplay";
import {
  useWorkspaceQaReviews,
  useUpdateQaReviewStatus,
} from "@/hooks/useWorkspaceQa";

export default function WorkspaceQaPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [tab, setTab] = useState<"pending" | "completed" | "all">("pending");
  const [replaySessionId, setReplaySessionId] = useState<string | null>(null);
  const { data: reviews = [], isLoading } = useWorkspaceQaReviews({
    status: tab === "all" ? undefined : tab,
  });
  const update = useUpdateQaReviewStatus();

  const { data: pendingAll = [] } = useWorkspaceQaReviews({ status: "pending" });
  const { data: completedAll = [] } = useWorkspaceQaReviews({ status: "completed" });

  return (
    <div className="space-y-6">
      <WorkspacePageHeader
        eyebrow="QA & Review"
        title="QA & Review"
        lede="Workspace-scoped review queue tied to call sessions and outcomes."
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <KpiCard label="Pending" value={pendingAll.length} icon={Clock} />
        <KpiCard label="Completed" value={completedAll.length} icon={CheckCircle2} />
        <KpiCard
          label="Avg score"
          value={
            completedAll.length === 0
              ? "—"
              : (
                  completedAll.reduce((s, r) => s + (r.total_score ?? 0), 0) /
                  Math.max(1, completedAll.filter((r) => r.total_score !== null).length)
                ).toFixed(1)
          }
          icon={ClipboardCheck}
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Review queue</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
            <TabsContent value={tab} className="mt-4">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : reviews.length === 0 ? (
                <EmptyState
                  icon={ClipboardCheck}
                  title="No reviews in this view"
                  description="Reviews surface here as call sessions complete and become eligible for QA."
                />
              ) : (
                <div className="space-y-2">
                  {reviews.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between gap-3 border rounded-md px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          Session{" "}
                          <code className="text-xs text-muted-foreground">
                            {r.script_session_id?.slice(0, 8) ?? "—"}
                          </code>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Created {new Date(r.created_at).toLocaleString()}
                          {r.total_score !== null && (
                            <> · Score {r.total_score}</>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge status={r.status} />
                        {r.call_session_id && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setReplaySessionId(r.call_session_id)}
                            data-testid={`qa-replay-${r.id}`}
                          >
                            <PlayCircle className="h-3.5 w-3.5 mr-1" /> Replay
                          </Button>
                        )}
                        {(r.call_session_id || r.script_session_id) && (
                          <Button
                            asChild
                            size="sm"
                            variant="ghost"
                            data-testid={`qa-open-runs-${r.id}`}
                          >
                            <Link
                              to={
                                r.call_session_id
                                  ? `/w/${workspaceId}/cockpit?tab=runs&session=${encodeURIComponent(r.call_session_id)}`
                                  : `/w/${workspaceId}/cockpit?tab=runs&search=${encodeURIComponent(r.script_session_id!)}`
                              }
                            >
                              Open in Runs
                            </Link>
                          </Button>
                        )}
                        {r.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              update.mutate({ id: r.id, status: "in_review" })
                            }
                          >
                            Start
                          </Button>
                        )}
                        {r.status !== "completed" && (
                          <Button
                            size="sm"
                            onClick={() =>
                              update.mutate({ id: r.id, status: "completed" })
                            }
                          >
                            Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground">
        Detailed scoring rubrics, calibration, and reviewer assignment are on the roadmap.
      </p>

      <Dialog open={!!replaySessionId} onOpenChange={(o) => !o && setReplaySessionId(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Call replay &amp; QA hints</DialogTitle>
          </DialogHeader>
          {replaySessionId && <CallSessionReplay sessionId={replaySessionId} showQaHints />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
