import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ReadinessState =
  | "draft"
  | "setup_in_progress"
  | "test_passed"
  | "ready_for_live"
  | "live"
  | "paused";

export type SafeMode = "none" | "email_only" | "no_writeback";

export interface ChecklistState {
  provider_connected?: { confirmed: boolean; at?: string; by?: string };
  auth_valid?: { confirmed: boolean; at?: string; by?: string };
  route_configured?: { confirmed: boolean; at?: string; by?: string };
  outcome_mapping?: { confirmed: boolean; at?: string; by?: string };
  caller_classification?: { confirmed: boolean; at?: string; by?: string };
  email_templates?: { confirmed: boolean; at?: string; by?: string };
  test_call_verified?: { confirmed: boolean; at?: string; by?: string };
  dashboard_checked?: { confirmed: boolean; at?: string; by?: string };
  fallback_known?: { confirmed: boolean; at?: string; by?: string };
}

export interface ClientReadiness {
  state: ReadinessState;
  safe_mode: SafeMode;
  checklist: ChecklistState;
  updated_at: string | null;
}

const QK = (clientId: string) => ["client-readiness", clientId];

export function useClientReadiness(clientId: string | undefined) {
  return useQuery({
    queryKey: QK(clientId ?? ""),
    enabled: !!clientId,
    queryFn: async (): Promise<ClientReadiness> => {
      const { data, error } = await supabase
        .from("tenants")
        .select(
          // @ts-expect-error new columns added by migration; types regen on next sync
          "legal_connect_readiness_state, legal_connect_safe_mode, legal_connect_go_live_checklist, legal_connect_readiness_updated_at",
        )
        .eq("id", clientId!)
        .maybeSingle();
      if (error) throw error;
      const row: any = data ?? {};
      return {
        state: (row.legal_connect_readiness_state ?? "draft") as ReadinessState,
        safe_mode: (row.legal_connect_safe_mode ?? "none") as SafeMode,
        checklist: (row.legal_connect_go_live_checklist ?? {}) as ChecklistState,
        updated_at: row.legal_connect_readiness_updated_at ?? null,
      };
    },
  });
}

export function useUpdateClientReadiness(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      patch: Partial<{
        state: ReadinessState;
        safe_mode: SafeMode;
        checklist: ChecklistState;
      }>,
    ) => {
      if (!clientId) throw new Error("clientId required");
      const update: Record<string, unknown> = {
        legal_connect_readiness_updated_at: new Date().toISOString(),
      };
      if (patch.state) update.legal_connect_readiness_state = patch.state;
      if (patch.safe_mode) update.legal_connect_safe_mode = patch.safe_mode;
      if (patch.checklist) update.legal_connect_go_live_checklist = patch.checklist as any;
      const { error } = await supabase
        .from("tenants")
        .update(update as any)
        .eq("id", clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK(clientId ?? "") });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export const READINESS_LABEL: Record<ReadinessState, string> = {
  draft: "Draft",
  setup_in_progress: "Setup in progress",
  test_passed: "Test passed",
  ready_for_live: "Ready for live",
  live: "Live",
  paused: "Paused",
};

export const SAFE_MODE_LABEL: Record<SafeMode, string> = {
  none: "Full mode",
  email_only: "Email-only fallback",
  no_writeback: "No write-back",
};

export const CHECKLIST_ITEMS: Array<{ key: keyof ChecklistState; label: string; hint: string }> = [
  { key: "provider_connected", label: "Provider connected", hint: "Legal software is connected for this client" },
  { key: "auth_valid", label: "Auth / token valid", hint: "Most recent connection test succeeded" },
  { key: "route_configured", label: "Five9 route configured", hint: "Inbound campaign routes to this client" },
  { key: "outcome_mapping", label: "Outcome mapping reviewed", hint: "Disposition → outcome rules signed off" },
  { key: "caller_classification", label: "Caller classification ready", hint: "Worksheet captures caller type and call reason" },
  { key: "email_templates", label: "Email templates reviewed", hint: "Branded templates ready for email-only outcomes" },
  { key: "test_call_verified", label: "Test call verified", hint: "End-to-end test call landed in dashboard" },
  { key: "dashboard_checked", label: "Dashboard checked", hint: "Delivery dashboard reviewed for clean output" },
  { key: "fallback_known", label: "Fallback plan known", hint: "Team knows how to flip safe-mode if needed" },
];
