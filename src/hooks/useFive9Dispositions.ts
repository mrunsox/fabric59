import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useFive9Campaigns(domainId: string | undefined) {
  return useQuery({
    queryKey: ["five9-campaigns", domainId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("five9-provisioning", {
        body: { action: "getCampaigns" },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to fetch campaigns");
      return (data.campaigns || []) as string[];
    },
    enabled: false,
  });
}

export function useFive9CampaignProfiles(domainId: string | undefined) {
  return useQuery({
    queryKey: ["five9-campaign-profiles", domainId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("five9-provisioning", {
        body: { action: "getCampaignProfiles" },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to fetch campaign profiles");
      return (data.profiles || []) as string[];
    },
    enabled: false,
  });
}

interface DispositionInput {
  name: string;
  type: string;
  description: string;
  agentMustCompleteWorksheet?: boolean;
}

export type AssignTarget = "both" | "campaigns" | "profiles";

interface CreateDispositionsPayload {
  dispositions: DispositionInput[];
  campaigns: string[];
  campaignProfiles: string[];
  /** Per-disposition assignment targets */
  assignTargets: Record<string, AssignTarget>;
  /** Per-disposition group assignment for profile-targeted dispos */
  groupAssignments: Record<string, string>;
  /** Disposition groups to create in campaign profiles */
  dispositionGroups: string[];
}

export interface DispositionResult {
  name: string;
  success: boolean;
  error?: string;
}

export interface AssignmentResult {
  target: string;
  targetType: string;
  success: boolean;
  error?: string;
}

export interface CreateDispositionsResult {
  creationResults: DispositionResult[];
  assignmentResults: AssignmentResult[];
}

export function useCreateDispositions() {
  return useMutation({
    mutationFn: async (payload: CreateDispositionsPayload): Promise<CreateDispositionsResult> => {
      // Step 1: Create dispositions
      const { data: createData, error: createError } = await supabase.functions.invoke("five9-provisioning", {
        body: { action: "createDispositions", dispositions: payload.dispositions },
      });
      if (createError) throw createError;
      if (!createData?.success) throw new Error(createData?.error || "Failed to create dispositions");

      const creationResults = (createData.results || []) as DispositionResult[];
      const successNames = creationResults.filter(r => r.success).map(r => r.name);

      // Step 2: Split dispositions by target
      const campaignDispositions = successNames.filter(n => {
        const t = payload.assignTargets[n] || "both";
        return t === "both" || t === "campaigns";
      });
      const profileDispositions = successNames
        .filter(n => {
          const t = payload.assignTargets[n] || "both";
          return t === "both" || t === "profiles";
        })
        .map(n => ({ name: n, group: payload.groupAssignments[n] || undefined }));

      let assignmentResults: AssignmentResult[] = [];

      if (
        (campaignDispositions.length > 0 || profileDispositions.length > 0) &&
        (payload.campaigns.length > 0 || payload.campaignProfiles.length > 0)
      ) {
        const { data: assignData, error: assignError } = await supabase.functions.invoke("five9-provisioning", {
          body: {
            action: "addDispositionsToCampaigns",
            campaignDispositions,
            profileDispositions,
            dispositionGroups: payload.dispositionGroups,
            campaigns: payload.campaigns,
            campaignProfiles: payload.campaignProfiles,
          },
        });
        if (assignError) throw assignError;
        assignmentResults = (assignData?.results || []) as AssignmentResult[];
      }

      return { creationResults, assignmentResults };
    },
  });
}
