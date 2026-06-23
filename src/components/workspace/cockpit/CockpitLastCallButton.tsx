/**
 * Phase 9 — Cockpit "Last call" replay entrypoint.
 *
 * Light-weight header affordance that lets the agent open a replay of their
 * most recent COMPLETED call session. Reuses `CallSessionReplay` (snapshot v1)
 * in a side sheet so we don't compete with in-call actions.
 *
 * Resolution rule:
 *   most recent `call_sessions` row for (workspace_id, agent_id) where
 *   `ended_at IS NOT NULL`, ordered by `ended_at DESC`.
 *
 * If none exists, the button stays clickable but the sheet shows a
 * straightforward empty-state message instead of a replay.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { CallSessionReplay } from "@/components/workspace/calls/CallSessionReplay";
import { useCallsTelemetry } from "@/lib/workspace/telemetry/callsTelemetry";

export interface CockpitLastCallButtonProps {
  workspaceId: string;
  agentId: string | null;
}

export function CockpitLastCallButton({
  workspaceId,
  agentId,
}: CockpitLastCallButtonProps) {
  const [open, setOpen] = useState(false);
  const track = useCallsTelemetry();

  const { data: lastSessionId = null, isLoading } = useQuery({
    queryKey: ["cockpit-last-call", workspaceId, agentId],
    enabled: open && !!workspaceId && !!agentId,
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase
        .from("call_sessions")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("agent_id", agentId!)
        .not("ended_at", "is", null)
        .order("ended_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return data?.[0]?.id ?? null;
    },
  });

  const handleOpen = () => {
    setOpen(true);
    track("calls.replay.opened", { source: "cockpit" });
  };
  const handleClose = () => {
    if (lastSessionId) {
      track("calls.replay.closed", {
        call_session_id: lastSessionId,
        source: "cockpit",
      });
    }
    setOpen(false);
  };

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
        onClick={handleOpen}
        disabled={!agentId}
        data-testid="cockpit-last-call-btn"
      >
        <History className="h-3.5 w-3.5" /> Last call
      </Button>

      <Sheet open={open} onOpenChange={(o) => (o ? setOpen(true) : handleClose())}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl overflow-y-auto"
          data-testid="cockpit-last-call-sheet"
        >
          <SheetHeader>
            <SheetTitle>Last call replay</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Looking up your last call…</p>
            ) : lastSessionId ? (
              <CallSessionReplay sessionId={lastSessionId} />
            ) : (
              <div
                className="rounded-md border border-dashed border-border bg-muted/20 p-6 text-center"
                data-testid="cockpit-last-call-empty"
              >
                <p className="text-sm font-medium">No recent completed call</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Once you wrap up a call, its replay will be available here.
                </p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
