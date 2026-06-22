/**
 * Workspace setup readiness — Phase 2.
 *
 * Composes existing signals into a single workspace-level checklist used
 * by the Campaigns landing, Cockpit, and other setup surfaces. Read-only:
 * no writes, no schema additions, no new product capabilities.
 *
 * Each step maps to one explicit backend signal — see `STEP_SIGNAL_MAP`
 * in the returned `steps`. The labels are deliberately honest about what
 * the signal proves (e.g. "Business Brain seeded" reflects fact count ≥ 1,
 * not complete knowledge).
 */
import { useMemo } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspaceCampaigns } from "@/hooks/useWorkspaceCampaigns";
import { useWorkspaceIntegrationConnections } from "@/hooks/useWorkspaceIntegrations";
import { useDispositions } from "@/hooks/useDispositions";
import { supabase } from "@/integrations/supabase/client";
import { WORKSPACE_GUIDE_SINGLETON_NAME } from "@/types/workspace-guide";
import {
  fetchCanonicalCampaignReadiness,
  isCampaignReady,
  type CanonicalCampaignReadiness,
} from "@/lib/readiness/canonicalCampaignReadiness";

export type WorkspaceSetupStepKey =
  | "identity"
  | "knowledge"
  | "channel"
  | "workspace_guide"
  | "first_campaign"
  | "dispositions"
  | "campaign_ready"
  | "cockpit_ready";

export interface WorkspaceSetupStep {
  key: WorkspaceSetupStepKey;
  label: string;
  hint: string;
  done: boolean;
  href: string;
  /** Short, human-readable description of the signal that drives `done`. */
  signal: string;
}

export interface WorkspaceSetupReadiness {
  steps: WorkspaceSetupStep[];
  completed: number;
  total: number;
  isReady: boolean;
  /** First incomplete step (for "continue setup" CTA). */
  nextStep: WorkspaceSetupStep | null;
  isLoading: boolean;
}

interface ComputeInput {
  workspaceId: string | null;
  workspaceName: string | null;
  hasIdentity: boolean;
  factCount: number;
  hasConnectedChannel: boolean;
  workspaceGuidePublished: boolean;
  campaignCount: number;
  dispositionCount: number;
  anyCampaignReady: boolean;
}

/**
 * Pure step computation. Exported so it can be unit-tested without hitting
 * react-query / supabase.
 */
export function computeWorkspaceSetupSteps(
  input: ComputeInput,
): WorkspaceSetupStep[] {
  const base = input.workspaceId ? `/w/${input.workspaceId}` : "/";
  const steps: WorkspaceSetupStep[] = [
    {
      key: "identity",
      label: "Workspace identity set",
      hint: "Name and basic settings for this workspace.",
      done: input.hasIdentity,
      href: `${base}/settings`,
      signal: "Workspace name is non-empty",
    },
    {
      key: "knowledge",
      label: "Business Brain seeded",
      hint: "At least one approved fact in the workspace Brain.",
      done: input.factCount >= 1,
      href: `${base}/knowledge`,
      signal: "bb_facts (approved) count ≥ 1",
    },
    {
      key: "channel",
      label: "Channel connected",
      hint: "At least one integration connection is connected.",
      done: input.hasConnectedChannel,
      href: `${base}/integrations`,
      signal: "integration_connections.status = 'connected' (≥ 1)",
    },
    {
      key: "workspace_guide",
      label: "Workspace guide published",
      hint: "The canonical workspace guide is published.",
      done: input.workspaceGuidePublished,
      href: `${base}/guide`,
      signal:
        "guides.status='published' where name = WORKSPACE_GUIDE_SINGLETON_NAME",
    },
    {
      key: "first_campaign",
      label: "First campaign created",
      hint: "At least one campaign exists in this workspace.",
      done: input.campaignCount >= 1,
      href: `${base}/campaigns`,
      signal: "campaigns (workspace-scoped) count ≥ 1",
    },
    {
      key: "dispositions",
      label: "Dispositions configured",
      hint: "Disposition labels available to agents.",
      done: input.dispositionCount >= 1,
      href: `${base}/dispositions`,
      signal: "disposition_access (org-scoped) count ≥ 1",
    },
    {
      key: "campaign_ready",
      label: "Campaign reaches publish-ready",
      hint: "Some campaign passes all four canonical readiness checks.",
      done: input.anyCampaignReady,
      href: `${base}/campaigns`,
      signal:
        "canonicalCampaignReadiness — firmGuide + flow + intake + notifications, for ≥ 1 campaign",
    },
    {
      key: "cockpit_ready",
      label: "Cockpit ready to take calls",
      hint: "All preceding setup steps complete.",
      done: false, // computed below
      href: `${base}/agent`,
      signal: "All preceding steps satisfied",
    },
  ];

  // Cockpit step is purely derivative of the rest.
  const rest = steps.slice(0, -1);
  steps[steps.length - 1].done = rest.every((s) => s.done);
  return steps;
}

