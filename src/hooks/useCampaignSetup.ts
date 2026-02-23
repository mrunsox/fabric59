import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { CampaignIntakeData, CampaignSetup } from "@/types/campaign";

export function useCampaignSetups() {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ["campaign_setups", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const { data, error } = await supabase
        .from("campaign_setups")
        .select("*")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as CampaignSetup[];
    },
    enabled: !!organization?.id,
  });
}

export function useCampaignSetup(id: string | undefined) {
  return useQuery({
    queryKey: ["campaign_setup", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("campaign_setups")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as CampaignSetup | null;
    },
    enabled: !!id,
  });
}

export function useSaveCampaignSetup() {
  const queryClient = useQueryClient();
  const { organization, user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      id?: string;
      campaignName: string;
      clientName: string;
      intakeData: CampaignIntakeData;
      checklistState: Record<string, { done: boolean; blocked?: string }>;
      status: string;
      notes?: string;
      priority: string;
      targetGoLive?: string;
      fiveDomainId?: string;
    }) => {
      const payload = {
        organization_id: organization!.id,
        campaign_name: params.campaignName,
        client_name: params.clientName,
        intake_data: JSON.parse(JSON.stringify(params.intakeData)),
        checklist_state: JSON.parse(JSON.stringify(params.checklistState)),
        status: params.status,
        notes: params.notes || null,
        priority: params.priority,
        target_go_live: params.targetGoLive || null,
        five9_domain_id: params.fiveDomainId || null,
        created_by: user?.id || null,
      };

      if (params.id) {
        const { data, error } = await supabase
          .from("campaign_setups")
          .update(payload)
          .eq("id", params.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("campaign_setups")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign_setups"] });
      queryClient.invalidateQueries({ queryKey: ["campaign_setup"] });
    },
    onError: (error) => {
      toast.error("Failed to save campaign: " + error.message);
    },
  });
}

export function useUpdateChecklist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, checklistState }: { id: string; checklistState: Record<string, { done: boolean; blocked?: string }> }) => {
      const { error } = await supabase
        .from("campaign_setups")
        .update({ checklist_state: JSON.parse(JSON.stringify(checklistState)) })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign_setup"] });
    },
  });
}

