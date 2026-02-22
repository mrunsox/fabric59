import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const PERMISSION_KEYS = [
  { key: "agents", label: "Agents", description: "Manage agent provisioning and offboarding" },
  { key: "tenants", label: "Clients", description: "View and manage tenant/client records" },
  { key: "domains", label: "Domains", description: "Manage Five9 domain connections" },
  { key: "integrations", label: "Integrations", description: "Browse and configure integrations" },
  { key: "mappings", label: "Mappings", description: "Configure field mapping rules" },
  { key: "logs", label: "Logs", description: "View API request logs" },
  { key: "test_console", label: "Test Console", description: "Send test API requests" },
  { key: "notifications", label: "Notifications", description: "View system notifications" },
  { key: "settings", label: "Settings", description: "Modify organization settings" },
  { key: "call_flow", label: "Call Flow", description: "AI call flow builder access" },
] as const;

interface TeamMember {
  userId: string;
  email: string;
  displayName: string | null;
  role: string;
  permissions: string[];
}

export function useTeamPermissions(orgId: string | undefined) {
  const queryClient = useQueryClient();

  const membersQuery = useQuery({
    queryKey: ["team-permissions", orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<TeamMember[]> => {
      if (!orgId) return [];

      // Get org members
      const { data: members, error: membersError } = await supabase
        .from("organization_members")
        .select("user_id, role")
        .eq("organization_id", orgId);

      if (membersError) throw membersError;
      if (!members?.length) return [];

      const userIds = members.map((m) => m.user_id);

      // Get profiles for display names and emails
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, email")
        .in("id", userIds);

      // Get permissions
      const { data: permissions } = await supabase
        .from("user_permissions")
        .select("user_id, permission")
        .eq("organization_id", orgId)
        .in("user_id", userIds);

      return members.map((m) => {
        const profile = profiles?.find((p) => p.id === m.user_id);
        const memberPerms = permissions?.filter((p) => p.user_id === m.user_id).map((p) => p.permission) || [];
        return {
          userId: m.user_id,
          email: profile?.display_name || (profile as any)?.email || m.user_id.slice(0, 8),
          displayName: profile?.display_name || null,
          role: m.role,
          permissions: memberPerms,
        };
      });
    },
  });

  const togglePermission = useMutation({
    mutationFn: async ({ userId, permission, grant }: { userId: string; permission: string; grant: boolean }) => {
      if (!orgId) throw new Error("No org");
      if (grant) {
        const { error } = await supabase.from("user_permissions").insert({
          user_id: userId,
          organization_id: orgId,
          permission,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_permissions")
          .delete()
          .eq("user_id", userId)
          .eq("organization_id", orgId)
          .eq("permission", permission);
        if (error) throw error;
      }
    },
    onMutate: async ({ userId, permission, grant }) => {
      await queryClient.cancelQueries({ queryKey: ["team-permissions", orgId] });
      const prev = queryClient.getQueryData<TeamMember[]>(["team-permissions", orgId]);
      queryClient.setQueryData<TeamMember[]>(["team-permissions", orgId], (old) =>
        old?.map((m) =>
          m.userId === userId
            ? {
                ...m,
                permissions: grant
                  ? [...m.permissions, permission]
                  : m.permissions.filter((p) => p !== permission),
              }
            : m
        )
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["team-permissions", orgId], ctx.prev);
      toast.error("Failed to update permission");
    },
    onSuccess: (_d, { grant, permission }) => {
      toast.success(`${permission} permission ${grant ? "granted" : "revoked"}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["team-permissions", orgId] });
    },
  });

  return { members: membersQuery.data || [], isLoading: membersQuery.isLoading, togglePermission };
}
