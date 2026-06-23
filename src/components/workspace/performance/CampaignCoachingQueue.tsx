/**
 * Phase 8 — CampaignCoachingQueue.
 *
 * Advisory ranking (NOT mandatory QA). Deterministic order:
 * hard_fail > soft_fail > AI-tagged > newest. Reviewed calls are marked but
 * retained — reviewers decide what to keep.
 */
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CallSessionReplay } from "@/components/workspace/calls/CallSessionReplay";
import { GraduationCap, CheckCircle2, Play } from "lucide-react";
import type { CoachingCandidate } from "@/lib/workspace/performance/metrics";
import { useCallsTelemetry } from "@/lib/workspace/telemetry/callsTelemetry";


interface Props {
  candidates: CoachingCandidate[];
  loading?: boolean;
  emptyHint?: string;
}

export function CampaignCoachingQueue({ candidates, loading, emptyHint }: Props) {
  const [replayId, setReplayId] = useState<string | null>(null);
  const track = useCallsTelemetry();
  const openReplay = (c: CoachingCandidate) => {
    setReplayId(c.sessionId);
    track("calls.coaching.item_opened", {
      call_session_id: c.sessionId,
      campaign_id: c.campaignId,
      source: "campaign",
      reasons: c.reasons,
    });
    track("calls.replay.opened", {
      call_session_id: c.sessionId,
      campaign_id: c.campaignId,
      source: "campaign",
    });
  };
  const closeReplay = () => {
    if (replayId) {
      track("calls.replay.closed", {
        call_session_id: replayId,
        source: "campaign",
      });
    }
    setReplayId(null);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Suggested for review
            <Badge variant="secondary" className="text-[10px]">Advisory only</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {emptyHint ?? "No suggested reviews in this window."}
            </p>
          ) : (
            <ul className="divide-y">
              {candidates.map((c) => (
                <li
                  key={c.sessionId}
                  className="py-2 flex items-center justify-between gap-3 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {c.reasons.map((r) => (
                        <Badge key={r} variant="outline" className="text-[10px]">
                          {r}
                        </Badge>
                      ))}
                      {c.reviewed && (
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Reviewed
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Started {new Date(c.startedAt).toLocaleString()} · session {c.sessionId.slice(0, 8)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setReplayId(c.sessionId)}
                  >
                    <Play className="h-3.5 w-3.5 mr-1.5" /> Replay
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

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
    </>
  );
}
