/**
 * Read/write the publish config stored at `campaigns.metadata.publish`.
 *
 * Writes go through a metadata-preserving patch so unrelated keys are never
 * clobbered. Token regeneration is a separate mutation that never logs the
 * raw value — callers receive it once and should only re-fetch after a
 * deliberate refresh.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  applyPublishPatch,
  generatePublishToken,
  normalizePublishConfig,
  readPublishConfigFromMetadata,
} from "@/lib/campaign-publish/publishConfig";
import {
  DEFAULT_PUBLISH_CONFIG,
  type CampaignPublishConfig,
} from "@/lib/campaign-publish/types";

const KEY = ["campaign-publish-config"] as const;

async function fetchMetadata(campaignId: string): Promise<unknown> {
  const { data, error } = await supabase
    .from("campaigns")
    .select("metadata")
    .eq("id", campaignId)
    .maybeSingle();
  if (error) throw error;
  return data?.metadata ?? {};
}

export function useCampaignPublishConfig(campaignId: string | undefined) {
  return useQuery({
    queryKey: [...KEY, campaignId ?? null],
    enabled: !!campaignId,
    queryFn: async (): Promise<CampaignPublishConfig> => {
      const meta = await fetchMetadata(campaignId!);
      return readPublishConfigFromMetadata(meta);
    },
  });
}

export function useUpdateCampaignPublishConfig(campaignId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<CampaignPublishConfig>) => {
      if (!campaignId) throw new Error("Missing campaign id");
      const meta = await fetchMetadata(campaignId);
      const nextMeta = applyPublishPatch(meta, patch);
      const { error } = await supabase
        .from("campaigns")
        .update({ metadata: nextMeta as never })
        .eq("id", campaignId);
      if (error) throw error;
      return normalizePublishConfig((nextMeta as { publish: unknown }).publish) ??
        DEFAULT_PUBLISH_CONFIG;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...KEY, campaignId] });
      toast.success("Publish settings updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Generate a new token and persist it. Returns the raw token to the caller
 *  exactly once; subsequent fetches go through the standard read path. The
 *  token is never logged. */
export function useRegeneratePublishToken(campaignId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<{ token: string }> => {
      if (!campaignId) throw new Error("Missing campaign id");
      const token = generatePublishToken();
      const meta = await fetchMetadata(campaignId);
      const nextMeta = applyPublishPatch(meta, { access: "token", token });
      const { error } = await supabase
        .from("campaigns")
        .update({ metadata: nextMeta as never })
        .eq("id", campaignId);
      if (error) throw error;
      return { token };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...KEY, campaignId] });
      toast.success("New access token generated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
