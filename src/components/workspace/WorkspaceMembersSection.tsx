import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, UserPlus, ShieldCheck } from "lucide-react";
import {
  WORKSPACE_ROLES,
  WORKSPACE_ROLE_LABELS,
  type WorkspaceRoleLiteral,
} from "@/contexts/WorkspaceContext";
import {
  useWorkspaceMembers,
  useAddableOrgMembers,
  useAddWorkspaceMember,
  useUpdateWorkspaceMemberRole,
  useRemoveWorkspaceMember,
  useCanManageWorkspace,
} from "@/hooks/useWorkspaceMembers";
import { EmptyState } from "@/components/common/EmptyState";

/**
 * Phase 13 — Workspace Members & Roles surface.
 *
 * Renders inside WorkspaceSettingsPage. Read-visible to any workspace member;
 * write actions (add/remove/role change) gated on the server by
 * has_workspace_role_min(_, _, 'admin') and mirrored client-side via
 * useCanManageWorkspace() for UX.
 */
export function WorkspaceMembersSection() {
  const { data: members = [], isLoading } = useWorkspaceMembers();
  const { data: addable = [] } = useAddableOrgMembers();
  const { data: canManage = false } = useCanManageWorkspace();
  const addMember = useAddWorkspaceMember();
  const updateRole = useUpdateWorkspaceMemberRole();
  const removeMember = useRemoveWorkspaceMember();

  const [pickUserId, setPickUserId] = useState<string>("");
  const [pickRole, setPickRole] = useState<WorkspaceRoleLiteral>("agent");

  return (
    <Card>
      <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">Members & Roles</CardTitle>
        </div>
        <Badge variant="outline" className="text-[10px]">
          {members.length} {members.length === 1 ? "member" : "members"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {!canManage && (
          <p className="text-xs text-muted-foreground">
            You can view members of this workspace. Workspace admins or organization
            owners/admins can add, remove, or change roles.
          </p>
        )}

        {canManage && (
          <div className="rounded-md border bg-muted/20 p-3 space-y-2">
            <div className="text-xs font-medium">Add a workspace member</div>
            {addable.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Everyone in this organization is already a workspace member. Invite
                more teammates from organization settings first.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 items-end">
                <div className="flex-1 min-w-[220px]">
                  <Select value={pickUserId} onValueChange={setPickUserId}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Pick an organization member" />
                    </SelectTrigger>
                    <SelectContent>
                      {addable.map((u) => (
                        <SelectItem key={u.user_id} value={u.user_id}>
                          {u.full_name || u.email || u.user_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Select
                  value={pickRole}
                  onValueChange={(v) => setPickRole(v as WorkspaceRoleLiteral)}
                >
                  <SelectTrigger className="h-8 text-xs w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WORKSPACE_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {WORKSPACE_ROLE_LABELS[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  className="h-8"
                  disabled={!pickUserId || addMember.isPending}
                  onClick={() => {
                    if (!pickUserId) return;
                    addMember.mutate(
                      { user_id: pickUserId, role: pickRole },
                      { onSuccess: () => setPickUserId("") },
                    );
                  }}
                >
                  <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Add
                </Button>
              </div>
            )}
          </div>
        )}

        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading members…</p>
        ) : members.length === 0 ? (
          <EmptyState
            title="No workspace members yet"
            description="Add organization members to this workspace to grant them workspace-scoped access."
          />
        ) : (
          <div className="rounded-md border divide-y">
            {members.map((m) => (
              <div
                key={m.id}
                className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm"
              >
                <div className="flex-1 min-w-[180px]">
                  <div className="font-medium leading-tight">
                    {m.full_name || m.email || m.user_id}
                  </div>
                  {m.email && m.full_name ? (
                    <div className="text-[11px] text-muted-foreground">{m.email}</div>
                  ) : null}
                </div>
                <Select
                  value={m.role}
                  disabled={!canManage || updateRole.isPending}
                  onValueChange={(v) =>
                    updateRole.mutate({ id: m.id, role: v as WorkspaceRoleLiteral })
                  }
                >
                  <SelectTrigger className="h-8 text-xs w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WORKSPACE_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {WORKSPACE_ROLE_LABELS[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {canManage ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    disabled={removeMember.isPending}
                    onClick={() => removeMember.mutate(m.id)}
                    aria-label="Remove member"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
