/**
 * Embed campaign runner page.
 *
 * Mounted OUTSIDE the authenticated app shell at `/embed/c/:campaignId`.
 * Resolves the campaign through the `campaign-embed-resolve` edge function
 * (service-role read with publish + token gating), then renders the chromeless
 * EmbedShell.
 *
 * Internal preview reuses this same page at
 * `/w/:workspaceId/campaigns/:campaignId/embed-preview` so admins can verify
 * exactly what Five9 will see.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { EmbedShell } from "@/components/embed/EmbedShell";
import { EmbedHeader } from "@/components/embed/EmbedHeader";
import { TransferDirectoryPanel } from "@/components/transfer-directory/TransferDirectoryPanel";
import { ExternalResourcesPanel } from "@/components/external-resources/ExternalResourcesPanel";

import {
  buildEmbedRuntimeContext,
  extractAccessToken,
} from "@/lib/campaign-publish/runtimeContext";
import { normalizeTransferDirectory } from "@/lib/transfer-directory/normalize";
import { evaluateTransferRules } from "@/lib/transfer-directory/evaluateRules";
import { normalizeExternalResources } from "@/lib/external-resources/normalize";
import { evaluateResources } from "@/lib/external-resources/evaluateResources";
import { recordEvent, surfaceEvaluated } from "@/lib/external-resources/events";
import { useCallRunnerSession } from "@/hooks/useCallRunnerSession";
import { useCallCopilot } from "@/hooks/useCallCopilot";

import { FlowPanel } from "@/components/call-runner/FlowPanel";
import { GuidePanel } from "@/components/call-runner/GuidePanel";
import { DraggableStack } from "@/components/call-runner/DraggableStack";
import { useRunnerCardOrder } from "@/hooks/useRunnerCardOrder";

import type { CallSessionMeta } from "@/types/call-runner";
import type { CampaignFlowContent } from "@/types/campaign-flow";
import type { WorkspaceGuideContentV2 } from "@/types/workspace-guide";
import type { EmbedResolvePayload } from "@/lib/campaign-publish/types";
import type {
  ResourceEvaluationContext,
  ResourceEvent,
  ResourceRuntimeValues,
  ResourceUrgency,
} from "@/lib/external-resources/types";

interface ResolveError {
  error: string;
}

async function resolveEmbed(
  campaignId: string,
  token: string | null,
): Promise<EmbedResolvePayload> {
  const { data, error } = await supabase.functions.invoke<EmbedResolvePayload | ResolveError>(
    "campaign-embed-resolve",
    {
      body: { campaignId, token: token ?? undefined },
    },
  );
  if (error) throw new Error("unavailable");
  if (data && "error" in (data as ResolveError)) {
    throw new Error((data as ResolveError).error || "unavailable");
  }
  return data as EmbedResolvePayload;
}

export default function EmbedCampaignRunnerPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const [search] = useSearchParams();

  // Extract token first; never put it into runtime context or render state.
  const token = useMemo(() => extractAccessToken(search), [search]);
  const ctx = useMemo(() => buildEmbedRuntimeContext(search), [search]);

  const startedAtRef = useRef<string>(new Date().toISOString());

  const { data, isLoading, isError } = useQuery({
    queryKey: ["embed-resolve", campaignId, token ? "t" : "0"],
    enabled: !!campaignId,
    retry: false,
    queryFn: () => resolveEmbed(campaignId!, token),
  });

  if (!campaignId) {
    return <TerminalState message="Missing campaign reference." />;
  }
  if (isLoading) {
    return <TerminalState message="Loading…" subtle />;
  }
  if (isError || !data) {
    return <TerminalState message="This campaign is unavailable." />;
  }

  return <ResolvedEmbed payload={data} ctx={ctx} startedAt={startedAtRef.current} />;
}

function TerminalState({ message, subtle }: { message: string; subtle?: boolean }) {
  return (
    <div
      className="h-dvh w-full flex items-center justify-center bg-background text-foreground p-6"
      data-testid="embed-terminal-state"
    >
      <div className={subtle ? "text-sm text-muted-foreground" : "text-sm"}>{message}</div>
    </div>
  );
}

function ResolvedEmbed({
  payload,
  ctx,
  startedAt,
}: {
  payload: EmbedResolvePayload;
  ctx: ReturnType<typeof buildEmbedRuntimeContext>;
  startedAt: string;
}) {
  const flow = (payload.flow as CampaignFlowContent | null) ?? null;
  const guide = (payload.guide as WorkspaceGuideContentV2 | null) ?? null;

  const meta: CallSessionMeta = useMemo(
    () => ({
      workspaceId: payload.workspace.id,
      workspaceName: payload.workspace.name,
      campaignId: payload.campaign.id,
      campaignName: payload.campaign.name,
      callId: ctx.callId,
      ani: ctx.ani,
      startedAt,
    }),
    [payload, ctx, startedAt],
  );

  const session = useCallRunnerSession(meta);
  const copilot = useCallCopilot({ session: session.session, flow, guide });

  const directoryConfig = useMemo(
    () => normalizeTransferDirectory(payload.transferDirectory),
    [payload.transferDirectory],
  );

  const evaluation = useMemo(() => {
    return evaluateTransferRules(directoryConfig, {
      stepId: session.session.currentStepId,
      urgency: (session.session.values.__urgency__ as never) ?? null,
      disposition: (session.session.values.__outcome__ as string) ?? null,
      issueType:
        (session.session.values.__issue_type__ as string) ??
        (session.session.values.issue_type as string) ??
        null,
      specialty:
        (session.session.values.__specialty__ as string) ??
        (session.session.values.specialty as string) ??
        null,
      branch: (session.session.values.__branch_label__ as string) ?? null,
      capturedFields: session.session.values,
    });
  }, [directoryConfig, session.session]);

  // External resources from embed payload (additive — older payloads omit it).
  const externalConfig = useMemo(
    () => normalizeExternalResources(payload.externalResources),
    [payload.externalResources],
  );
  const externalContext = useMemo<ResourceEvaluationContext>(() => {
    const v = session.session.values;
    const runtime: ResourceRuntimeValues = {
      ani: ctx.ani,
      callId: ctx.callId,
      sessionId: ctx.sessionId ?? ctx.callId,
      agentId: ctx.agentId,
      agentName: ctx.agentName,
      issueType: (v.__issue_type__ as string) ?? (v.issue_type as string) ?? null,
      specialty: (v.__specialty__ as string) ?? null,
      urgency: (v.__urgency__ as string) ?? null,
      campaignId: payload.campaign.id,
      campaignName: payload.campaign.name,
      workspaceId: payload.workspace.id,
      workspaceName: payload.workspace.name,
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
      embedMode: ctx.mode === "preview" ? "preview" : ctx.mode === "kiosk" ? "kiosk" : "embed",
      capturedFields: v,
      runtime,
      viewportWidth: typeof window !== "undefined" ? window.innerWidth : null,
    };
  }, [session.session.values, session.session.currentStepId, ctx, payload]);
  const externalResult = useMemo(
    () => evaluateResources(externalConfig, externalContext),
    [externalConfig, externalContext],
  );

  const [submissionState] = useState<
    "idle" | "submitting" | "accepted" | "deferred" | "error"
  >("idle");

  const appendToNotes = (text: string) => {
    const prev = session.session.notes ?? "";
    const sep = prev && !prev.endsWith("\n") ? "\n" : "";
    session.setNotes(`${prev}${sep}${text}`);
  };

  const handleResourceEvent = (event: ResourceEvent) => {
    recordEvent(session.session, { setValue: session.setValue }, event);
  };
  const handleResourcesSurfaced = (resources: Parameters<typeof surfaceEvaluated>[2]) => {
    surfaceEvaluated(session.session, { setValue: session.setValue }, resources, externalContext);
  };

  // Embed mode: submission deferred to admin/internal runner. We render a
  // disabled-looking submit by passing submitting=false and not wiring onSubmit
  // to a network call. Phase 7 pipeline is unchanged.
  const noopSubmit = async () => {
    /* embed runner is read/scribe; finalization happens via Five9-side flow */
  };

  useEffect(() => {
    document.title = `${payload.campaign.name} · Fabric59`;
  }, [payload.campaign.name]);

  return (
    <EmbedShell
      theme={payload.publish.theme as never}
      header={
        <EmbedHeader
          workspaceName={payload.workspace.name}
          campaignName={payload.campaign.name}
          ctx={ctx}
          startedAt={startedAt}
        />
      }
      guide={
        <GuidePanel
          guide={guide}
          isLoading={false}
          onAppendToNotes={appendToNotes}
          currentStepHint={null}
        />
      }
      flow={
        <FlowPanel
          flow={flow}
          isLoading={false}
          session={session.session}
          onValueChange={session.setValue}
          onCurrentStep={session.setCurrentStepId}
          onCompleted={session.pushCompleted}
          onSubmit={noopSubmit}
          submitting={false}
          submissionState={submissionState}
        />
      }
      directory={
        <EmbedRightStack
          campaignId={payload.campaign.id}
          items={[
            {
              id: "transfer",
              label: "Transfer directory",
              node: (
                <TransferDirectoryPanel
                  result={evaluation}
                  emptyHint="No transfer targets are configured for this campaign yet."
                  onAppendToNotes={appendToNotes}
                />
              ),
            },
            {
              id: "resources",
              label: "Resources",
              node: (
                <ExternalResourcesPanel
                  result={externalResult}
                  context={externalContext}
                  onEvent={handleResourceEvent}
                  onSurfaced={handleResourcesSurfaced}
                  onAppendToNotes={appendToNotes}
                  emptyHint="No external resources configured for this campaign yet."
                  compact
                />
              ),
            },
          ]}
        />
      }
    />
  );
}
