import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { WorkspaceProvider, useWorkspace } from "@/contexts/WorkspaceContext";

import { usePublishedSingletonGuide } from "@/hooks/useWorkspaceCanonicalGuide";
import { usePublishedCampaignFlow } from "@/hooks/useCampaignFlow";
import { useCallRunnerSession } from "@/hooks/useCallRunnerSession";
import { useCallCopilot } from "@/hooks/useCallCopilot";
import { enabledSteps, computeVisibleStepIds } from "@/lib/call-runner/flow-execution";

import { SessionHeader } from "@/components/call-runner/SessionHeader";
import { GuidePanel } from "@/components/call-runner/GuidePanel";
import { FlowPanel } from "@/components/call-runner/FlowPanel";
import { CopilotPanel } from "@/components/call-runner/CopilotPanel";
import { ShortcutsHelp } from "@/components/call-runner/ShortcutsHelp";
import type { AutosaveState } from "@/components/call-runner/primitives";
import { buildInteractionPayload, submitInteractionDraft } from "@/lib/call-runner/submit";
import { HOTKEYS, matchHotkey } from "@/lib/call-runner/hotkeys";
import { TransferDirectoryPanel } from "@/components/transfer-directory/TransferDirectoryPanel";
import { useTransferDirectoryConfig } from "@/hooks/useTransferDirectoryConfig";
import { useTransferRecommendations } from "@/hooks/useTransferRecommendations";
import type { TransferEvaluationContext, Urgency, HoursBehavior } from "@/lib/transfer-directory/types";
import { ExternalResourcesPanel } from "@/components/external-resources/ExternalResourcesPanel";
import { useExternalResourcesConfig } from "@/hooks/useExternalResourcesConfig";
import { useExternalResources } from "@/hooks/useExternalResources";
import { recordEvent, surfaceEvaluated } from "@/lib/external-resources/events";
import type {
  ResourceEvaluationContext,
  ResourceEvent,
  ResourceRuntimeValues,
  ResourceUrgency,
} from "@/lib/external-resources/types";

import type { CallSessionMeta } from "@/types/call-runner";

