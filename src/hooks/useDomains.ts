import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Five9Domain, Five9DomainFormData, Five9DomainStatus, WorkflowSettings } from "@/types/database";
import type { Json } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export function useDomains() {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ["five9_domains", organization?.id],
    queryFn: async (): Promise<Five9Domain[]> => {
      if (!organization) return [];

      const { data, error } = await supabase
        .from("five9_domains")
        .select("*")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((row) => ({
        id: row.id,
        organization_id: row.organization_id,
        domain: row.domain,
        display_name: row.display_name,
        api_key_encrypted: row.api_key_encrypted,
        five9_username: row.five9_username,
        five9_password_encrypted: row.five9_password_encrypted,
        api_connection_status: row.api_connection_status as Five9Domain['api_connection_status'],
        last_connection_test: row.last_connection_test,
        webhook_secret: row.webhook_secret ?? null,
        workflow_settings: (row.workflow_settings || {}) as WorkflowSettings,
        status: row.status as Five9DomainStatus,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
    },
    enabled: !!organization,
  });
}

export function useDomain(id: string) {
  return useQuery({
    queryKey: ["five9_domains", id],
    queryFn: async (): Promise<Five9Domain | null> => {
      const { data, error } = await supabase
        .from("five9_domains")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        organization_id: data.organization_id,
        domain: data.domain,
        display_name: data.display_name,
        api_key_encrypted: data.api_key_encrypted,
        five9_username: data.five9_username,
        five9_password_encrypted: data.five9_password_encrypted,
        api_connection_status: data.api_connection_status as Five9Domain['api_connection_status'],
        last_connection_test: data.last_connection_test,
        workflow_settings: (data.workflow_settings || {}) as WorkflowSettings,
        status: data.status as Five9DomainStatus,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    },
    enabled: !!id,
  });
}

export function useCreateDomain() {
  const queryClient = useQueryClient();
  const { organization } = useAuth();

  return useMutation({
    mutationFn: async (data: Five9DomainFormData) => {
      if (!organization) throw new Error("No organization selected");

      const { error } = await supabase.from("five9_domains").insert([
        {
          organization_id: organization.id,
          domain: data.domain,
          display_name: data.display_name,
          api_key_encrypted: data.api_key || null,
          workflow_settings: (data.workflow_settings || {}) as Json,
        },
      ]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["five9_domains"] });
      toast.success("Five9 domain added successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to add domain: ${error.message}`);
    },
  });
}

export function useUpdateDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Five9DomainFormData> & { status?: Five9DomainStatus; api_connection_status?: string } }) => {
      const updateData: Record<string, unknown> = {};

      if (data.domain !== undefined) updateData.domain = data.domain;
      if (data.display_name !== undefined) updateData.display_name = data.display_name;
      if (data.api_key !== undefined) updateData.api_key_encrypted = data.api_key || null;
      if (data.five9_username !== undefined) updateData.five9_username = data.five9_username || null;
      if (data.five9_password !== undefined) updateData.five9_password_encrypted = data.five9_password || null;
      if (data.workflow_settings !== undefined) updateData.workflow_settings = data.workflow_settings as Json;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.api_connection_status !== undefined) updateData.api_connection_status = data.api_connection_status;

      const { error } = await supabase
        .from("five9_domains")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["five9_domains"] });
      toast.success("Domain updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update domain: ${error.message}`);
    },
  });
}

export function useDeleteDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("five9_domains").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["five9_domains"] });
      toast.success("Domain deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete domain: ${error.message}`);
    },
  });
}
