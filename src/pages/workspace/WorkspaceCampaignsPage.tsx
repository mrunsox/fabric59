import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Megaphone, Plus, ArrowRight } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceCampaigns } from "@/hooks/useWorkspaceCampaigns";

const STATUS_VARIANT: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  ready: "bg-primary/10 text-primary",
  live: "bg-success/10 text-success",
  paused: "bg-warning/10 text-warning",
  archived: "bg-muted text-muted-foreground",
};

/**
 * Canonical Workspace Campaigns — /app/workspaces/:id/campaigns (Phase 3).
 * Reads canonical `campaigns` table (workspace-scoped, RLS enforced).
 */
export default function WorkspaceCampaignsPage() {
  const { workspace } = useWorkspace();
  const { data: campaigns = [], isLoading } = useWorkspaceCampaigns();
  if (!workspace) return null;
  const base = `/app/workspaces/${workspace.id}/campaigns`;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Badge variant="outline" className="border-accent/40 text-accent mb-2">
            Workspace campaigns
          </Badge>
          <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Canonical campaigns for <span className="font-medium text-foreground">{workspace.name}</span>.
            Legacy <code className="text-xs">campaign_setups</code> rows mirror in automatically.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/campaigns">Legacy view</Link>
          </Button>
          <Button asChild size="sm">
            <Link to={`${base}/new`}>
              <Plus className="h-3.5 w-3.5 mr-1" /> New campaign
            </Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading campaigns…</p>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground flex items-center gap-3">
            <Megaphone className="h-4 w-4" />
            No campaigns in this workspace yet. Create one to get started.
          </CardContent>
        </Card>
      ) : (
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
                    <Badge className={STATUS_VARIANT[c.status] ?? ""} variant="secondary">
                      {c.status}
                    </Badge>
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
      )}
    </div>
  );
}
