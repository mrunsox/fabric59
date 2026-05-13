import { Link, useParams } from "react-router-dom";
import { useWorkspaceGuide } from "@/hooks/useWorkspaceGuides";
import { useWorkspaceCampaigns } from "@/hooks/useWorkspaceCampaigns";
import { useAssignGuideToCampaign } from "@/hooks/useWorkspaceGuides";
import {
  useGuideVersions,
  usePublishGuideVersion,
  useRollbackGuide,
} from "@/hooks/useGuideVersions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Edit, Eye, ExternalLink, History, RotateCcw, Send } from "lucide-react";

export default function WorkspaceGuideDetailPage() {
  const { workspaceId, guideId } = useParams();
  const { data: guide, isLoading } = useWorkspaceGuide(guideId);
  const { data: campaigns = [] } = useWorkspaceCampaigns();
  const { data: versions = [] } = useGuideVersions(guideId);
  const assign = useAssignGuideToCampaign();
  const publish = usePublishGuideVersion();
  const rollback = useRollbackGuide();

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading guide…</p>;
  if (!guide) return <p className="text-sm text-muted-foreground">Guide not found.</p>;

  const isLegacyScript = guide.source_type === "script" && guide.source_id;
  const editHref = `/w/${workspaceId}/guides/${guide.id}/edit`;
  const fromTemplateId = (guide.metadata as Record<string, unknown> | null)?.from_template_id as
    | string
    | undefined;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to={`/w/${workspaceId}/guides`}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to guides
        </Link>
      </Button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{guide.name}</h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge>{guide.status}</Badge>
            <Badge variant="outline">v{guide.current_version} live</Badge>
            {isLegacyScript ? (
              <Badge variant="secondary">legacy script source</Badge>
            ) : (
              <Badge variant="outline">canonical native</Badge>
            )}
            {fromTemplateId && (
              <Link
                to={`/w/${workspaceId}/templates/${fromTemplateId}`}
                className="text-xs text-primary hover:underline"
              >
                ← from template
              </Link>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to={`/w/${workspaceId}/guides/${guide.id}/preview`}>
              <Eye className="h-4 w-4 mr-2" /> Preview
            </Link>
          </Button>
          <Button asChild>
            <Link to={editHref}>
              {isLegacyScript ? <ExternalLink className="h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
              {isLegacyScript ? "Edit in legacy builder" : "Edit"}
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
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" /> Version history
          </CardTitle>
        </CardHeader>
        <CardContent>
          {versions.length === 0 ? (
            <p className="text-xs text-muted-foreground">No versions yet.</p>
          ) : (
            <div className="space-y-1.5">
              {versions.map((v) => {
                const isLive = v.is_current;
                const isLatest = v.version === versions[0].version;
                return (
                  <div
                    key={v.id}
                    className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium">v{v.version}</span>
                      {isLive && <Badge>live</Badge>}
                      {isLatest && !isLive && <Badge variant="secondary">latest draft</Badge>}
                      <span className="text-xs text-muted-foreground truncate">
                        {new Date(v.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {isLive ? null : isLatest ? (
                        <Button
                          size="sm"
                          className="gap-1"
                          disabled={publish.isPending}
                          onClick={() => publish.mutate({ guideId: guide.id, version: v.version })}
                        >
                          <Send className="h-3 w-3" /> Publish
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          disabled={rollback.isPending}
                          onClick={() => rollback.mutate({ guideId: guide.id, version: v.version })}
                        >
                          <RotateCcw className="h-3 w-3" /> Roll back
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {isLegacyScript && (
            <p className="text-[11px] text-muted-foreground mt-3">
              This guide is mirrored from a legacy script. Publish/rollback acts on canonical
              guide_versions but legacy authoring continues via ScriptBuilderPage.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Source</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <div>Type: {guide.source_type ?? "canonical (native)"}</div>
          {guide.source_id && <div>Source ID: {guide.source_id}</div>}
          <div>Updated: {new Date(guide.updated_at).toLocaleString()}</div>
        </CardContent>
      </Card>
    </div>
  );
}
