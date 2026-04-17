import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface QrDidMapping {
  id: string;
  organization_id: string;
  tenant_id: string | null;
  did: string;
  label: string | null;
  source_channel: string;
  routing_config_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useQrDidMappings() {
  const { organization } = useAuth();
  return useQuery({
    queryKey: ["qr_did_mappings", organization?.id],
    queryFn: async (): Promise<QrDidMapping[]> => {
      if (!organization?.id) return [];
      const { data, error } = await supabase
        .from("qr_did_mappings")
        .select("*")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as QrDidMapping[];
    },
    enabled: !!organization?.id,
  });
}

export function useUpsertQrDidMapping() {
  const qc = useQueryClient();
  const { organization } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<QrDidMapping> & { did: string }) => {
      if (!organization?.id) throw new Error("No organization");
      const payload = { ...input, organization_id: organization.id };
      if (input.id) {
        const { error } = await supabase
          .from("qr_did_mappings")
          .update(payload)
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("qr_did_mappings").insert([payload as any]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["qr_did_mappings"] });
      toast.success("QR routing saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteQrDidMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("qr_did_mappings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["qr_did_mappings"] });
      toast.success("QR routing removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