export function useWorkspaceSetupReadiness(): WorkspaceSetupReadiness {
  const { workspace } = useWorkspace();
  const { organization } = useAuth();
  const workspaceId = workspace?.id ?? null;

  const campaignsQ = useWorkspaceCampaigns();
  const connectionsQ = useWorkspaceIntegrationConnections();
  const dispositionsQ = useDispositions();

  const factCountQ = useQuery({
    queryKey: ["bb-fact-count-setup", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<number> => {
      const { count } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("bb_facts" as any)
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId!)
        .eq("verification_state", "approved");
      return count ?? 0;
    },
  });

  const guidePublishedQ = useQuery({
    queryKey: ["workspace-guide-published", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<boolean> => {
      const { data } = await supabase
        .from("guides")
        .select("status")
        .eq("workspace_id", workspaceId!)
        .eq("name", WORKSPACE_GUIDE_SINGLETON_NAME)
        .is("source_type", null)
        .maybeSingle();
      return data?.status === "published";
    },
  });

  const campaigns = campaignsQ.data ?? [];
  const campaignReadinessQs = useQueries({
    queries: campaigns.map((c) => ({
      queryKey: ["canonical-campaign-readiness", workspaceId, c.id],
      enabled: !!workspaceId,
      queryFn: () => fetchCanonicalCampaignReadiness(workspaceId!, c.id),
    })),
  });

  const anyCampaignReady = useMemo(
    () =>
      campaignReadinessQs.some((q) =>
        q.data ? isCampaignReady(q.data as CanonicalCampaignReadiness) : false,
      ),
    [campaignReadinessQs],
  );

  const hasConnectedChannel = (connectionsQ.data ?? []).some(
    (c) => c.status === "connected",
  );

  const steps = useMemo(
    () =>
      computeWorkspaceSetupSteps({
        workspaceId,
        workspaceName: workspace?.name ?? null,
        hasIdentity: !!workspace?.name && (workspace?.name?.trim().length ?? 0) > 0,
        factCount: factCountQ.data ?? 0,
        hasConnectedChannel,
        workspaceGuidePublished: !!guidePublishedQ.data,
        campaignCount: campaigns.length,
        dispositionCount: (dispositionsQ.data ?? []).length,
        anyCampaignReady,
      }),
    [
      workspaceId,
      workspace?.name,
      factCountQ.data,
      hasConnectedChannel,
      guidePublishedQ.data,
      campaigns.length,
      dispositionsQ.data,
      anyCampaignReady,
    ],
  );

  const completed = steps.filter((s) => s.done).length;
  const nextStep = steps.find((s) => !s.done) ?? null;
  const isLoading =
    campaignsQ.isLoading ||
    connectionsQ.isLoading ||
    dispositionsQ.isLoading ||
    factCountQ.isLoading ||
    guidePublishedQ.isLoading;

  // Suppress unused warning for organization (kept for future per-org gating).
  void organization;

  return {
    steps,
    completed,
    total: steps.length,
    isReady: completed === steps.length,
    nextStep,
    isLoading,
  };
}
