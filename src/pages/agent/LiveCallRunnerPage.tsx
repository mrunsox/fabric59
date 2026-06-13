import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { WorkspaceProvider, useWorkspace } from "@/contexts/WorkspaceContext";

import { usePublishedSingletonGuide } from "@/hooks/useWorkspaceCanonicalGuide";
import { usePublishedCampaignFlow } from "@/hooks/useCampaignFlow";
import { useCallRunnerSession } from "@/hooks/useCallRunnerSession";
import { useCallCopilot } from "@/hooks/useCallCopilot";

import { SessionHeader } from "@/components/call-runner/SessionHeader";
import { GuidePanel } from "@/components/call-runner/GuidePanel";
import { FlowPanel } from "@/components/call-runner/FlowPanel";
import { CopilotPanel } from "@/components/call-runner/CopilotPanel";
import { ShortcutsHelp } from "@/components/call-runner/ShortcutsHelp";
import { buildInteractionPayload, submitInteractionDraft } from "@/lib/call-runner/submit";
import { HOTKEYS, matchHotkey } from "@/lib/call-runner/hotkeys";

import type { CallSessionMeta } from "@/types/call-runner";

/**
 * Phase 6 · Canonical live call runner.
 *
 * Mounted at:
 *   /app/agent/workspace                                — landing (picker)
 *   /app/agent/workspace/:workspaceId/:campaignId       — runner
 *
 * Wraps in WorkspaceProvider so existing hooks (usePublishedSingletonGuide,
 * usePublishedCampaignFlow) resolve workspace context from the URL.
 *
 * The runner is intentionally NOT mounted inside CanonicalWorkspaceShell:
 * it is a dedicated runtime surface optimized for live-call latency, with
 * its own three-panel layout and session header. The existing
 * /w/:workspaceId/agent cockpit and all other compatibility routes are
 * untouched.
 */
export default function LiveCallRunnerPage() {
  return (
    <WorkspaceProvider>
      <LiveCallRunnerInner />
    </WorkspaceProvider>
  );
}

function LiveCallRunnerInner() {
  const { workspaceId, campaignId } = useParams<{ workspaceId: string; campaignId: string }>();
  const [search] = useSearchParams();
  const { workspace, isLoading: wsLoading, notFound } = useWorkspace();

  // Resolve campaign name + Five9-derived session context.
  const { data: campaign } = useQuery({
    queryKey: ["runner-campaign", campaignId],
    enabled: !!campaignId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, name")
        .eq("id", campaignId!)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; name: string } | null;
    },
  });

  const meta = useMemo<CallSessionMeta>(() => {
    return {
      workspaceId: workspaceId ?? "",
      workspaceName: workspace?.name,
      campaignId: campaignId ?? "",
      campaignName: campaign?.name,
      callId: search.get("callId"),
      ani: search.get("ani"),
      startedAt: new Date().toISOString(),
    };
  }, [workspaceId, workspace?.name, campaignId, campaign?.name, search]);

  const session = useCallRunnerSession(meta);

  const { data: guide, isLoading: guideLoading } = usePublishedSingletonGuide();
  const { data: flow, isLoading: flowLoading } = usePublishedCampaignFlow(campaignId);

  const copilot = useCallCopilot({
    session: session.session,
    flow: flow ?? null,
    guide: guide ?? null,
  });

  const [submitting, setSubmitting] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Global "?" toggles the shortcuts help drawer.
  useEffect(() => {
    const def = HOTKEYS.find((h) => h.id === "toggle_help")!;
    function onKey(e: KeyboardEvent) {
      // Ignore when typing.
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === "INPUT" || tgt.tagName === "TEXTAREA" || tgt.isContentEditable)) return;
      if (matchHotkey(e, def)) {
        e.preventDefault();
        setShowHelp((s) => !s);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Append-to-notes sink consumed by GuidePanel "Instant Notes" buttons.
  const appendToNotes = useCallback(
    (text: string) => {
      const prev = session.session.notes ?? "";
      const sep = prev && !prev.endsWith("\n") ? "\n" : "";
      session.setNotes(`${prev}${sep}${text}`);
    },
    [session],
  );

  const onSubmit = async () => {
    if (!flow) {
      toast.error("No published flow to submit against.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = buildInteractionPayload(session.session, copilot);
      await submitInteractionDraft(payload);
      session.markFinalized();
      toast.success("Interaction queued for processing");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!workspaceId || !campaignId) {
    return (
      <div className="p-6 text-sm">
        Missing workspace or campaign in URL. Use{" "}
        <code className="text-xs">/app/agent/workspace/&lt;workspaceId&gt;/&lt;campaignId&gt;</code>.
      </div>
    );
  }

  if (wsLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading workspace…</div>;
  }

  if (notFound) {
    return (
      <div className="p-6 text-sm">
        Workspace not found or you do not have access.
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col gap-3 p-3 bg-background" data-testid="live-call-runner">
      <SessionHeader
        meta={meta}
        resumed={session.resumed}
        onReset={session.reset}
        branchLabel={(session.session.values.__branch_label__ as string | undefined) ?? null}
      />
      <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)_340px] gap-3 flex-1 min-h-0">
        <GuidePanel guide={guide ?? null} isLoading={guideLoading} onAppendToNotes={appendToNotes} />
        <FlowPanel
          flow={flow ?? null}
          isLoading={flowLoading}
          session={session.session}
          onValueChange={session.setValue}
          onCurrentStep={session.setCurrentStepId}
          onCompleted={session.pushCompleted}
          onSubmit={onSubmit}
          submitting={submitting}
        />
        <CopilotPanel
          copilot={copilot}
          feedback={copilot.feedback}
          onRate={copilot.rate}
          notes={session.session.notes}
          onNotesChange={session.setNotes}
        />
      </div>
      <ShortcutsHelp open={showHelp} onOpenChange={setShowHelp} />
    </div>
  );
}

// Re-export sentinel so chrome-neutralization tests can verify the route file
// exists without leaking legal vocabulary.
export { LiveCallRunnerInner };
