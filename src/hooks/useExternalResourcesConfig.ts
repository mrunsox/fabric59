/**
 * Read/write the external-resources config stored at
 * `campaigns.metadata.externalResources`.
 *
 * Sibling-safe: other metadata keys (`publish`, `transferDirectory`, etc.)
 * are preserved by `applyExternalResourcesPatch`.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  applyExternalResourcesPatch,
  normalizeExternalResources,
  readExternalResourcesFromMetadata,
} from "@/lib/external-resources/normalize";
import type { ExternalResourcesConfig } from "@/lib/external-resources/types";

const KEY = ["external-resources-config"] as const;

async function fetchMetadata(campaignId: string): Promise<unknown> {
  const { data, error } = await supabase
    .from("campaigns")
    .select("metadata")
    .eq("id", campaignId)
    .maybeSingle();
  if (error) throw error;
  return data?.metadata ?? {};
}

export function useExternalResourcesConfig(campaignId: string | undefined) {
  return useQuery({
    queryKey: [...KEY, campaignId ?? null],
    enabled: !!campaignId,
    queryFn: async (): Promise<ExternalResourcesConfig> => {
      const meta = await fetchMetadata(campaignId!);
      return readExternalResourcesFromMetadata(meta);
    },
  });
}

export function useUpdateExternalResourcesConfig(campaignId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (next: ExternalResourcesConfig) => {
      if (!campaignId) throw new Error("Missing campaign id");
      const meta = await fetchMetadata(campaignId);
      const nextMeta = applyExternalResourcesPatch(meta, normalizeExternalResources(next));
      const { error } = await supabase
        .from("campaigns")
        .update({ metadata: nextMeta as never })
        .eq("id", campaignId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...KEY, campaignId] });
      toast.success("External resources saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
