import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type RolloutStatus =
  | "not_started"
  | "onboarding_in_progress"
  | "testing"
  | "ready_for_live"
  | "live_pilot"
  | "live_steady"
  | "paused";

export const ROLLOUT_LABEL: Record<RolloutStatus, string> = {
  not_started: "Not started",
  onboarding_in_progress: "Onboarding",
  testing: "Testing",
  ready_for_live: "Ready for live",
  live_pilot: "Live pilot",
  live_steady: "Live steady",
  paused: "Paused",
};

export const ROLLOUT_ORDER: RolloutStatus[] = [
  "not_started",
  "onboarding_in_progress",
  "testing",
  "ready_for_live",
  "live_pilot",
  "live_steady",
];

export interface DesignPartnerNotes {
  contact_name?: string;
  contact_email?: string;
  sla?: string;
  constraints?: string;
  notes?: string;
}

export interface DesignPartnerInfo {
  id: string;
  name: string;
  is_design_partner: boolean;
  design_partner_notes: DesignPartnerNotes;
  rollout_status: RolloutStatus;
  readiness_state: string;
  readiness_updated_at: string | null;
}

const QK_ONE = (id: string) => ["design-partner", id];
const QK_LIST = ["design-partner", "list"];

export function useDesignPartner(clientId: string | undefined) {
  return useQuery({
    queryKey: QK_ONE(clientId ?? ""),
    enabled: !!clientId,
    queryFn: async (): Promise<DesignPartnerInfo> => {
      const { data, error } = await (supabase as any)
        .from("tenants")
        .select(
          "id, name, is_design_partner, design_partner_notes, legal_connect_rollout_status, legal_connect_readiness_state, legal_connect_readiness_updated_at",
        )
        .eq("id", clientId!)
        .maybeSingle();
      if (error) throw error;
      const row: any = data ?? {};
      return {
        id: row.id ?? clientId!,
        name: row.name ?? "",
        is_design_partner: !!row.is_design_partner,
        design_partner_notes: (row.design_partner_notes ?? {}) as DesignPartnerNotes,
        rollout_status: (row.legal_connect_rollout_status ?? "not_started") as RolloutStatus,
        readiness_state: row.legal_connect_readiness_state ?? "draft",
        readiness_updated_at: row.legal_connect_readiness_updated_at ?? null,
      };
    },
  });
}

export function useUpdateDesignPartner(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      patch: Partial<{
        is_design_partner: boolean;
        design_partner_notes: DesignPartnerNotes;
        rollout_status: RolloutStatus;
      }>,
    ) => {
      if (!clientId) throw new Error("clientId required");
      const update: Record<string, unknown> = {};
      if (patch.is_design_partner !== undefined) update.is_design_partner = patch.is_design_partner;
      if (patch.design_partner_notes) update.design_partner_notes = patch.design_partner_notes as any;
      if (patch.rollout_status) update.legal_connect_rollout_status = patch.rollout_status;
      const { error } = await (supabase as any).from("tenants").update(update).eq("id", clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK_ONE(clientId ?? "") });
      qc.invalidateQueries({ queryKey: QK_LIST });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDesignPartners() {
  return useQuery({
    queryKey: QK_LIST,
    queryFn: async (): Promise<DesignPartnerInfo[]> => {
      const { data, error } = await (supabase as any)
        .from("tenants")
        .select(
          "id, name, is_design_partner, design_partner_notes, legal_connect_rollout_status, legal_connect_readiness_state, legal_connect_readiness_updated_at",
        )
        .eq("is_design_partner", true)
        .order("name");
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        id: row.id,
        name: row.name ?? "",
        is_design_partner: true,
        design_partner_notes: (row.design_partner_notes ?? {}) as DesignPartnerNotes,
        rollout_status: (row.legal_connect_rollout_status ?? "not_started") as RolloutStatus,
        readiness_state: row.legal_connect_readiness_state ?? "draft",
        readiness_updated_at: row.legal_connect_readiness_updated_at ?? null,
      }));
    },
  });
}
