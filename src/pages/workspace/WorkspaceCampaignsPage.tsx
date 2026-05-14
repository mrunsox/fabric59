import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Megaphone, Plus, ArrowRight } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ActionCard } from "@/components/common/ActionCard";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceCampaigns } from "@/hooks/useWorkspaceCampaigns";

/**
 * Canonical Workspace Campaigns — /app/workspaces/:id/campaigns (Phase 3).
 * Reads canonical `campaigns` table (workspace-scoped, RLS enforced).
 *
 * Phase F (UI primitive convergence): adopts shared StatusBadge + EmptyState.
 */
export default function WorkspaceCampaignsPage() {
  const { workspace } = useWorkspace();
  const { data: campaigns = [], isLoading } = useWorkspaceCampaigns();
  if (!workspace) return null;
  const base = `/w/${workspace.id}/campaigns`;

  return (
    <div className="space-y-6">
      <WorkspacePageHeader
        eyebrow="Campaigns"
        title="Campaigns"
        lede={`Canonical campaigns for ${workspace.name}. Legacy campaign setups mirror in automatically.`}
        action={
          <Button asChild size="sm">
            <Link to={`${base}/new`}>
              <Plus className="h-3.5 w-3.5 mr-1" /> New campaign
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading campaigns…</p>
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No campaigns in this workspace yet"
          description="Create your first canonical campaign to get started. Legacy campaign setups will mirror in automatically."
          action={
            <Button asChild size="sm">
              <Link to={`${base}/new`}>
                <Plus className="h-3.5 w-3.5 mr-1" /> New campaign
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ActionCard
              to={`${base}/new`}
              icon={Megaphone}
              label="New campaign"
              hint="Outbound or inbound program"
            />
          </div>
          <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link to={`${base}/${c.id}`} className="font-medium hover:text-primary">
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.source_type ?? "canonical"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(c.updated_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Link to={`${base}/${c.id}`}>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </Card>
        </>
      )}
    </div>
  );
}
