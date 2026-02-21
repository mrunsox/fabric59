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
    enabled: false, // manually triggered
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
}

interface CreateDispositionsPayload {
  dispositions: DispositionInput[];
  campaigns: string[];
  campaignProfiles: string[];
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

      // Step 2: Assign successful dispositions to campaigns/profiles
      const successNames = creationResults.filter(r => r.success).map(r => r.name);
      let assignmentResults: AssignmentResult[] = [];

      if (successNames.length > 0 && (payload.campaigns.length > 0 || payload.campaignProfiles.length > 0)) {
        const { data: assignData, error: assignError } = await supabase.functions.invoke("five9-provisioning", {
          body: {
            action: "addDispositionsToCampaigns",
            dispositionNames: successNames,
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
