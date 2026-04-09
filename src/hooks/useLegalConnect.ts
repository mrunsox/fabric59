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

export function useLegalConnections() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["legal-connect", "connections", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("legal_connect_connections")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
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

export function useLegalCampaigns() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["legal-connect", "campaigns", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("legal_connect_campaigns")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
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

export function useLegalDispositionMappings(campaignId?: string) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["legal-connect", "disposition-mappings", orgId, campaignId],
    queryFn: async () => {
      let q = supabase
        .from("legal_connect_disposition_mappings")
        .select("*")
        .eq("organization_id", orgId!);
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

export function useLegalCallVariableMappings(campaignId?: string) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["legal-connect", "call-variable-mappings", orgId, campaignId],
    queryFn: async () => {
      let q = supabase
        .from("legal_connect_call_variable_mappings")
        .select("*")
        .eq("organization_id", orgId!);
      if (campaignId) q = q.eq("campaign_id", campaignId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
}

// ── Policy Profiles ──────────────────────────────────────────────────

export function useLegalPolicyProfiles() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["legal-connect", "policy-profiles", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("legal_connect_policy_profiles")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
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

// ── Canonical Entities (read-only) ───────────────────────────────────

export function useLegalContacts() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["legal-connect", "contacts", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("legal_connect_contacts")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
}

export function useLegalMatters() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["legal-connect", "matters", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("legal_connect_matters")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
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

export function useLegalConflicts(status?: string) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["legal-connect", "conflicts", orgId, status],
    queryFn: async () => {
      let q = supabase
        .from("legal_connect_conflicts")
        .select("*")
        .eq("organization_id", orgId!);
      if (status) q = q.eq("resolution_status", status);
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
}

// ── Review Queue ─────────────────────────────────────────────────────

export function useLegalReviewQueue(status?: string) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["legal-connect", "review-queue", orgId, status],
    queryFn: async () => {
      let q = supabase
        .from("legal_connect_review_queue")
        .select("*")
        .eq("organization_id", orgId!);
      if (status) q = q.eq("status", status);
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

export function useLegalFieldPolicies() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["legal-connect", "field-policies", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("legal_connect_field_policies")
        .select("*")
        .eq("organization_id", orgId!);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
}

// ── Webhook Subscriptions ────────────────────────────────────────────

export function useLegalWebhookSubscriptions() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["legal-connect", "webhook-subscriptions", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("legal_connect_webhook_subscriptions")
        .select("*")
        .eq("organization_id", orgId!);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
}

// ── AI Sessions ──────────────────────────────────────────────────────

export function useLegalAISessions() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["legal-connect", "ai-sessions", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("legal_connect_ai_sessions")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
}

// ── AI Checklists ────────────────────────────────────────────────────

export function useLegalAIChecklists() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["legal-connect", "ai-checklists", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("legal_connect_ai_checklists")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
}
