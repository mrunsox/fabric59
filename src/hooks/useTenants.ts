import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tenant, TenantFormData, CrmType, TenantStatus, NotificationTriggers } from "@/types/database";
import { toast } from "sonner";

const DEFAULT_NOTIFICATION_TRIGGERS: NotificationTriggers = {
  intake_created: false,
  call_ended: false,
  contact_updated: false,
};

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
        organization_id: row.organization_id ?? null,
        five9_domain_id: row.five9_domain_id ?? null,
        crm_type: row.crm_type as CrmType,
        crm_api_url: row.crm_api_url,
        crm_api_key: row.crm_api_key,
        custom_mappings: (row.custom_mappings || {}) as Record<string, unknown>,
        webhook_url: row.webhook_url,
        slack_webhook_url: row.slack_webhook_url,
        zapier_webhook_url: (row as Record<string, unknown>).zapier_webhook_url as string | null ?? null,
        make_webhook_url: (row as Record<string, unknown>).make_webhook_url as string | null ?? null,
        pabbly_webhook_url: (row as Record<string, unknown>).pabbly_webhook_url as string | null ?? null,
        n8n_webhook_url: (row as Record<string, unknown>).n8n_webhook_url as string | null ?? null,
        notification_triggers: (row.notification_triggers as unknown as NotificationTriggers) || DEFAULT_NOTIFICATION_TRIGGERS,
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
        organization_id: data.organization_id ?? null,
        five9_domain_id: data.five9_domain_id ?? null,
        crm_type: data.crm_type as CrmType,
        crm_api_url: data.crm_api_url,
        crm_api_key: data.crm_api_key,
        custom_mappings: (data.custom_mappings || {}) as Record<string, unknown>,
        webhook_url: data.webhook_url,
        slack_webhook_url: data.slack_webhook_url,
        zapier_webhook_url: (data as Record<string, unknown>).zapier_webhook_url as string | null ?? null,
        make_webhook_url: (data as Record<string, unknown>).make_webhook_url as string | null ?? null,
        pabbly_webhook_url: (data as Record<string, unknown>).pabbly_webhook_url as string | null ?? null,
        n8n_webhook_url: (data as Record<string, unknown>).n8n_webhook_url as string | null ?? null,
        notification_triggers: (data.notification_triggers as unknown as NotificationTriggers) || DEFAULT_NOTIFICATION_TRIGGERS,
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
          slack_webhook_url: data.slack_webhook_url || null,
          zapier_webhook_url: data.zapier_webhook_url || null,
          make_webhook_url: data.make_webhook_url || null,
          pabbly_webhook_url: data.pabbly_webhook_url || null,
          n8n_webhook_url: data.n8n_webhook_url || null,
          notification_triggers: data.notification_triggers as unknown as Record<string, boolean>,
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
      const updateData: Record<string, unknown> = {};
      
      if (data.name !== undefined) updateData.name = data.name;
      if (data.crm_type !== undefined) updateData.crm_type = data.crm_type;
      if (data.crm_api_url !== undefined) updateData.crm_api_url = data.crm_api_url || null;
      if (data.crm_api_key !== undefined) updateData.crm_api_key = data.crm_api_key || null;
      if (data.webhook_url !== undefined) updateData.webhook_url = data.webhook_url || null;
      if (data.slack_webhook_url !== undefined) updateData.slack_webhook_url = data.slack_webhook_url || null;
      if (data.zapier_webhook_url !== undefined) updateData.zapier_webhook_url = data.zapier_webhook_url || null;
      if (data.make_webhook_url !== undefined) updateData.make_webhook_url = data.make_webhook_url || null;
      if (data.pabbly_webhook_url !== undefined) updateData.pabbly_webhook_url = data.pabbly_webhook_url || null;
      if (data.n8n_webhook_url !== undefined) updateData.n8n_webhook_url = data.n8n_webhook_url || null;
      if (data.notification_triggers !== undefined) updateData.notification_triggers = data.notification_triggers as unknown as Record<string, boolean>;
      if (data.status !== undefined) updateData.status = data.status;

      const { error } = await supabase
        .from("tenants")
        .update(updateData)
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
