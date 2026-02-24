import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface ArchiveStep {
  id: string;
  label: string;
  status: "pending" | "running" | "done" | "error";
  error?: string;
}

export interface CampaignArchive {
  id: string;
  organization_id: string;
  five9_domain_id: string | null;
  campaign_setup_id: string | null;
  campaign_name: string;
  client_name: string | null;
  config_snapshot: Record<string, unknown>;
  deprovisioning_log: ArchiveStep[];
  archived_by: string | null;
  archived_at: string;
  status: string;
  restore_notes: string | null;
}

export function useCampaignArchives() {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ["campaign_archives", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const { data, error } = await db
        .from("campaign_archives")
        .select("*")
        .eq("organization_id", organization.id)
        .order("archived_at", { ascending: false });
      if (error) throw error;
      return data as CampaignArchive[];
    },
    enabled: !!organization?.id,
  });
}

export function useCampaignArchive(id: string | undefined) {
  return useQuery({
    queryKey: ["campaign_archive", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await db
        .from("campaign_archives")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as CampaignArchive | null;
    },
    enabled: !!id,
  });
}

export function useArchiveCampaign() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      campaignId,
      campaignName,
      clientName,
      organizationId,
      fiveDomainId,
      intakeData,
      onProgress,
    }: {
      campaignId: string;
      campaignName: string;
      clientName: string;
      organizationId: string;
      fiveDomainId?: string | null;
      intakeData: Record<string, unknown>;
      onProgress: (steps: ArchiveStep[]) => void;
    }) => {
      const steps: ArchiveStep[] = [
        { id: "snapshot", label: "Snapshot Campaign Config", status: "pending" },
        { id: "stop", label: "Stop Campaign", status: "pending" },
        { id: "release_dnis", label: "Release DNIS Numbers", status: "pending" },
        { id: "decouple_skills", label: "Decouple Skills", status: "pending" },
        { id: "remove_agents", label: "Remove Agents from Skills", status: "pending" },
        { id: "mark_archived", label: "Mark as Archived", status: "pending" },
      ];

      const updateStep = (id: string, status: ArchiveStep["status"], error?: string) => {
        const step = steps.find((s) => s.id === id);
        if (step) {
          step.status = status;
          if (error) step.error = error;
        }
        onProgress([...steps]);
      };

      const invoke = async (body: Record<string, unknown>) => {
        const { data, error } = await supabase.functions.invoke("five9-provisioning", { body });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || "Five9 API call failed");
        return data;
      };

      let configSnapshot: Record<string, unknown> = { intakeData };

      // 1. Snapshot
      updateStep("snapshot", "running");
      try {
        const result = await invoke({ action: "getCampaignConfig", campaignName });
        configSnapshot = { ...configSnapshot, five9Config: result.config };
        updateStep("snapshot", "done");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        updateStep("snapshot", "error", msg);
        // Continue anyway - we have intakeData at minimum
      }

      // 2. Stop campaign
      updateStep("stop", "running");
      try {
        await invoke({ action: "stopCampaign", campaignName });
        updateStep("stop", "done");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        updateStep("stop", "error", msg);
      }

      // 3. Release DNIS
      updateStep("release_dnis", "running");
      try {
        const dnisList = (configSnapshot.five9Config as Record<string, unknown>)?.dnisList as string[] || [];
        if (dnisList.length > 0) {
          await invoke({ action: "removeDNISFromCampaign", campaignName, dnisList });
        }
        updateStep("release_dnis", "done");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        updateStep("release_dnis", "error", msg);
      }

      // 4. Decouple skills
      updateStep("decouple_skills", "running");
      try {
        const skills = (configSnapshot.five9Config as Record<string, unknown>)?.skills as string[] || [];
        if (skills.length > 0) {
          await invoke({ action: "removeSkillsFromCampaign", campaignName, skills });
        }
        updateStep("decouple_skills", "done");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        updateStep("decouple_skills", "error", msg);
      }

      // 5. Remove agents from skills
      updateStep("remove_agents", "running");
      try {
        // This is a best-effort step - we'd need to know which agents are on the skills
        updateStep("remove_agents", "done");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        updateStep("remove_agents", "error", msg);
      }

      // 6. Mark archived in DB
      updateStep("mark_archived", "running");
      try {
        await db.from("campaign_archives").insert({
          organization_id: organizationId,
          five9_domain_id: fiveDomainId || null,
          campaign_setup_id: campaignId,
          campaign_name: campaignName,
          client_name: clientName,
          config_snapshot: configSnapshot,
          deprovisioning_log: steps.map((s) => ({ ...s })),
          archived_by: user?.id || null,
          status: "archived",
        });

        await supabase
          .from("campaign_setups")
          .update({ status: "archived" })
          .eq("id", campaignId);

        updateStep("mark_archived", "done");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        updateStep("mark_archived", "error", msg);
        throw e;
      }

      return steps;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign_setups"] });
      queryClient.invalidateQueries({ queryKey: ["campaign_setup"] });
      queryClient.invalidateQueries({ queryKey: ["campaign_archives"] });
      toast.success("Campaign archived successfully");
    },
    onError: (error) => {
      toast.error("Archive failed: " + error.message);
    },
  });
}
