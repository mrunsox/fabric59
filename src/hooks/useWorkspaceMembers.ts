import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace, type WorkspaceRoleLiteral } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

/**
 * Phase 13 — Canonical workspace RBAC.
 *
 * Reads `workspace_members` for the active workspace and enriches each row
 * with the member's profile (email, display name) so the Members & Roles
 * screen can show recognizable people instead of bare uuids.
 *
 * Joined with `organization_members` (left) so we can also list org members
 * who are NOT yet workspace members and offer them the "Add to workspace"
 * action.
 */
export type WorkspaceMemberRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRoleLiteral;
  created_at: string;
  email: string | null;
  full_name: string | null;
};

export function useWorkspaceMembers() {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ["workspace-members", workspace?.id ?? null],
    enabled: !!workspace,
    queryFn: async (): Promise<WorkspaceMemberRow[]> => {
      const { data, error } = await supabase
        .from("workspace_members")
        .select("id, workspace_id, user_id, role, created_at")
        .eq("workspace_id", workspace!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const ids = (data ?? []).map((r) => r.user_id);
      if (ids.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", ids);
      const byId = new Map((profiles ?? []).map((p: any) => [p.id, p]));
      return (data ?? []).map((r: any) => ({
        ...r,
        email: byId.get(r.user_id)?.email ?? null,
        full_name: byId.get(r.user_id)?.full_name ?? null,
      }));
    },
  });
}

/** Org members who are not yet in this workspace — candidates to add. */
export function useAddableOrgMembers() {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ["addable-org-members", workspace?.id ?? null],
    enabled: !!workspace,
    queryFn: async () => {
      const { data: orgRows, error } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", workspace!.organization_id);
      if (error) throw error;
      const { data: wsRows } = await supabase
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", workspace!.id);
      const inWs = new Set((wsRows ?? []).map((r: any) => r.user_id));
      const candidates = (orgRows ?? [])
        .map((r: any) => r.user_id)
        .filter((uid: string) => !inWs.has(uid));
      if (candidates.length === 0) return [] as { user_id: string; email: string | null; full_name: string | null }[];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", candidates);
      return (profiles ?? []).map((p: any) => ({
        user_id: p.id,
        email: p.email,
        full_name: p.full_name,
      }));
    },
  });
}

export function useAddWorkspaceMember() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: async (args: { user_id: string; role: WorkspaceRoleLiteral }) => {
      if (!workspace) throw new Error("No workspace");
      const { error } = await supabase
        .from("workspace_members")
        .insert({ workspace_id: workspace.id, user_id: args.user_id, role: args.role });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-members"] });
      qc.invalidateQueries({ queryKey: ["addable-org-members"] });
      toast({ title: "Member added" });
    },
    onError: (e: Error) => toast({ title: "Could not add member", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateWorkspaceMemberRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; role: WorkspaceRoleLiteral }) => {
      const { error } = await supabase
        .from("workspace_members")
        .update({ role: args.role })
        .eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-members"] });
      toast({ title: "Role updated" });
    },
    onError: (e: Error) => toast({ title: "Could not update role", description: e.message, variant: "destructive" }),
  });
}

export function useRemoveWorkspaceMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workspace_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-members"] });
      qc.invalidateQueries({ queryKey: ["addable-org-members"] });
      toast({ title: "Member removed" });
    },
    onError: (e: Error) => toast({ title: "Could not remove member", description: e.message, variant: "destructive" }),
  });
}

/**
 * Returns the current user's effective workspace role (or null if not a
 * direct workspace member). Org owners/admins and master admins are not
 * reflected here — they are checked separately via AuthContext.
 */
export function useMyWorkspaceRole() {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ["my-workspace-role", workspace?.id ?? null, user?.id ?? null],
    enabled: !!user && !!workspace,
    queryFn: async (): Promise<WorkspaceRoleLiteral | null> => {
      const { data, error } = await supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", workspace!.id)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data?.role as WorkspaceRoleLiteral | undefined) ?? null;
    },
  });
}

/**
 * Server-truth check via the SECURITY DEFINER `has_workspace_role_min` RPC.
 * Use this for write-gating in UI; reads can fall back to useMyWorkspaceRole.
 */
export function useCanManageWorkspace() {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ["can-manage-workspace", workspace?.id ?? null, user?.id ?? null],
    enabled: !!user && !!workspace,
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase.rpc("has_workspace_role_min", {
        _user_id: user!.id,
        _workspace_id: workspace!.id,
        _min: "admin",
      });
      if (error) return false;
      return !!data;
    },
  });
}
