// Phase 11 — Hooks for retention policies, secret rotations, webhook
// failures, and the tenant-aware audit overview view.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export type RetentionCategory =
  | "digest_runs" | "escalation_events" | "ack_tokens" | "webhook_failures"
  | "sync_jobs" | "event_log" | "alerts" | "feedback_entries"
  | "issue_reviews" | "audit_logs";

export const RETENTION_CATEGORIES: { key: RetentionCategory; label: string; defaultDays: number; defaultAction: "delete" | "redact" | "archive"; hint: string }[] = [
  { key: "digest_runs", label: "Digest runs", defaultDays: 90, defaultAction: "redact", hint: "Trims rendered HTML and delivery_error after window." },
  { key: "escalation_events", label: "Escalation events", defaultDays: 180, defaultAction: "delete", hint: "Slack/webhook dispatch attempts." },
  { key: "ack_tokens", label: "Ack tokens", defaultDays: 14, defaultAction: "delete", hint: "Single-use; expired tokens are always pruned." },
  { key: "webhook_failures", label: "Webhook failures", defaultDays: 60, defaultAction: "delete", hint: "Bad signatures, replays, expired tokens." },
  { key: "sync_jobs", label: "Sync jobs (terminal)", defaultDays: 180, defaultAction: "delete", hint: "Only succeeded/failed past the window." },
  { key: "event_log", label: "Event log", defaultDays: 180, defaultAction: "delete", hint: "Raw inbound payload history." },
  { key: "alerts", label: "Alerts (resolved/acked)", defaultDays: 365, defaultAction: "delete", hint: "Open alerts are kept indefinitely." },
  { key: "feedback_entries", label: "Feedback (terminal)", defaultDays: 365, defaultAction: "delete", hint: "Shipped/rejected/resolved entries." },
  { key: "issue_reviews", label: "Issue reviews (resolved)", defaultDays: 365, defaultAction: "delete", hint: "Resolved review rows past window." },
  { key: "audit_logs", label: "Audit logs", defaultDays: 730, defaultAction: "delete", hint: "Long retention recommended." },
];

export interface RetentionPolicy {
  id: string;
  organization_id: string;
  category: RetentionCategory;
  retention_days: number;
  action: "delete" | "redact" | "archive";
  notes: string | null;
  updated_by_name: string | null;
  updated_at: string;
}

export interface SecretRotation {
  id: string;
  organization_id: string;
  secret_kind: "cron_secret" | "sink_hmac" | "webhook_signing" | "provider_credential" | "other";
  secret_ref: string | null;
  rotated_by_name: string | null;
  source: string;
  notes: string | null;
  created_at: string;
}

export interface WebhookFailure {
  id: string;
  organization_id: string | null;
  endpoint: string;
  reason: string;
  ip_address: string | null;
  user_agent: string | null;
  payload_excerpt: string | null;
  signature_present: boolean;
  created_at: string;
}

export interface AuditEntry {
  id: string;
  created_at: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  organization_id: string | null;
  tenant_id: string | null;
  user_id: string | null;
  source: string;
  details: any;
  actor_name: string | null;
  actor_email: string | null;
  tenant_name: string | null;
}

const QK = {
  policies: (o?: string | null) => ["lc-retention-policies", o],
  rotations: (o?: string | null) => ["lc-secret-rotations", o],
  failures: (o?: string | null) => ["lc-webhook-failures", o],
  audit: (o?: string | null, tenant?: string | null, src?: string) => ["lc-audit", o, tenant, src],
};

export function useRetentionPolicies(orgId?: string | null) {
  return useQuery({
    queryKey: QK.policies(orgId),
    enabled: !!orgId,
    queryFn: async (): Promise<RetentionPolicy[]> => {
      const { data, error } = await db.from("legal_connect_retention_policies")
        .select("*").eq("organization_id", orgId).order("category");
      if (error) throw error;
      return data as RetentionPolicy[];
    },
  });
}

export function useUpsertRetentionPolicy(orgId?: string | null) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { id?: string; category: RetentionCategory; retention_days: number; action: "delete" | "redact" | "archive"; notes?: string | null }) => {
      if (!orgId) throw new Error("organization required");
      const { error } = await db.from("legal_connect_retention_policies").upsert(
        {
          organization_id: orgId,
          category: input.category,
          retention_days: input.retention_days,
          action: input.action,
          notes: input.notes ?? null,
          updated_by: user?.id ?? null,
          updated_by_name: user?.email ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "organization_id,category" },
      );
      if (error) throw error;
      await db.from("audit_logs").insert({
        action: "lc.retention_policy.upsert",
        entity_type: "legal_connect_retention_policies",
        entity_id: input.category,
        organization_id: orgId,
        source: "app",
        details: { retention_days: input.retention_days, action: input.action },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.policies(orgId) }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRunRetentionCleanup(orgId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("organization required");
      const { data, error } = await db.rpc("legal_connect_cleanup_retention", { _org_id: orgId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Retention cleanup complete");
      qc.invalidateQueries({ queryKey: QK.policies(orgId) });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSecretRotations(orgId?: string | null) {
  return useQuery({
    queryKey: QK.rotations(orgId),
    enabled: !!orgId,
    queryFn: async (): Promise<SecretRotation[]> => {
      const { data, error } = await db.from("legal_connect_secret_rotations")
        .select("*").eq("organization_id", orgId)
        .order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data as SecretRotation[];
    },
  });
}

export function useRecordSecretRotation(orgId?: string | null) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { secret_kind: SecretRotation["secret_kind"]; secret_ref?: string | null; notes?: string | null }) => {
      if (!orgId) throw new Error("organization required");
      const { error } = await db.from("legal_connect_secret_rotations").insert({
        organization_id: orgId,
        secret_kind: input.secret_kind,
        secret_ref: input.secret_ref ?? null,
        rotated_by: user?.id ?? null,
        rotated_by_name: user?.email ?? null,
        source: "app",
        notes: input.notes ?? null,
      });
      if (error) throw error;
      await db.from("audit_logs").insert({
        action: "lc.secret.rotation",
        entity_type: "legal_connect_secret_rotations",
        entity_id: input.secret_kind,
        organization_id: orgId,
        source: "app",
        details: { secret_ref: input.secret_ref ?? null },
      });
    },
    onSuccess: () => {
      toast.success("Rotation recorded");
      qc.invalidateQueries({ queryKey: QK.rotations(orgId) });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useWebhookFailures(orgId?: string | null) {
  return useQuery({
    queryKey: QK.failures(orgId),
    enabled: !!orgId,
    queryFn: async (): Promise<WebhookFailure[]> => {
      const { data, error } = await db.from("legal_connect_webhook_failures")
        .select("*").or(`organization_id.eq.${orgId},organization_id.is.null`)
        .order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data as WebhookFailure[];
    },
  });
}

export function useAuditOverview(orgId?: string | null, tenantId?: string | null, source?: string) {
  return useQuery({
    queryKey: QK.audit(orgId, tenantId, source),
    enabled: !!orgId,
    queryFn: async (): Promise<AuditEntry[]> => {
      let q = db.from("legal_connect_audit_overview")
        .select("*").eq("organization_id", orgId)
        .order("created_at", { ascending: false }).limit(200);
      if (tenantId) q = q.eq("tenant_id", tenantId);
      if (source && source !== "all") q = q.eq("source", source);
      const { data, error } = await q;
      if (error) throw error;
      return data as AuditEntry[];
    },
  });
}
