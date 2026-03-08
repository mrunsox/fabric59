import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Partner, PartnerFormData } from "@/types/database";
import { toast } from "sonner";

export function usePartners() {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ["partners", organization?.id],
    queryFn: async (): Promise<Partner[]> => {
      const { data, error } = await supabase
        .from("partners" as any)
        .select("*")
        .eq("organization_id", organization!.id)
        .order("name");

      if (error) throw error;
      return (data || []) as unknown as Partner[];
    },
    enabled: !!organization?.id,
  });
}

export function usePartner(id: string) {
  return useQuery({
    queryKey: ["partners", "detail", id],
    queryFn: async (): Promise<Partner | null> => {
      const { data, error } = await supabase
        .from("partners" as any)
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return (data as unknown as Partner) || null;
    },
    enabled: !!id,
  });
}

export function useCreatePartner() {
  const queryClient = useQueryClient();
  const { organization } = useAuth();

  return useMutation({
    mutationFn: async (data: PartnerFormData) => {
      const { error } = await supabase
        .from("partners" as any)
        .insert([{
          organization_id: organization!.id,
          name: data.name,
          slug: data.slug,
          status: data.status || "active",
          integration_configs: data.integration_configs || {},
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      toast.success("Partner created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create partner: ${error.message}`);
    },
  });
}

export function useUpdatePartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PartnerFormData> }) => {
      const updateData: Record<string, unknown> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.slug !== undefined) updateData.slug = data.slug;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.integration_configs !== undefined) updateData.integration_configs = data.integration_configs;

      const { error } = await supabase
        .from("partners" as any)
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      toast.success("Partner updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update partner: ${error.message}`);
    },
  });
}

export function useDeletePartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("partners" as any)
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      toast.success("Partner deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete partner: ${error.message}`);
    },
  });
}
