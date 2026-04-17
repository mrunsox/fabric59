import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface AssistantConfig {
  id: string;
  organization_id: string;
  enabled: boolean;
  assistant_name: string;
  greeting: string;
  tone: string;
}

export function useAssistantConfig() {
  const { organization } = useAuth();
  return useQuery({
    queryKey: ["assistant-config", organization?.id],
    queryFn: async (): Promise<AssistantConfig | null> => {
      if (!organization?.id) return null;
      const { data, error } = await supabase
        .from("assistant_config")
        .select("*")
        .eq("organization_id", organization.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!organization?.id,
  });
}

export function useSaveAssistantConfig() {
  const qc = useQueryClient();
  const { organization } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<Omit<AssistantConfig, "id" | "organization_id">>) => {
      if (!organization?.id) throw new Error("No organization");
      const { error } = await supabase
        .from("assistant_config")
        .upsert(
          { organization_id: organization.id, ...input },
          { onConflict: "organization_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assistant-config"] });
      toast.success("Assistant settings saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
