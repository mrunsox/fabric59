import { Link, useParams } from "react-router-dom";
import { useWorkspaceGuide } from "@/hooks/useWorkspaceGuides";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function WorkspaceGuidePreviewPage() {
  const { workspaceId, guideId } = useParams();
  const { data: guide, isLoading } = useWorkspaceGuide(guideId);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading preview…</p>;
  if (!guide) return <p className="text-sm text-muted-foreground">Guide not found.</p>;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to={`/app/workspaces/${workspaceId}/guides/${guide.id}`}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to guide
        </Link>
      </Button>
      <div>
        <h1 className="text-2xl font-semibold">{guide.name} · Preview</h1>
        <div className="flex items-center gap-2 mt-2">
          <Badge>{guide.status}</Badge>
          <Badge variant="outline">v{guide.current_version}</Badge>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Read-only preview shell</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          The canonical preview renderer for guides will land in a follow-up Phase 4 increment. For
          now, use the legacy script builder's test mode to walk through this guide.
        </CardContent>
      </Card>
    </div>
  );
}
