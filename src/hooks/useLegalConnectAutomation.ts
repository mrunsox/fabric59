// Phase 9 — hooks for digest schedules + escalation sinks.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type DigestCohort = "all" | "design_partners" | "ops";
export type DigestCadence = "weekly" | "daily";

export interface DigestSchedule {
  id: string;
  organization_id: string;
  cohort: DigestCohort;
  cadence: DigestCadence;
  hour_utc: number;
  weekday: number;
  enabled: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EscalationSink {
  id: string;
  organization_id: string;
  name: string;
  kind: "slack" | "webhook";
  target: string;
  hmac_secret: string | null;
  severity_threshold: "warn" | "critical";
  enabled: boolean;
  last_fired_at: string | null;
  created_at: string;
}

export interface EscalationEvent {
  id: string;
  organization_id: string;
  sink_id: string | null;
  trigger_kind: string;
  severity: string;
  payload: any;
  delivery_status: string;
  delivery_error: string | null;
  created_at: string;
}

const QK = {
  schedules: (o?: string | null) => ["lc-digest-schedules", o],
  sinks: (o?: string | null) => ["lc-esc-sinks", o],
  events: (o?: string | null) => ["lc-esc-events", o],
};

function nextRunFromNow(cadence: DigestCadence, hour: number, weekday: number): string {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, 0, 0));
  if (cadence === "daily") {
    if (next.getTime() <= now.getTime()) next.setUTCDate(next.getUTCDate() + 1);
  } else {
    const dayDiff = (weekday - next.getUTCDay() + 7) % 7;
    next.setUTCDate(next.getUTCDate() + dayDiff);
    if (next.getTime() <= now.getTime()) next.setUTCDate(next.getUTCDate() + 7);
  }
  return next.toISOString();
}

export function useDigestSchedules(orgId?: string | null) {
  return useQuery({
    queryKey: QK.schedules(orgId),
    enabled: !!orgId,
    queryFn: async (): Promise<DigestSchedule[]> => {
      const { data, error } = await (supabase as any)
        .from("legal_connect_digest_schedules").select("*")
        .eq("organization_id", orgId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DigestSchedule[];
    },
  });
}

export function useUpsertDigestSchedule(orgId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<DigestSchedule> & { id?: string; cohort: DigestCohort; cadence: DigestCadence }) => {
      if (!orgId) throw new Error("organization required");
      const hour = input.hour_utc ?? 14;
      const weekday = input.weekday ?? 1;
      const payload: any = {
        organization_id: orgId,
        cohort: input.cohort, cadence: input.cadence,
        hour_utc: hour, weekday,
        enabled: input.enabled ?? true,
        next_run_at: input.next_run_at ?? nextRunFromNow(input.cadence, hour, weekday),
      };
      if (input.id) payload.id = input.id;
      const { error } = await (supabase as any)
        .from("legal_connect_digest_schedules")
        .upsert(payload, { onConflict: "organization_id,cohort,cadence" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.schedules(orgId) }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteDigestSchedule(orgId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("legal_connect_digest_schedules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.schedules(orgId) }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useEscalationSinks(orgId?: string | null) {
  return useQuery({
    queryKey: QK.sinks(orgId),
    enabled: !!orgId,
    queryFn: async (): Promise<EscalationSink[]> => {
      const { data, error } = await (supabase as any)
        .from("legal_connect_escalation_sinks").select("*")
        .eq("organization_id", orgId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EscalationSink[];
    },
  });
}

export function useUpsertEscalationSink(orgId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<EscalationSink> & { name: string; kind: "slack" | "webhook"; target: string }) => {
      if (!orgId) throw new Error("organization required");
      const payload: any = {
        organization_id: orgId,
        name: input.name, kind: input.kind, target: input.target,
        hmac_secret: input.hmac_secret ?? null,
        severity_threshold: input.severity_threshold ?? "critical",
        enabled: input.enabled ?? true,
      };
      if (input.id) payload.id = input.id;
      const { error } = await (supabase as any)
        .from("legal_connect_escalation_sinks").upsert(payload);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.sinks(orgId) }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteEscalationSink(orgId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("legal_connect_escalation_sinks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.sinks(orgId) }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useEscalationEvents(orgId?: string | null) {
  return useQuery({
    queryKey: QK.events(orgId),
    enabled: !!orgId,
    queryFn: async (): Promise<EscalationEvent[]> => {
      const { data, error } = await (supabase as any)
        .from("legal_connect_escalation_events").select("*")
        .eq("organization_id", orgId).order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return (data ?? []) as EscalationEvent[];
    },
  });
}
