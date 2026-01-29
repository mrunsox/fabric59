import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tenant, TenantFormData, CrmType, TenantStatus } from "@/types/database";
import { toast } from "sonner";

export function useTenants() {
  return useQuery({
    queryKey: ["tenants"],
    queryFn: async (): Promise<Tenant[]> => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our Tenant type
      return (data || []).map((row) => ({
        id: row.id,
        name: row.name,
        crm_type: row.crm_type as CrmType,
        crm_api_url: row.crm_api_url,
        crm_api_key: row.crm_api_key,
        custom_mappings: (row.custom_mappings || {}) as Record<string, unknown>,
        webhook_url: row.webhook_url,
        status: row.status as TenantStatus,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
    },
  });
}

export function useTenant(id: string) {
  return useQuery({
    queryKey: ["tenants", id],
    queryFn: async (): Promise<Tenant | null> => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        name: data.name,
        crm_type: data.crm_type as CrmType,
        crm_api_url: data.crm_api_url,
        crm_api_key: data.crm_api_key,
        custom_mappings: (data.custom_mappings || {}) as Record<string, unknown>,
        webhook_url: data.webhook_url,
        status: data.status as TenantStatus,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    },
    enabled: !!id,
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TenantFormData) => {
      const { error } = await supabase.from("tenants").insert([
        {
          name: data.name,
          crm_type: data.crm_type,
          crm_api_url: data.crm_api_url || null,
          crm_api_key: data.crm_api_key || null,
          webhook_url: data.webhook_url || null,
          status: data.status,
        },
      ]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("Tenant created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create tenant: ${error.message}`);
    },
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TenantFormData> }) => {
      const { error } = await supabase
        .from("tenants")
        .update({
          name: data.name,
          crm_type: data.crm_type,
          crm_api_url: data.crm_api_url || null,
          crm_api_key: data.crm_api_key || null,
          webhook_url: data.webhook_url || null,
          status: data.status,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("Tenant updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update tenant: ${error.message}`);
    },
  });
}

export function useDeleteTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tenants").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("Tenant deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete tenant: ${error.message}`);
    },
  });
}
