import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users2 } from "lucide-react";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { KpiCard } from "@/components/common/KpiCard";

interface Agent {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  extension: string | null;
  status: string;
  workspace_id: string | null;
  organization_id: string | null;
  provisioned_at: string;
}

/**
 * Canonical workspace Agents surface.
 *
 * Workspace-strict: filters `agents` by `workspace_id` for the current
 * workspace. Legacy rows without a workspace_id are not yet visible here;
 * org-level provisioning (Quick Provision in /admin/agents) will assign
 * workspace_id on new rows once that flow is updated in a follow-up.
 */
export default function WorkspaceAgentsPage() {
  const { workspace } = useWorkspace();

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["workspace-agents", workspace?.id ?? null],
    enabled: !!workspace,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agents")
        .select("id, first_name, last_name, email, role, extension, status, workspace_id, organization_id, provisioned_at")
        .eq("workspace_id", workspace!.id)
        .order("last_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Agent[];
    },
  });

  const total = agents.length;
  const active = agents.filter((a) => a.status === "active").length;
  const pending = agents.filter((a) => a.status === "pending_deletion").length;

  return (
    <div className="space-y-6">
      <WorkspacePageHeader
        eyebrow="Agents"
        title="Agents"
        lede="Agent roster scoped to this workspace."
      />

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
        <KpiCard label="Total" value={total} icon={Users2} loading={isLoading} />
        <KpiCard label="Active" value={active} loading={isLoading} />
        <KpiCard label="Pending offboard" value={pending} loading={isLoading} />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading agents…</p>
      ) : agents.length === 0 ? (
        <EmptyState
          icon={Users2}
          title="No agents in this workspace yet"
          description="Provision agents from Admin > Agents and assign them to this workspace. Roster updates will appear here."
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Extension</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.first_name} {a.last_name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{a.email}</TableCell>
                  <TableCell className="text-xs">{a.role}</TableCell>
                  <TableCell className="text-xs tabular-nums">{a.extension ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={a.status === "active" ? "default" : "secondary"}>{a.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
