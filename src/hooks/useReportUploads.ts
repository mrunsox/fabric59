import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ReportUpload {
  id: string;
  organization_id: string;
  partner_id: string | null;
  tenant_id: string | null;
  five9_domain_id: string | null;
  original_filename: string;
  file_size_bytes: number | null;
  file_type: string;
  uploaded_by: string | null;
  uploaded_at: string;
  parsed_summary: Record<string, unknown>;
  exclusions_applied: string[];
  row_count: number;
  created_at: string;
}

export function useReportUploads() {
  const { organization } = useOrganization();
  const orgId = organization?.id;

  return useQuery({
    queryKey: ["report_uploads", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("report_uploads")
        .select("*")
        .eq("organization_id", orgId)
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return data as ReportUpload[];
    },
    enabled: !!orgId,
  });
}

export function useCreateReportUpload() {
  const qc = useQueryClient();
  const { organization } = useOrganization();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      original_filename: string;
      file_size_bytes?: number;
      file_type: string;
      partner_id?: string | null;
      tenant_id?: string | null;
      five9_domain_id?: string | null;
      parsed_summary: Record<string, unknown>;
      exclusions_applied: string[];
      row_count: number;
    }) => {
      if (!organization?.id) throw new Error("No organization");
      const { data, error } = await supabase
        .from("report_uploads")
        .insert({
          organization_id: organization.id,
          uploaded_by: user?.id || null,
          original_filename: input.original_filename,
          file_size_bytes: input.file_size_bytes || null,
          file_type: input.file_type,
          partner_id: input.partner_id || null,
          tenant_id: input.tenant_id || null,
          five9_domain_id: input.five9_domain_id || null,
          parsed_summary: input.parsed_summary as any,
          exclusions_applied: input.exclusions_applied,
          row_count: input.row_count,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["report_uploads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteReportUpload() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("report_uploads")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["report_uploads"] });
      toast.success("Upload deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
