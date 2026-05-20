import { Link, useParams } from "react-router-dom";
import { useWorkspaceGuide } from "@/hooks/useWorkspaceGuides";
import { useCurrentGuideVersion } from "@/hooks/useGuideVersions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { GuideContentRenderer } from "@/components/guides/GuideContentRenderer";
import { migrateGuideContentToV1 } from "@/lib/guides/guideContentSchema";

export default function WorkspaceGuidePreviewPage() {
  const { workspaceId, guideId } = useParams();
  const { data: guide, isLoading } = useWorkspaceGuide(guideId);
  const { data: latest } = useCurrentGuideVersion(guideId);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading preview…</p>;
  if (!guide) return <p className="text-sm text-muted-foreground">Guide not found.</p>;

  const isLegacyScript = guide.source_type === "script" && !!guide.source_id;
  const content = migrateGuideContentToV1(latest?.content);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to={`/w/${workspaceId}/guides/${guide.id}`}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to guide
        </Link>
      </Button>
      <div>
        <h1 className="text-2xl font-semibold">{guide.name} · Preview</h1>
        <div className="flex items-center gap-2 mt-2">
          <Badge>{guide.status}</Badge>
          <Badge variant="outline">v{guide.current_version}</Badge>
          {isLegacyScript && <Badge variant="secondary">Legacy script</Badge>}
        </div>
      </div>

      {isLegacyScript ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Legacy script-sourced guide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              This guide is mirrored from a legacy script and uses the visual node editor. The
              canonical block renderer doesn't apply here — open it in the legacy script builder
              to walk through it.
            </p>
            <Button asChild size="sm" variant="outline" className="gap-2">
              <Link to={`/admin/scripts/${guide.source_id}/builder`}>
                <ExternalLink className="h-3.5 w-3.5" /> Open in script builder
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Agent knowledge preview</CardTitle>
          </CardHeader>
          <CardContent>
            <GuideContentRenderer content={content} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
