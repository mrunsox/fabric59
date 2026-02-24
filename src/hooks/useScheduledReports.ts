import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface ScheduledReport {
  id: string;
  organization_id: string;
  created_by: string | null;
  frequency: string;
  date_range_type: string;
  filters: Record<string, unknown>;
  export_format: string;
  five9_report_id: string | null;
  status: string;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useScheduledReports() {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ["scheduled_reports", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const { data, error } = await db
        .from("scheduled_reports")
        .select("*")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ScheduledReport[];
    },
    enabled: !!organization?.id,
  });
}

export function useCreateScheduledReport() {
  const queryClient = useQueryClient();
  const { organization, user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      frequency: string;
      dateRangeType: string;
      filters: Record<string, unknown>;
      exportFormat: string;
    }) => {
      const { error } = await db.from("scheduled_reports").insert({
        organization_id: organization!.id,
        created_by: user?.id || null,
        frequency: params.frequency,
        date_range_type: params.dateRangeType,
        filters: params.filters,
        export_format: params.exportFormat,
        status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled_reports"] });
      toast.success("Scheduled report created");
    },
    onError: (error) => {
      toast.error("Failed to create scheduled report: " + error.message);
    },
  });
}

export function useUpdateScheduledReportStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await db
        .from("scheduled_reports")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled_reports"] });
      toast.success("Report status updated");
    },
  });
}
