/**
 * Phase 5 — useInCallKnowledgeBin
 *
 * Composes existing data hooks into a resolved runtime Knowledge Bin for the
 * active call. Approved facts are read directly from the Business Brain
 * selector (`getAssistFactsForSession`), NOT via `useBusinessBrainAssist`,
 * to keep that hook as a consumer of the bin instead of the source of truth.
 *
 * Frontend-only. No mutations.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useDispositions } from "@/hooks/useDispositions";
import { usePublishedSingletonGuide } from "@/hooks/useWorkspaceCanonicalGuide";
import { useWorkspaceGuides } from "@/hooks/useWorkspaceGuides";
import { useCurrentGuideVersion } from "@/hooks/useGuideVersions";
import { useFormSchema, useWorkspaceForm } from "@/hooks/useWorkspaceForms";
import { migrateWorkspaceGuideContent } from "@/lib/workspace-guide/schema";
import { getAssistFactsForSession } from "@/lib/business-brain/bridge/assist";
import {
  buildKnowledgeBin,
  type KnowledgeBin,
  type KnowledgeBinSessionContext,
  type KnowledgeBinCampaignContext,
} from "@/lib/workspace/cockpit/knowledgeBin";

export interface UseInCallKnowledgeBinInput {
  campaign: KnowledgeBinCampaignContext | null;
  formId: string | null;
  /** Session-shaped runtime context (synthesized by the cockpit page). */
  session: KnowledgeBinSessionContext;
  /** Optional client scope for BB facts. */
  clientId?: string | null;
}

export interface UseInCallKnowledgeBinResult {
  bin: KnowledgeBin | null;
  isLoading: boolean;
  hasCanonicalGuide: boolean;
  hasApprovedFacts: boolean;
}

export function useInCallKnowledgeBin(
  input: UseInCallKnowledgeBinInput,
): UseInCallKnowledgeBinResult {
  const { workspace } = useWorkspace();

  const formQ = useWorkspaceForm(input.formId ?? undefined);
  const schemaQ = useFormSchema(input.formId ?? undefined);
  const canonicalQ = usePublishedSingletonGuide();
  const supplementaryListQ = useWorkspaceGuides({
    campaignId: input.campaign?.id ?? null,
  });
  const supplementary = supplementaryListQ.data?.[0] ?? null;
  const supplementaryVersionQ = useCurrentGuideVersion(supplementary?.id);

  const dispositionsQ = useDispositions();

  const factsQ = useQuery({
    queryKey: [
      "in-call-knowledge-bin-facts",
      workspace?.id ?? null,
      input.clientId ?? null,
    ],
    enabled: !!workspace,
    staleTime: 60_000,
    queryFn: () =>
      getAssistFactsForSession({
        workspaceId: workspace!.id,
        clientId: input.clientId ?? undefined,
        limit: 80,
      }),
  });

  const bin = useMemo<KnowledgeBin | null>(() => {
    if (!workspace) return null;
    const supContent = supplementaryVersionQ.data?.content
      ? migrateWorkspaceGuideContent(supplementaryVersionQ.data.content)
      : null;
    return buildKnowledgeBin({
      workspaceId: workspace.id,
      workspaceName: workspace.name ?? null,
      campaign: input.campaign,
      form: formQ.data
        ? { id: formQ.data.id, name: formQ.data.name }
        : input.formId
          ? { id: input.formId, name: "Intake form" }
          : null,
      schema: schemaQ.data ?? null,
      canonicalGuide: canonicalQ.data ?? null,
      supplementaryGuide:
        supplementary && supContent
          ? {
              id: supplementary.id,
              name: supplementary.name,
              sections: supContent.sections,
            }
          : null,
      approvedFacts: factsQ.data ?? [],
      dispositions: (dispositionsQ.data ?? []).map((d) => ({
        id: d.id,
        name: d.name,
      })),
      session: input.session,
    });
  }, [
    workspace,
    input.campaign,
    input.formId,
    input.session,
    formQ.data,
    schemaQ.data,
    canonicalQ.data,
    supplementary,
    supplementaryVersionQ.data,
    factsQ.data,
    dispositionsQ.data,
  ]);

  return {
    bin,
    isLoading:
      formQ.isLoading ||
      schemaQ.isLoading ||
      canonicalQ.isLoading ||
      factsQ.isLoading ||
      dispositionsQ.isLoading,
    hasCanonicalGuide: !!canonicalQ.data && canonicalQ.data.sections.length > 0,
    hasApprovedFacts: (factsQ.data ?? []).length > 0,
  };
}
