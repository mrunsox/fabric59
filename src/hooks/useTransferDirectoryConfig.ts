/**
 * Read/write the transfer directory config stored at
 * `campaigns.metadata.transferDirectory`.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  applyTransferDirectoryPatch,
  readTransferDirectoryFromMetadata,
} from "@/lib/transfer-directory/normalize";
import type { TransferDirectoryConfig } from "@/lib/transfer-directory/types";

const KEY = ["transfer-directory-config"] as const;

async function fetchMetadata(campaignId: string): Promise<unknown> {
  const { data, error } = await supabase
    .from("campaigns")
    .select("metadata")
    .eq("id", campaignId)
    .maybeSingle();
  if (error) throw error;
  return data?.metadata ?? {};
}

export function useTransferDirectoryConfig(campaignId: string | undefined) {
  return useQuery({
    queryKey: [...KEY, campaignId ?? null],
    enabled: !!campaignId,
    queryFn: async (): Promise<TransferDirectoryConfig> => {
      const meta = await fetchMetadata(campaignId!);
      return readTransferDirectoryFromMetadata(meta);
    },
  });
}

export function useUpdateTransferDirectoryConfig(campaignId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (next: TransferDirectoryConfig) => {
      if (!campaignId) throw new Error("Missing campaign id");
      const meta = await fetchMetadata(campaignId);
      const nextMeta = applyTransferDirectoryPatch(meta, next);
      const { error } = await supabase
        .from("campaigns")
        .update({ metadata: nextMeta as never })
        .eq("id", campaignId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...KEY, campaignId] });
      toast.success("Transfer directory saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
