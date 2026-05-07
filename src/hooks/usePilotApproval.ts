import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  PilotApproval,
  PilotChecklistState,
  PilotStatus,
} from "@/data/legal-connect-pilot";

export interface PilotState {
  id: string;
  name: string;
  pilot_checklist: PilotChecklistState;
  pilot_status: PilotStatus;
  pilot_template: string | null;
  pilot_block_reason: string | null;
  pilot_approval: PilotApproval;
  pilot_updated_at: string | null;
  rollout_status: string;
}

const QK = (id: string) => ["pilot-approval", id];
const QK_LIST = ["pilot-approval", "list"];

const SELECT_COLS =
  "id, name, legal_connect_pilot_checklist, legal_connect_pilot_status, legal_connect_pilot_template, legal_connect_pilot_block_reason, legal_connect_pilot_approval, legal_connect_pilot_updated_at, legal_connect_rollout_status";

function rowToState(row: any, fallbackId?: string): PilotState {
  return {
    id: row?.id ?? fallbackId ?? "",
    name: row?.name ?? "",
    pilot_checklist: (row?.legal_connect_pilot_checklist ?? {}) as PilotChecklistState,
    pilot_status: (row?.legal_connect_pilot_status ?? "not_ready") as PilotStatus,
    pilot_template: row?.legal_connect_pilot_template ?? null,
    pilot_block_reason: row?.legal_connect_pilot_block_reason ?? null,
    pilot_approval: (row?.legal_connect_pilot_approval ?? {}) as PilotApproval,
    pilot_updated_at: row?.legal_connect_pilot_updated_at ?? null,
    rollout_status: row?.legal_connect_rollout_status ?? "not_started",
  };
}

export function usePilotApproval(clientId: string | undefined) {
  return useQuery({
    queryKey: QK(clientId ?? ""),
    enabled: !!clientId,
    queryFn: async (): Promise<PilotState> => {
      const { data, error } = await (supabase as any)
        .from("tenants")
        .select(SELECT_COLS)
        .eq("id", clientId!)
        .maybeSingle();
      if (error) throw error;
      return rowToState(data ?? {}, clientId);
    },
  });
}

export function usePilotApprovalList() {
  return useQuery({
    queryKey: QK_LIST,
    queryFn: async (): Promise<PilotState[]> => {
      const { data, error } = await (supabase as any)
        .from("tenants")
        .select(SELECT_COLS)
        .eq("is_design_partner", true)
        .order("name");
      if (error) throw error;
      return (data ?? []).map((r: any) => rowToState(r));
    },
  });
}

export function useUpdatePilot(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      patch: Partial<{
        pilot_checklist: PilotChecklistState;
        pilot_status: PilotStatus;
        pilot_template: string | null;
        pilot_block_reason: string | null;
        pilot_approval: PilotApproval;
        rollout_status: string;
      }>,
    ) => {
      if (!clientId) throw new Error("clientId required");
      const update: Record<string, unknown> = {
        legal_connect_pilot_updated_at: new Date().toISOString(),
      };
      if (patch.pilot_checklist) update.legal_connect_pilot_checklist = patch.pilot_checklist as any;
      if (patch.pilot_status) update.legal_connect_pilot_status = patch.pilot_status;
      if (patch.pilot_template !== undefined) update.legal_connect_pilot_template = patch.pilot_template;
      if (patch.pilot_block_reason !== undefined) update.legal_connect_pilot_block_reason = patch.pilot_block_reason;
      if (patch.pilot_approval) update.legal_connect_pilot_approval = patch.pilot_approval as any;
      if (patch.rollout_status) update.legal_connect_rollout_status = patch.rollout_status;

      const { error } = await (supabase as any).from("tenants").update(update).eq("id", clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK(clientId ?? "") });
      qc.invalidateQueries({ queryKey: QK_LIST });
      qc.invalidateQueries({ queryKey: ["design-partner", clientId ?? ""] });
      qc.invalidateQueries({ queryKey: ["design-partner", "list"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
