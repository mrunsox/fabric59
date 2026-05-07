import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

/**
 * Phase 2 — Worksheet field definitions and responses.
 *
 * Worksheet fields capture the structured Q&A used during ACW / post-call
 * legal intake. Values are resolvable as a mapping source via
 * `source_location = 'worksheet'` on `legal_connect_call_variable_mappings`.
 */

export interface WorksheetFieldDef {
  id: string;
  organization_id: string;
  client_id: string;
  campaign_id: string | null;
  field_key: string;
  label: string;
  field_type:
    | "text"
    | "textarea"
    | "number"
    | "date"
    | "phone"
    | "email"
    | "select"
    | "boolean";
  required: boolean;
  category: string | null;
  description: string | null;
  options: string[];
  position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorksheetResponse {
  id: string;
  organization_id: string;
  client_id: string;
  campaign_id: string | null;
  call_session_id: string | null;
  correlation_id: string | null;
  responses: Record<string, any>;
  captured_phase: "during_call" | "acw" | "post_call";
  is_complete: boolean;
  created_at: string;
  updated_at: string;
}

function useOrg() {
  const { organization } = useAuth();
  return organization?.id ?? null;
}

export function useWorksheetFields(clientId?: string, campaignId?: string | null) {
  const orgId = useOrg();
  return useQuery({
    queryKey: ["worksheet-fields", orgId, clientId, campaignId],
    queryFn: async () => {
      let q = supabase
        .from("worksheet_field_definitions" as any)
        .select("*")
        .eq("organization_id", orgId!)
        .order("position", { ascending: true });
      if (clientId) q = q.eq("client_id", clientId);
      if (campaignId !== undefined) {
        q = campaignId === null ? q.is("campaign_id", null) : q.eq("campaign_id", campaignId);
      }
      const { data, error } = await q;
      if (error) throw error;
      return ((data ?? []) as unknown) as WorksheetFieldDef[];
    },
    enabled: !!orgId,
  });
}

export function useUpsertWorksheetField() {
  const qc = useQueryClient();
  const orgId = useOrg();
  return useMutation({
    mutationFn: async (payload: Partial<WorksheetFieldDef> & { client_id: string }) => {
      const row = { ...payload, organization_id: orgId };
      const { error } = payload.id
        ? await supabase.from("worksheet_field_definitions" as any).update(row).eq("id", payload.id)
        : await supabase.from("worksheet_field_definitions" as any).insert([row as any]);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["worksheet-fields"] });
      toast.success("Worksheet field saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteWorksheetField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("worksheet_field_definitions" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["worksheet-fields"] });
      toast.success("Worksheet field deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useWorksheetResponses(opts: {
  clientId?: string;
  correlationId?: string | null;
  callSessionId?: string | null;
  limit?: number;
}) {
  const orgId = useOrg();
  return useQuery({
    queryKey: [
      "worksheet-responses",
      orgId,
      opts.clientId,
      opts.correlationId,
      opts.callSessionId,
      opts.limit,
    ],
    queryFn: async () => {
      let q = supabase
        .from("worksheet_responses" as any)
        .select("*")
        .eq("organization_id", orgId!)
        .order("updated_at", { ascending: false })
        .limit(opts.limit ?? 50);
      if (opts.clientId) q = q.eq("client_id", opts.clientId);
      if (opts.correlationId) q = q.eq("correlation_id", opts.correlationId);
      if (opts.callSessionId) q = q.eq("call_session_id", opts.callSessionId);
      const { data, error } = await q;
      if (error) throw error;
      return ((data ?? []) as unknown) as WorksheetResponse[];
    },
    enabled: !!orgId,
  });
}

export function useUpsertWorksheetResponse() {
  const qc = useQueryClient();
  const orgId = useOrg();
  return useMutation({
    mutationFn: async (payload: Partial<WorksheetResponse> & { client_id: string }) => {
      const row = { ...payload, organization_id: orgId };
      const { error } = payload.id
        ? await supabase.from("worksheet_responses" as any).update(row).eq("id", payload.id)
        : await supabase.from("worksheet_responses" as any).insert([row as any]);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["worksheet-responses"] });
      toast.success("Worksheet saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