export function useFive9Prompts() {
  return useQuery({
    queryKey: ["five9_prompts"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("five9-provisioning", {
        body: { action: "getPrompts" },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to fetch prompts");
      return (data.prompts as string[]) || [];
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useFive9Dispositions() {
  return useQuery({
    queryKey: ["five9_dispositions_list"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("five9-provisioning", {
        body: { action: "getDispositions" },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to fetch dispositions");
      return (data.dispositions as string[]) || [];
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

// --- VM Greeting Upload ---
export function useUploadVmGreeting() {
  return useMutation({
    mutationFn: async ({ file, orgId }: { file: File; orgId: string }) => {
      const path = `vm-greetings/${orgId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from("campaign-assets")
        .upload(path, file, { upsert: false });
      if (error) throw error;
      const { data: urlData } = supabase.storage
        .from("campaign-assets")
        .getPublicUrl(path);
      return { path, publicUrl: urlData.publicUrl };
    },
    onError: (error) => {
      toast.error("Failed to upload VM greeting: " + error.message);
    },
  });
}

// --- Auto-Provisioning ---
export type ProvisioningStep = {
  id: string;
  label: string;
  status: "pending" | "running" | "done" | "error";
  error?: string;
};

export function useAutoProvision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campaignId,
      intake,
      checklistState,
      onProgress,
    }: {
      campaignId: string;
      intake: CampaignIntakeData;
      checklistState: Record<string, { done: boolean; blocked?: string }>;
      onProgress: (steps: ProvisioningStep[]) => void;
    }) => {
      const steps: ProvisioningStep[] = [
        { id: "obj_skill", label: "Create Skill", status: "pending" },
        { id: "obj_campaign", label: "Create Campaign", status: "pending" },
        { id: "obj_profile", label: "Create Campaign Profile", status: "pending" },
        { id: "sk_campaign", label: "Add Skill to Campaign", status: "pending" },
        { id: "cmp_dnis", label: "Add DNIS Numbers", status: "pending" },
        { id: "cmp_dispos", label: "Create & Add Dispositions", status: "pending" },
      ];

      const updateStep = (id: string, status: ProvisioningStep["status"], error?: string) => {
        const step = steps.find((s) => s.id === id);
        if (step) {
          step.status = status;
          if (error) step.error = error;
        }
        onProgress([...steps]);
      };

      const updateChecklist = async (itemId: string) => {
        checklistState[itemId] = { done: true };
        await supabase
          .from("campaign_setups")
          .update({ checklist_state: JSON.parse(JSON.stringify(checklistState)) })
          .eq("id", campaignId);
      };

      const invoke = async (body: Record<string, unknown>) => {
        const { data, error } = await supabase.functions.invoke("five9-provisioning", { body });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || "Five9 API call failed");
        return data;
      };

      // 1. Create Skill
      updateStep("obj_skill", "running");
      try {
        await invoke({ action: "createSkill", skillName: intake.skillName });
        await updateChecklist("obj_skill");
        updateStep("obj_skill", "done");
      } catch (e: any) {
        if (e.message?.toLowerCase().includes("already exists")) {
          await updateChecklist("obj_skill");
          updateStep("obj_skill", "done");
        } else {
          updateStep("obj_skill", "error", e.message);
          throw e;
        }
      }

      // 2. Create Inbound Campaign
      updateStep("obj_campaign", "running");
      try {
        await invoke({ action: "createInboundCampaign", campaignName: intake.campaignName, description: intake.campaignDescription || "" });
        await updateChecklist("obj_campaign");
        updateStep("obj_campaign", "done");
      } catch (e: any) {
        if (e.message?.toLowerCase().includes("already exists")) {
          await updateChecklist("obj_campaign");
          updateStep("obj_campaign", "done");
        } else {
          updateStep("obj_campaign", "error", e.message);
          throw e;
        }
      }

      // 3. Create Campaign Profile
      updateStep("obj_profile", "running");
      try {
        await invoke({ action: "createCampaignProfile", profileName: `${intake.campaignName} Profile` });
        await updateChecklist("obj_profile");
        updateStep("obj_profile", "done");
      } catch (e: any) {
        if (e.message?.toLowerCase().includes("already exists")) {
          await updateChecklist("obj_profile");
          updateStep("obj_profile", "done");
        } else {
          updateStep("obj_profile", "error", e.message);
          throw e;
        }
      }

      // 4. Add Skill to Campaign
      updateStep("sk_campaign", "running");
      try {
        await invoke({ action: "addSkillsToCampaign", campaignName: intake.campaignName, skills: [intake.skillName] });
        await updateChecklist("sk_campaign");
        updateStep("sk_campaign", "done");
      } catch (e: any) {
        updateStep("sk_campaign", "error", e.message);
        throw e;
      }

      // 5. Add DNIS
      updateStep("cmp_dnis", "running");
      try {
        const dnisList = intake.dnisNumbers.filter(Boolean);
        if (dnisList.length > 0) {
          await invoke({ action: "addDNISToCampaign", campaignName: intake.campaignName, dnisList });
        }
        await updateChecklist("cmp_dnis");
        updateStep("cmp_dnis", "done");
      } catch (e: any) {
        updateStep("cmp_dnis", "error", e.message);
        throw e;
      }

      // 6. Dispositions
      updateStep("cmp_dispos", "running");
      try {
        if (intake.newDispositions.length > 0) {
          await invoke({
            action: "createDispositions",
            dispositions: intake.newDispositions.map((name) => ({ name })),
          });
        }
        const allDispos = [...intake.existingDispositions, ...intake.newDispositions];
        if (allDispos.length > 0) {
          await invoke({
            action: "addDispositionsToCampaigns",
            campaigns: [intake.campaignName],
            campaignDispositions: allDispos,
            campaignProfiles: [],
            profileDispositions: [],
            dispositionGroups: [],
          });
        }
        await updateChecklist("cmp_dispos");
        updateStep("cmp_dispos", "done");
      } catch (e: any) {
        updateStep("cmp_dispos", "error", e.message);
        throw e;
      }

      // Update campaign status to "provisioned"
      await supabase
        .from("campaign_setups")
        .update({ status: "provisioned" })
        .eq("id", campaignId);

      return steps;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign_setups"] });
      queryClient.invalidateQueries({ queryKey: ["campaign_setup"] });
    },
  });
}
