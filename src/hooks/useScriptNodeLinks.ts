import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useScriptNodeLinks(scriptId?: string) {
  return useQuery({
    queryKey: ["script-node-links", scriptId],
    queryFn: async () => {
      if (!scriptId) return [];
      const { data, error } = await supabase
        .from("script_node_links")
        .select("*")
        .eq("script_id", scriptId)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!scriptId,
  });
}

export function useUpsertScriptNodeLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      script_id: string;
      node_id: string;
      url: string;
      label?: string;
    }) => {
      const { data, error } = await supabase
        .from("script_node_links")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["script-node-links", d.script_id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteScriptNodeLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, scriptId }: { id: string; scriptId: string }) => {
      const { error } = await supabase.from("script_node_links").delete().eq("id", id);
      if (error) throw error;
      return scriptId;
    },
    onSuccess: (scriptId) => {
      qc.invalidateQueries({ queryKey: ["script-node-links", scriptId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
