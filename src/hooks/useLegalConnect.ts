import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// ── helpers ──────────────────────────────────────────────────────────

function useOrgId() {
  const { organization } = useAuth();
  return organization?.id ?? null;
}

// ── Connections ──────────────────────────────────────────────────────

export function useLegalConnections(clientId?: string) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["legal-connect", "connections", orgId, clientId],
    queryFn: async () => {
      let q = supabase
        .from("legal_connect_connections")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (clientId) q = q.eq("client_id", clientId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
}

export function useCreateLegalConnection() {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { error } = await supabase
        .from("legal_connect_connections")
        .insert([{ ...payload, organization_id: orgId } as any]);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["legal-connect", "connections"] });
      toast.success("Connection created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateLegalConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const { error } = await supabase
        .from("legal_connect_connections")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["legal-connect", "connections"] });
      toast.success("Connection updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteLegalConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("legal_connect_connections")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["legal-connect", "connections"] });
      toast.success("Connection removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Provider Capabilities (global, no org filter) ────────────────────

export function useLegalProviderCapabilities(provider?: string) {
  return useQuery({
    queryKey: ["legal-connect", "provider-capabilities", provider],
    queryFn: async () => {
      let q = supabase.from("legal_connect_provider_capabilities").select("*");
      if (provider) q = q.eq("provider", provider);
      const { data, error } = await q.order("capability_key");
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ── Client Capabilities ──────────────────────────────────────────────

export function useLegalClientCapabilities(clientId?: string) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["legal-connect", "client-capabilities", orgId, clientId],
    queryFn: async () => {
      let q = supabase
        .from("legal_connect_client_capabilities")
        .select("*")
        .eq("organization_id", orgId!);
      if (clientId) q = q.eq("client_id", clientId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
}

// ── Campaigns ────────────────────────────────────────────────────────

export function useLegalCampaigns(clientId?: string) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["legal-connect", "campaigns", orgId, clientId],
    queryFn: async () => {
      let q = supabase
        .from("legal_connect_campaigns")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (clientId) q = q.eq("client_id", clientId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
}

export function useCreateLegalCampaign() {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { error } = await supabase
        .from("legal_connect_campaigns")
        .insert([{ ...payload, organization_id: orgId } as any]);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["legal-connect", "campaigns"] });
      toast.success("Campaign mapping created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateLegalCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const { error } = await supabase
        .from("legal_connect_campaigns")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["legal-connect", "campaigns"] });
      toast.success("Campaign mapping updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteLegalCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("legal_connect_campaigns")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["legal-connect", "campaigns"] });
      toast.success("Campaign mapping deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Disposition Mappings ─────────────────────────────────────────────

export function useLegalDispositionMappings(clientId?: string, campaignId?: string) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["legal-connect", "disposition-mappings", orgId, clientId, campaignId],
    queryFn: async () => {
      let q = supabase
        .from("legal_connect_disposition_mappings")
        .select("*")
        .eq("organization_id", orgId!);
      if (clientId) q = q.eq("client_id", clientId);
      if (campaignId) q = q.eq("campaign_id", campaignId);
      const { data, error } = await q.order("priority");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
}

export function useCreateLegalDispositionMapping() {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { error } = await supabase
        .from("legal_connect_disposition_mappings")
        .insert([{ ...payload, organization_id: orgId } as any]);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["legal-connect", "disposition-mappings"] });
      toast.success("Disposition mapping created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Call Variable Mappings ───────────────────────────────────────────

export function useLegalCallVariableMappings(clientId?: string, campaignId?: string) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["legal-connect", "call-variable-mappings", orgId, clientId, campaignId],
    queryFn: async () => {
      let q = supabase
        .from("legal_connect_call_variable_mappings")
        .select("*")
        .eq("organization_id", orgId!);
      if (clientId) q = q.eq("client_id", clientId);
      if (campaignId) q = q.eq("campaign_id", campaignId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
}

// ── Policy Profiles ──────────────────────────────────────────────────

export function useLegalPolicyProfiles(clientId?: string) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["legal-connect", "policy-profiles", orgId, clientId],
    queryFn: async () => {
      let q = supabase
        .from("legal_connect_policy_profiles")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (clientId) q = q.eq("client_id", clientId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
}

export function useCreateLegalPolicyProfile() {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { error } = await supabase
        .from("legal_connect_policy_profiles")
        .insert([{ ...payload, organization_id: orgId } as any]);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["legal-connect", "policy-profiles"] });
      toast.success("Policy profile created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Disposition Mapping Mutations ─────────────────────────────────────

export function useUpdateLegalDispositionMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const { error } = await supabase
        .from("legal_connect_disposition_mappings")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["legal-connect", "disposition-mappings"] });
      toast.success("Disposition mapping updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteLegalDispositionMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("legal_connect_disposition_mappings")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["legal-connect", "disposition-mappings"] });
      toast.success("Disposition mapping deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Call Variable Mapping Mutations ──────────────────────────────────

export function useCreateLegalCallVariableMapping() {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { error } = await supabase
        .from("legal_connect_call_variable_mappings")
        .insert([{ ...payload, organization_id: orgId } as any]);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["legal-connect", "call-variable-mappings"] });
      toast.success("Call variable mapping created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateLegalCallVariableMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const { error } = await supabase
        .from("legal_connect_call_variable_mappings")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["legal-connect", "call-variable-mappings"] });
      toast.success("Call variable mapping updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteLegalCallVariableMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("legal_connect_call_variable_mappings")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["legal-connect", "call-variable-mappings"] });
      toast.success("Call variable mapping deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Field Policy Mutations ───────────────────────────────────────────

export function useCreateLegalFieldPolicy() {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { error } = await supabase
        .from("legal_connect_field_policies")
        .insert([{ ...payload, organization_id: orgId } as any]);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["legal-connect", "field-policies"] });
      toast.success("Field policy created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateLegalFieldPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const { error } = await supabase
        .from("legal_connect_field_policies")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["legal-connect", "field-policies"] });
      toast.success("Field policy updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteLegalFieldPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("legal_connect_field_policies")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["legal-connect", "field-policies"] });
      toast.success("Field policy deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Policy Profile Mutations ─────────────────────────────────────────

export function useUpdateLegalPolicyProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const { error } = await supabase
        .from("legal_connect_policy_profiles")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["legal-connect", "policy-profiles"] });
      toast.success("Policy profile updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteLegalPolicyProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("legal_connect_policy_profiles")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["legal-connect", "policy-profiles"] });
      toast.success("Policy profile deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Canonical Entities (read-only) ───────────────────────────────────

export function useLegalContacts(clientId?: string) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["legal-connect", "contacts", orgId, clientId],
    queryFn: async () => {
      let q = supabase
        .from("legal_connect_contacts")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (clientId) q = q.eq("client_id", clientId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
}

export function useLegalMatters(clientId?: string) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["legal-connect", "matters", orgId, clientId],
    queryFn: async () => {
      let q = supabase
        .from("legal_connect_matters")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (clientId) q = q.eq("client_id", clientId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
}

// ── Event Log ────────────────────────────────────────────────────────

export interface EventLogFilters {
  provider?: string;
  processing_status?: string;
  call_id?: string;
  correlation_id?: string;
  client_id?: string;
  limit?: number;
}

export function useLegalEventLog(filters?: EventLogFilters) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["legal-connect", "event-log", orgId, filters],
    queryFn: async () => {
      let q = supabase
        .from("legal_connect_event_log")
        .select("*")
        .eq("organization_id", orgId!);
      if (filters?.provider) q = q.eq("provider", filters.provider);
      if (filters?.processing_status) q = q.eq("processing_status", filters.processing_status);
      if (filters?.call_id) q = q.eq("call_id", filters.call_id);
      if (filters?.correlation_id) q = q.eq("correlation_id", filters.correlation_id);
      if (filters?.client_id) q = q.eq("client_id", filters.client_id);
      const { data, error } = await q
        .order("received_at", { ascending: false })
        .limit(filters?.limit ?? 100);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
}

// ── Sync Jobs ────────────────────────────────────────────────────────

export interface SyncJobFilters {
  provider?: string;
  status?: string;
  client_id?: string;
  limit?: number;
}

export function useLegalSyncJobs(filters?: SyncJobFilters) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["legal-connect", "sync-jobs", orgId, filters],
    queryFn: async () => {
      let q = supabase
        .from("legal_connect_sync_jobs")
        .select("*")
        .eq("organization_id", orgId!);
      if (filters?.provider) q = q.eq("provider", filters.provider);
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.client_id) q = q.eq("client_id", filters.client_id);
      const { data, error } = await q
        .order("created_at", { ascending: false })
        .limit(filters?.limit ?? 100);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
}

// ── Conflicts ────────────────────────────────────────────────────────

export function useLegalConflicts(status?: string, clientId?: string) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["legal-connect", "conflicts", orgId, status, clientId],
    queryFn: async () => {
      let q = supabase
        .from("legal_connect_conflicts")
        .select("*")
        .eq("organization_id", orgId!);
      if (status) q = q.eq("resolution_status", status);
      if (clientId) q = q.eq("client_id", clientId);
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
}

// ── Review Queue ─────────────────────────────────────────────────────

export function useLegalReviewQueue(status?: string, clientId?: string) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["legal-connect", "review-queue", orgId, status, clientId],
    queryFn: async () => {
      let q = supabase
        .from("legal_connect_review_queue")
        .select("*")
        .eq("organization_id", orgId!);
      if (status) q = q.eq("status", status);
      if (clientId) q = q.eq("client_id", clientId);
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
}

export function useUpdateReviewItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const { error } = await supabase
        .from("legal_connect_review_queue")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["legal-connect", "review-queue"] });
      toast.success("Review item updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Field Policies ───────────────────────────────────────────────────

export function useLegalFieldPolicies(clientId?: string) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["legal-connect", "field-policies", orgId, clientId],
    queryFn: async () => {
      let q = supabase
        .from("legal_connect_field_policies")
        .select("*")
        .eq("organization_id", orgId!);
      if (clientId) q = q.eq("client_id", clientId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
}

// ── Webhook Subscriptions ────────────────────────────────────────────

export function useLegalWebhookSubscriptions(clientId?: string) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["legal-connect", "webhook-subscriptions", orgId, clientId],
    queryFn: async () => {
      let q = supabase
        .from("legal_connect_webhook_subscriptions")
        .select("*")
        .eq("organization_id", orgId!);
      if (clientId) q = q.eq("client_id", clientId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
}

// ── AI Sessions ──────────────────────────────────────────────────────

export function useLegalAISessions(clientId?: string) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["legal-connect", "ai-sessions", orgId, clientId],
    queryFn: async () => {
      let q = supabase
        .from("legal_connect_ai_sessions")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (clientId) q = q.eq("client_id", clientId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
}

// ── AI Checklists ────────────────────────────────────────────────────

export function useLegalAIChecklists(clientId?: string) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["legal-connect", "ai-checklists", orgId, clientId],
    queryFn: async () => {
      let q = supabase
        .from("legal_connect_ai_checklists")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (clientId) q = q.eq("client_id", clientId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
}

// ── Tenant Configs ───────────────────────────────────────────────────

export function useLegalTenantConfig(clientId?: string) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["legal-connect", "tenant-config", orgId, clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("legal_connect_tenant_configs")
        .select("*")
        .eq("organization_id", orgId!)
        .eq("client_id", clientId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!orgId && !!clientId,
  });
}

export function useUpsertLegalTenantConfig() {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { error } = await supabase
        .from("legal_connect_tenant_configs")
        .upsert({ ...payload, organization_id: orgId } as any, { onConflict: "organization_id,client_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["legal-connect", "tenant-config"] });
      toast.success("Client config saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Legal Connect Clients (join tenants with connection count) ────────

export function useLegalConnectClients() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["legal-connect", "clients", orgId],
    queryFn: async () => {
      const { data: tenants, error: tErr } = await supabase
        .from("tenants")
        .select("id, name, partner_id")
        .eq("organization_id", orgId!)
        .order("name");
      if (tErr) throw tErr;

      const { data: connections, error: cErr } = await supabase
        .from("legal_connect_connections")
        .select("client_id, status, provider")
        .eq("organization_id", orgId!);
      if (cErr) throw cErr;

      const { data: configs, error: cfgErr } = await supabase
        .from("legal_connect_tenant_configs")
        .select("client_id, onboarding_status, sandbox_mode")
        .eq("organization_id", orgId!);
      if (cfgErr) throw cfgErr;

      return (tenants ?? []).map((t) => {
        const clientConns = (connections ?? []).filter((c) => c.client_id === t.id);
        const cfg = (configs ?? []).find((c) => c.client_id === t.id);
        return {
          ...t,
          connectionCount: clientConns.length,
          connectedProviders: [...new Set(clientConns.filter((c) => c.status === "connected").map((c) => c.provider))],
          onboardingStatus: cfg?.onboarding_status ?? "not_started",
          isSandbox: cfg?.sandbox_mode ?? false,
        };
      });
    },
    enabled: !!orgId,
  });
}

// ── Failure Classifications ──────────────────────────────────────────

export function useLegalFailureClassifications(clientId?: string) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["legal-connect", "failure-classifications", orgId, clientId],
    queryFn: async () => {
      let q = supabase
        .from("legal_connect_failure_classifications")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (clientId) q = q.eq("client_id", clientId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
}

// ── Webhook Health (via admin edge function) ─────────────────────────

export function useLegalWebhookHealth(clientId?: string) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["legal-connect", "webhook-health", orgId, clientId],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const res = await supabase.functions.invoke("legal-connect-admin", {
        body: { action: "getWebhookHealth", organization_id: orgId, client_id: clientId },
      });
      if (res.error) throw res.error;
      return res.data?.data as {
        subscriptions: any[];
        recentFailures: any[];
        deadLetterCount: number;
        pausedCount: number;
      };
    },
    enabled: !!orgId,
  });
}

// ── Dead Letter Queue ────────────────────────────────────────────────

export function useLegalDeadLetterQueue(clientId?: string) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["legal-connect", "dead-letter", orgId, clientId],
    queryFn: async () => {
      let q = supabase
        .from("legal_connect_sync_jobs")
        .select("*")
        .eq("organization_id", orgId!)
        .eq("status", "dead_letter")
        .order("failed_at", { ascending: false })
        .limit(50);
      if (clientId) q = q.eq("client_id", clientId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
}

// ── Replay Job Mutation ──────────────────────────────────────────────

export function useReplayJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { job_id?: string; event_log_id?: string }) => {
      const res = await supabase.functions.invoke("legal-connect-jobs", {
        body: { action: "replayJob", ...payload },
      });
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["legal-connect", "sync-jobs"] });
      qc.invalidateQueries({ queryKey: ["legal-connect", "dead-letter"] });
      toast.success("Replay job created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Toggle Outage Mode ───────────────────────────────────────────────

export function useToggleOutageMode() {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: async ({ clientId, outageMode }: { clientId: string; outageMode: boolean }) => {
      const res = await supabase.functions.invoke("legal-connect-admin", {
        body: { action: "toggleOutageMode", organization_id: orgId, client_id: clientId, outage_mode: outageMode },
      });
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["legal-connect", "tenant-config"] });
      qc.invalidateQueries({ queryKey: ["legal-connect", "webhook-health"] });
      qc.invalidateQueries({ queryKey: ["legal-connect", "sync-jobs"] });
      toast.success(vars.outageMode ? "Outage mode enabled — jobs paused" : "Outage mode disabled — jobs resumed");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Renew Webhook ────────────────────────────────────────────────────

export function useRenewWebhook() {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: async (subscriptionId: string) => {
      const res = await supabase.functions.invoke("legal-connect-admin", {
        body: { action: "renewWebhook", organization_id: orgId, subscription_id: subscriptionId },
      });
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["legal-connect", "webhook-health"] });
      qc.invalidateQueries({ queryKey: ["legal-connect", "webhook-subscriptions"] });
      toast.success("Webhook renewed");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Test Runs ────────────────────────────────────────────────────────

export function useRunTest() {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await supabase.functions.invoke("legal-connect-test", {
        body: { ...payload, organization_id: orgId },
      });
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["legal-connect", "test-history"] });
      toast.success("Test completed");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useLegalTestHistory(clientId?: string) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["legal-connect", "test-history", orgId, clientId],
    queryFn: async () => {
      let q = supabase
        .from("legal_connect_test_runs")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (clientId) q = q.eq("client_id", clientId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
}

// ── Examples ─────────────────────────────────────────────────────────

export function useLegalExamples() {
  return useQuery({
    queryKey: ["legal-connect", "examples"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("legal_connect_examples")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useExplainExample() {
  return useMutation({
    mutationFn: async (exampleId: string) => {
      const res = await supabase.functions.invoke("legal-connect-ai", {
        body: { action: "explainExample", example_id: exampleId },
      });
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: (data) => {
      toast.success("Explanation generated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Prompt Templates ─────────────────────────────────────────────────

export function useLegalPromptTemplates(role?: string) {
  return useQuery({
    queryKey: ["legal-connect", "prompt-templates", role],
    queryFn: async () => {
      let q = supabase
        .from("legal_connect_prompt_templates")
        .select("*")
        .eq("enabled", true)
        .order("category")
        .order("title");
      if (role) q = q.eq("role", role);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useExecutePrompt() {
  const orgId = useOrgId();
  return useMutation({
    mutationFn: async (payload: { prompt_key: string; context: unknown; client_id?: string }) => {
      const res = await supabase.functions.invoke("legal-connect-ai", {
        body: { action: "executePrompt", ...payload, organization_id: orgId },
      });
      if (res.error) throw res.error;
      return res.data;
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Webhook Renewal Log ──────────────────────────────────────────────

export function useLegalRenewalLog(subscriptionId?: string, clientId?: string) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["legal-connect", "renewal-log", orgId, subscriptionId, clientId],
    queryFn: async () => {
      const res = await supabase.functions.invoke("legal-connect-admin", {
        body: { action: "getWebhookRenewalLog", organization_id: orgId, subscription_id: subscriptionId, client_id: clientId },
      });
      if (res.error) throw res.error;
      return (res.data?.data ?? []) as any[];
    },
    enabled: !!orgId,
  });
}

export function useRecreateWebhook() {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: async (subscriptionId: string) => {
      const res = await supabase.functions.invoke("legal-connect-admin", {
        body: { action: "recreateWebhook", organization_id: orgId, subscription_id: subscriptionId },
      });
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["legal-connect", "webhook-health"] });
      qc.invalidateQueries({ queryKey: ["legal-connect", "renewal-log"] });
      toast.success("Webhook recreated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDisableWebhook() {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: async ({ subscriptionId, reason }: { subscriptionId: string; reason?: string }) => {
      const res = await supabase.functions.invoke("legal-connect-admin", {
        body: { action: "disableWebhook", organization_id: orgId, subscription_id: subscriptionId, reason },
      });
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["legal-connect", "webhook-health"] });
      toast.success("Webhook disabled");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useEnableWebhook() {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: async (subscriptionId: string) => {
      const res = await supabase.functions.invoke("legal-connect-admin", {
        body: { action: "enableWebhook", organization_id: orgId, subscription_id: subscriptionId },
      });
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["legal-connect", "webhook-health"] });
      toast.success("Webhook re-enabled");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
