import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, ArrowRight } from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";

import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import { SeedAssurewayButton } from "@/components/dashboard/SeedAssurewayButton";
import { WorkspaceSetupChecklist } from "@/components/workspace/WorkspaceSetupChecklist";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceCampaigns } from "@/hooks/useWorkspaceCampaigns";
import { useWorkspaceSetupReadiness } from "@/hooks/useWorkspaceSetupReadiness";

/**
 * Workspace Campaigns — list page.
 *
 * Single "New campaign" entry point in the header. Drafts saved from the
 * New Campaign flow appear in the table below.
 */
export default function WorkspaceCampaignsPage() {
  const { workspace } = useWorkspace();
  const { data: campaigns = [], isLoading } = useWorkspaceCampaigns();
  const setup = useWorkspaceSetupReadiness();
  if (!workspace) return null;
  const base = `/w/${workspace.id}/campaigns`;
  const hasExistingAssureway = campaigns.some(
    (c) => c.name === "Main Reception" || c.name === "Assureway" || c.name === "General Inquiry",
  );

  return (
    <div className="space-y-6">
      <WorkspacePageHeader
        eyebrow="Campaigns"
        title="Campaigns"
        lede={`Campaigns for ${workspace.name}. Drafts appear here as soon as they're saved.`}
        action={
          <div className="flex items-center gap-2">
            <SeedAssurewayButton variant="secondary" hasExistingAssureway={hasExistingAssureway} />
            <Button asChild size="sm">
              <Link to={`${base}/new`}>
                <Plus className="h-3.5 w-3.5 mr-1" /> New campaign
              </Link>
            </Button>
          </div>
        }
      />


      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading campaigns…</p>
      ) : campaigns.length === 0 ? (
        <WorkspaceSetupChecklist
          variant="panel"
          readiness={setup}
          title="Get this workspace live"
          description="Your first campaign sits inside a setup journey. Each step links to the surface that owns it; complete them in any order."
        />
      ) : (
        <>
          {!setup.isReady && (
            <WorkspaceSetupChecklist variant="strip" readiness={setup} />
          )}
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
