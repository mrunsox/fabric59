import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

/**
 * Phase 7 — Canonical integrations layer hooks.
 *
 * Reads from the canonical workspace-owned `integration_connections` and
 * `integration_mappings` tables, plus the platform-wide `integration_providers`
 * registry. Legacy `clio_mappings` and `mycase_mappings` rows are mirrored into
 * `integration_mappings` via DB triggers + Phase 7 backfill, so this is the
 * single canonical read surface for provider identity xrefs.
 */

export type IntegrationProvider = {
  id: string;
  display_name: string;
  category: string;
  capabilities: Record<string, unknown>;
  auth_type: string;
  is_active: boolean;
};

export type IntegrationConnection = {
  id: string;
  workspace_id: string;
  organization_id: string;
  provider_id: string;
  client_id: string | null;
  campaign_id: string | null;
  display_name: string | null;
  status: string;
  auth_type: string | null;
  credentials_ref: string | null;
  config: Record<string, unknown>;
  last_sync_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};


export type IntegrationMapping = {
  id: string;
  organization_id: string;
  workspace_id: string | null;
  client_id: string | null;
  provider_id: string;
  lookup_key: string;
  lookup_kind: string;
  external_ids: Record<string, unknown>;
  source: string;
  created_at: string;
  updated_at: string;
};

export function useIntegrationProviders() {
  return useQuery({
    queryKey: ["integration-providers"],
    queryFn: async (): Promise<IntegrationProvider[]> => {
      const { data, error } = await supabase
        .from("integration_providers" as never)
        .select("*")
        .eq("is_active", true)
        .order("display_name");
      if (error) throw error;
      return (data ?? []) as unknown as IntegrationProvider[];
    },
  });
}

export function useWorkspaceIntegrationConnections() {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ["integration-connections", workspace?.id ?? null],
    enabled: !!workspace,
    queryFn: async (): Promise<IntegrationConnection[]> => {
      const { data, error } = await supabase
        .from("integration_connections" as never)
        .select("*")
        .eq("workspace_id", workspace!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as IntegrationConnection[];
    },
  });
}

export function useIntegrationConnection(connectionId: string | undefined) {
  return useQuery({
    queryKey: ["integration-connection", connectionId ?? null],
    enabled: !!connectionId,
    queryFn: async (): Promise<IntegrationConnection | null> => {
      const { data, error } = await supabase
        .from("integration_connections" as never)
        .select("*")
        .eq("id", connectionId!)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as IntegrationConnection | null) ?? null;
    },
  });
}

export function useCreateIntegrationConnection() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      provider_id: string;
      display_name?: string;
      client_id?: string | null;
      campaign_id?: string | null;
      config?: Record<string, unknown>;
    }) => {
      if (!workspace) throw new Error("No workspace");
      const { data, error } = await supabase
        .from("integration_connections" as never)
        .insert({
          workspace_id: workspace.id,
          organization_id: workspace.organization_id,
          provider_id: input.provider_id,
          display_name: input.display_name ?? null,
          client_id: input.client_id ?? null,
          campaign_id: input.campaign_id ?? null,
          status: "not_connected",
          config: (input.config ?? {}) as never,
          created_by: user?.id ?? null,
        } as never)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integration-connections"] });
      toast.success("Connection created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateIntegrationConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      patch: Partial<Pick<IntegrationConnection, "display_name" | "status" | "config" | "last_error" | "credentials_ref" | "campaign_id">>;
    }) => {
      const { data, error } = await supabase
        .from("integration_connections" as never)
        .update(input.patch as never)
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integration-connections"] });
      qc.invalidateQueries({ queryKey: ["integration-connection"] });
      toast.success("Connection updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteIntegrationConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("integration_connections" as never)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integration-connections"] });
      toast.success("Connection removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useWorkspaceIntegrationMappings(opts?: { providerId?: string; limit?: number }) {
  const { workspace } = useWorkspace();
  const providerId = opts?.providerId ?? null;
  const limit = opts?.limit ?? 200;
  return useQuery({
    queryKey: ["integration-mappings", workspace?.organization_id ?? null, providerId, limit],
    enabled: !!workspace,
    queryFn: async (): Promise<IntegrationMapping[]> => {
      let q = supabase
        .from("integration_mappings" as never)
        .select("*")
        .eq("organization_id", workspace!.organization_id)
        .order("updated_at", { ascending: false })
        .limit(limit);
      if (providerId) q = q.eq("provider_id", providerId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as IntegrationMapping[];
    },
  });
}