/**
 * Canonical live call runner.
 *
 * Mounted at:
 *   /app/agent/workspace                                — landing (picker)
 *   /app/agent/workspace/:workspaceId/:campaignId       — runner
 *
 * The runner has its own three-panel layout (header + guide / flow / copilot)
 * optimized for live-call latency. Phase 6/7 contracts are preserved: the
 * session hook, copilot hook, and submission pipeline boundary are unchanged.
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
  const [submissionState, setSubmissionState] =
    useState<"idle" | "submitting" | "accepted" | "deferred" | "error">("idle");
  const [showHelp, setShowHelp] = useState(false);

  // Autosave signal — derived from the session change → debounced persist
  // flow already in `useCallRunnerSession`. We surface "saving" briefly after
  // each mutation, then "saved" with a timestamp. Additive only; the hook
  // contract is untouched.
  const [autosave, setAutosave] = useState<AutosaveState>("idle");
  const [autosaveAt, setAutosaveAt] = useState<string | null>(null);
  const lastSessionRef = useRef(session.session);
  useEffect(() => {
    if (lastSessionRef.current === session.session) return;
    lastSessionRef.current = session.session;
    setAutosave("saving");
    const t = setTimeout(() => {
      setAutosave("saved");
      setAutosaveAt(new Date().toISOString());
    }, 260); // matches session-store debounce + a small buffer
    return () => clearTimeout(t);
  }, [session.session]);

  // Global "?" toggles the shortcuts help drawer.
  useEffect(() => {
    const def = HOTKEYS.find((h) => h.id === "toggle_help")!;
    function onKey(e: KeyboardEvent) {
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === "INPUT" || tgt.tagName === "TEXTAREA" || tgt.isContentEditable))
        return;
      if (matchHotkey(e, def)) {
        e.preventDefault();
        setShowHelp((s) => !s);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const appendToNotes = useCallback(
    (text: string) => {
      const prev = session.session.notes ?? "";
      const sep = prev && !prev.endsWith("\n") ? "\n" : "";
      session.setNotes(`${prev}${sep}${text}`);
    },
    [session],
  );

  // Derived: ordered visible steps + active step hint for the header & guide.
  const orderedVisible = useMemo(() => {
    if (!flow) return [];
    const steps = enabledSteps(flow);
    const visible = computeVisibleStepIds(steps, session.session.values);
    return steps.filter((s) => visible.has(s.id));
  }, [flow, session.session.values]);

  const currentStep = useMemo(() => {
    if (!session.session.currentStepId) return null;
    return orderedVisible.find((s) => s.id === session.session.currentStepId) ?? null;
  }, [orderedVisible, session.session.currentStepId]);

  const stepPosition = useMemo(() => {
    if (orderedVisible.length === 0) return null;
    const idx = currentStep
      ? orderedVisible.findIndex((s) => s.id === currentStep.id) + 1
      : Math.min(session.session.completedStepIds.length, orderedVisible.length);
    return { current: Math.max(1, idx), total: orderedVisible.length };
  }, [orderedVisible, currentStep, session.session.completedStepIds.length]);

  const requiredRemaining = useMemo(
    () =>
      orderedVisible.filter(
        (s) =>
          s.required &&
          !session.session.completedStepIds.includes(s.id) &&
          s.id !== currentStep?.id,
      ).length,
    [orderedVisible, session.session.completedStepIds, currentStep],
  );

  const currentStepHint = useMemo(
    () => (currentStep ? { type: currentStep.type, title: currentStep.title } : null),
    [currentStep],
  );

  // Phase: rule-based transfer directory. Additive panel — runner behavior
  // is unchanged when no entries/rules are configured.
  const { data: transferConfig } = useTransferDirectoryConfig(campaignId);
  const transferContext = useMemo<TransferEvaluationContext>(() => {
    const v = session.session.values;
    return {
      stepId: session.session.currentStepId,
      urgency: ((v.__urgency__ as Urgency) ?? null) as Urgency | null,
      disposition: (v.__outcome__ as string) ?? null,
      issueType: (v.__issue_type__ as string) ?? (v.issue_type as string) ?? null,
      specialty: (v.__specialty__ as string) ?? (v.specialty as string) ?? null,
      branch: (v.__branch_label__ as string) ?? null,
      timeMode: (v.__time_mode__ as HoursBehavior) ?? null,
      transferGroup: (v.__transfer_group__ as string) ?? null,
      capturedFields: v,
    };
  }, [session.session.values, session.session.currentStepId]);
  const transferResult = useTransferRecommendations(transferConfig, transferContext);

  // External resources — additive contextual surface.
  const { data: externalConfig } = useExternalResourcesConfig(campaignId);
  const externalContext = useMemo<ResourceEvaluationContext>(() => {
    const v = session.session.values;
    const runtime: ResourceRuntimeValues = {
      ani: meta.ani ?? null,
      callId: meta.callId ?? null,
      sessionId: meta.callId ?? null,
      issueType: (v.__issue_type__ as string) ?? (v.issue_type as string) ?? null,
      specialty: (v.__specialty__ as string) ?? null,
      urgency: (v.__urgency__ as string) ?? null,
      campaignId: meta.campaignId,
      campaignName: meta.campaignName ?? null,
      workspaceId: meta.workspaceId,
      workspaceName: meta.workspaceName ?? null,
      disposition: (v.__outcome__ as string) ?? null,
      callerName: (v.caller_name as string) ?? null,
      callerEmail: (v.caller_email as string) ?? null,
      capturedFields: v,
    };
    return {
      issueType: runtime.issueType,
      specialty: runtime.specialty,
      urgency: (runtime.urgency as ResourceUrgency) ?? null,
      stepId: session.session.currentStepId,
      branch: (v.__branch_label__ as string) ?? null,
      disposition: runtime.disposition,
      transferGroup: (v.__transfer_group__ as string) ?? null,
      embedMode: "internal",
      timeMode: (v.__time_mode__ as HoursBehavior) ?? null,
      capturedFields: v,
      runtime,
      viewportWidth: typeof window !== "undefined" ? window.innerWidth : null,
    };
  }, [session.session.values, session.session.currentStepId, meta]);
  const externalResult = useExternalResources(externalConfig, externalContext);

  const handleResourceEvent = useCallback(
    (event: ResourceEvent) => {
      recordEvent(session.session, { setValue: session.setValue }, event);
    },
    [session.session, session.setValue],
  );
  const handleResourcesSurfaced = useCallback(
    (resources: Parameters<typeof surfaceEvaluated>[2]) => {
      surfaceEvaluated(session.session, { setValue: session.setValue }, resources, externalContext);
    },
    [session.session, session.setValue, externalContext],
  );



  const onSubmit = async () => {
    if (!flow) {
      toast.error("No published flow to submit against.");
      return;
    }
    setSubmitting(true);
    setSubmissionState("submitting");
    try {
      const payload = buildInteractionPayload(session.session, copilot);
      const res = await submitInteractionDraft(payload);
      session.markFinalized();
      if (res.pipelineStatus === "accepted") {
        setSubmissionState("accepted");
        toast.success("Interaction submitted");
      } else {
        setSubmissionState("deferred");
        toast.success("Interaction queued for processing");
      }
    } catch (e) {
      setSubmissionState("error");
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
    return <div className="p-6 text-sm">Workspace not found or you do not have access.</div>;
  }

  return (
    <main
      className="h-dvh flex flex-col gap-3 p-3 bg-background"
      data-testid="live-call-runner"
      aria-label="Live call runner"
    >
      <SessionHeader
        meta={meta}
        resumed={session.resumed}
        onReset={session.reset}
        branchLabel={(session.session.values.__branch_label__ as string | undefined) ?? null}
        stepPosition={stepPosition}
        requiredRemaining={requiredRemaining}
        autosave={autosave}
        autosaveSavedAt={autosaveAt}
      />
      <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)_340px] gap-3 flex-1 min-h-0">
        <GuidePanel
          guide={guide ?? null}
          isLoading={guideLoading}
          onAppendToNotes={appendToNotes}
          currentStepHint={currentStepHint}
        />
        <FlowPanel
          flow={flow ?? null}
          isLoading={flowLoading}
          session={session.session}
          onValueChange={session.setValue}
          onCurrentStep={session.setCurrentStepId}
          onCompleted={session.pushCompleted}
          onSubmit={onSubmit}
          submitting={submitting}
          submissionState={submissionState}
        />
        <div className="flex flex-col gap-3 min-h-0">
          <CopilotPanel
            copilot={copilot}
            feedback={copilot.feedback}
            onRate={copilot.rate}
            notes={session.session.notes}
            onNotesChange={session.setNotes}
            onInsertIntoNotes={appendToNotes}
            notesAutosave={autosave}
            notesSavedAt={autosaveAt}
          />
          <TransferDirectoryPanel
            result={transferResult}
            onAppendToNotes={appendToNotes}
            compact
          />
        </div>

      </div>
      <ShortcutsHelp open={showHelp} onOpenChange={setShowHelp} />
    </main>
  );
}

// Re-export sentinel so chrome-neutralization tests can verify the route file
// exists without leaking legal vocabulary.
export { LiveCallRunnerInner };
