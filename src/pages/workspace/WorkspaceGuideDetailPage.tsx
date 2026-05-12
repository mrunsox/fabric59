import { Link, useParams } from "react-router-dom";
import { useWorkspaceGuide } from "@/hooks/useWorkspaceGuides";
import { useWorkspaceCampaigns } from "@/hooks/useWorkspaceCampaigns";
import { useAssignGuideToCampaign } from "@/hooks/useWorkspaceGuides";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Edit, Eye, ExternalLink } from "lucide-react";

export default function WorkspaceGuideDetailPage() {
  const { workspaceId, guideId } = useParams();
  const { data: guide, isLoading } = useWorkspaceGuide(guideId);
  const { data: campaigns = [] } = useWorkspaceCampaigns();
  const assign = useAssignGuideToCampaign();

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading guide…</p>;
  if (!guide) return <p className="text-sm text-muted-foreground">Guide not found.</p>;

  const isLegacyScript = guide.source_type === "script" && guide.source_id;
  const editHref = isLegacyScript
    ? `/admin/scripts/${guide.source_id}/builder`
    : `/app/workspaces/${workspaceId}/guides/${guide.id}/edit`;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to={`/app/workspaces/${workspaceId}/guides`}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to guides
        </Link>
      </Button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{guide.name}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge>{guide.status}</Badge>
            <Badge variant="outline">v{guide.current_version}</Badge>
            {isLegacyScript && <Badge variant="secondary">legacy script source</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to={`/app/workspaces/${workspaceId}/guides/${guide.id}/preview`}>
              <Eye className="h-4 w-4 mr-2" /> Preview
            </Link>
          </Button>
          <Button asChild>
            <Link to={editHref}>
              {isLegacyScript ? <ExternalLink className="h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
              Edit in builder
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Description</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {guide.description || "No description provided."}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Campaign assignment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            One campaign can have many guides. A guide may be unassigned or assigned to exactly one campaign in this workspace.
          </p>
          <Select
            value={guide.campaign_id ?? "__none__"}
            onValueChange={(v) =>
              assign.mutate({ guideId: guide.id, campaignId: v === "__none__" ? null : v })
            }
          >
            <SelectTrigger className="max-w-sm">
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Unassigned</SelectItem>
              {campaigns.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Source</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <div>Type: {guide.source_type ?? "canonical"}</div>
          {guide.source_id && <div>Source ID: {guide.source_id}</div>}
          <div>Updated: {new Date(guide.updated_at).toLocaleString()}</div>
        </CardContent>
      </Card>
    </div>
  );
}
