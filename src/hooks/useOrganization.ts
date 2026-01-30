import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Organization, OrganizationMember, OrganizationFormData, OrgRole } from "@/types/database";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export function useOrganizationMembers() {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ["organization_members", organization?.id],
    queryFn: async (): Promise<OrganizationMember[]> => {
      if (!organization) return [];

      const { data, error } = await supabase
        .from("organization_members")
        .select("*")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      return (data || []).map((row) => ({
        id: row.id,
        organization_id: row.organization_id,
        user_id: row.user_id,
        role: row.role as OrgRole,
        created_at: row.created_at,
      }));
    },
    enabled: !!organization,
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();
  const { organization } = useAuth();

  return useMutation({
    mutationFn: async (data: Partial<OrganizationFormData>) => {
      if (!organization) throw new Error("No organization selected");

      const updateData: Record<string, unknown> = {};

      if (data.name !== undefined) updateData.name = data.name;
      if (data.billing_email !== undefined) updateData.billing_email = data.billing_email;
      if (data.plan !== undefined) updateData.plan = data.plan;

      const { error } = await supabase
        .from("organizations")
        .update(updateData)
        .eq("id", organization.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success("Organization updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update organization: ${error.message}`);
    },
  });
}

export function useInviteMember() {
  const queryClient = useQueryClient();
  const { organization } = useAuth();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: OrgRole }) => {
      if (!organization) throw new Error("No organization selected");

      const { error } = await supabase.from("organization_members").insert([
        {
          organization_id: organization.id,
          user_id: userId,
          role,
        },
      ]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization_members"] });
      toast.success("Member added successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to add member: ${error.message}`);
    },
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: OrgRole }) => {
      const { error } = await supabase
        .from("organization_members")
        .update({ role })
        .eq("id", memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization_members"] });
      toast.success("Member role updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update role: ${error.message}`);
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("organization_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization_members"] });
      toast.success("Member removed");
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove member: ${error.message}`);
    },
  });
}
