import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Building, ArrowRight, FileText, BookOpen, Megaphone, Headphones, Layers,
  MoreVertical, Plus, Pencil, Trash2, Star, Users,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/sections/DashboardHeader";
import {
  CreateWorkspaceDialog, RenameWorkspaceDialog, DeleteWorkspaceDialog, MoveTenantsDialog,
} from "@/components/admin/workspaces/WorkspaceAdminDialogs";
import { useUpdateWorkspace } from "@/hooks/useAdminWorkspaces";

interface OrgRow {
  id: string;
  name: string;
  status: string | null;
  five9_ownership_mode: string | null;
}
interface WorkspaceRow {
  id: string;
  organization_id: string;
  name: string;
  is_default: boolean;
}

type Dialog =
  | { kind: "create" }
  | { kind: "rename"; workspace: WorkspaceRow }
  | { kind: "delete"; workspace: WorkspaceRow }
  | { kind: "move"; workspace: WorkspaceRow; org: OrgRow };

export default function WorkspacesPage() {
  const { isMasterAdmin } = useAuth();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const setDefault = useUpdateWorkspace();

  const { data: orgs = [], isLoading } = useQuery<OrgRow[]>({
    queryKey: ["admin-workspaces-orgs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, status, five9_ownership_mode")
        .order("name");
      if (error) throw error;
      return (data || []) as OrgRow[];
    },
  });

  const { data: workspaces = [] } = useQuery<WorkspaceRow[]>({
    queryKey: ["admin-workspaces-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspaces")
        .select("id, organization_id, name, is_default")
        .order("is_default", { ascending: false })
        .order("name");
      if (error) throw error;
      return (data || []) as WorkspaceRow[];
    },
  });

  const orgsById = useMemo(() => {
    const m: Record<string, OrgRow> = {};
    for (const o of orgs) m[o.id] = o;
    return m;
  }, [orgs]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <DashboardHeader
          icon={Layers}
          title="Workspaces"
          subtitle="Tenant boundary for the platform. Workspaces are backed by the organizations table; all flows, deployments, runs, and clients are scoped here."
          scope="organization"
        />
        {isMasterAdmin && (
          <Button onClick={() => setDialog({ kind: "create" })} className="gap-1.5 shrink-0 mt-2">
            <Plus className="h-4 w-4" /> New workspace
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : workspaces.length === 0 ? (
        <Card><CardContent className="pt-6 text-sm text-muted-foreground">No workspaces yet.</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((w) => {
            const org = orgsById[w.organization_id];
            const base = `/w/${w.id}`;
            return (
              <Card key={w.id} className="hover:border-primary/40 transition-colors h-full flex flex-col">
                <CardHeader className="flex-row items-start gap-3 space-y-0">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Building className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link to={`/admin/workspaces/${w.organization_id}`} className="block">
                      <CardTitle className="text-base truncate" title={w.name}>{w.name}</CardTitle>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {org?.name ?? "Unknown organization"}
                      </p>
                    </Link>
                  </div>
                  {isMasterAdmin ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDialog({ kind: "rename", workspace: w })}>
                          <Pencil className="h-3.5 w-3.5 mr-2" /> Rename
                        </DropdownMenuItem>
                        {!w.is_default && (
                          <DropdownMenuItem onClick={() => setDefault.mutate({
                            workspaceId: w.id, organizationId: w.organization_id, isDefault: true,
                          })}>
                            <Star className="h-3.5 w-3.5 mr-2" /> Set as default
                          </DropdownMenuItem>
                        )}
                        {org && (
                          <DropdownMenuItem onClick={() => setDialog({ kind: "move", workspace: w, org })}>
                            <Users className="h-3.5 w-3.5 mr-2" /> Move clients here…
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDialog({ kind: "delete", workspace: w })}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete workspace
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </CardHeader>
                <CardContent className="flex flex-col gap-3 mt-auto">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{org?.status || "active"}</Badge>
                    {w.is_default && <Badge>default</Badge>}
                    <Badge variant="secondary">Five9: {org?.five9_ownership_mode || "workspace"}-owned</Badge>
                  </div>
                  <Button asChild size="sm" className="w-full gap-1.5">
                    <Link to={`${base}/campaigns`}>
                      Open workspace <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <div className="grid grid-cols-4 gap-1.5">
                    <DeepLink to={`${base}/forms`} icon={FileText} label="Forms" />
                    <DeepLink to={`${base}/guides`} icon={BookOpen} label="Guides" />
                    <DeepLink to={`${base}/campaigns`} icon={Megaphone} label="Campaigns" />
                    <DeepLink to={`${base}/agent`} icon={Headphones} label="Agent" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CreateWorkspaceDialog
        open={dialog?.kind === "create"}
        onOpenChange={(v) => !v && setDialog(null)}
        orgs={orgs.map((o) => ({ id: o.id, name: o.name }))}
      />
      <RenameWorkspaceDialog
        open={dialog?.kind === "rename"}
        onOpenChange={(v) => !v && setDialog(null)}
        workspace={dialog?.kind === "rename" ? dialog.workspace : null}
      />
      <DeleteWorkspaceDialog
        open={dialog?.kind === "delete"}
        onOpenChange={(v) => !v && setDialog(null)}
        workspace={dialog?.kind === "delete" ? dialog.workspace : null}
      />
      <MoveTenantsDialog
        open={dialog?.kind === "move"}
        onOpenChange={(v) => !v && setDialog(null)}
        destination={dialog?.kind === "move" ? {
          workspaceId: dialog.workspace.id,
          workspaceName: dialog.workspace.name,
          organizationId: dialog.org.id,
          organizationName: dialog.org.name,
        } : null}
      />
    </div>
  );
}

function DeepLink({
  to, icon: Icon, label,
}: { to: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <Link
      to={to}
      title={label}
      className="flex flex-col items-center justify-center gap-1 rounded-md border border-border/60 bg-muted/20 px-1.5 py-2 text-[10px] font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground hover:border-primary/40 transition-colors"
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="truncate w-full text-center">{label}</span>
    </Link>
  );
}
