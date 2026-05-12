import { Link, useParams } from "react-router-dom";
import { useWorkspaceGuides } from "@/hooks/useWorkspaceGuides";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, FilePlus, FileText } from "lucide-react";

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  published: "default",
  draft: "secondary",
  archived: "outline",
};

export default function WorkspaceGuidesPage() {
  const { workspaceId } = useParams();
  const { data: guides = [], isLoading } = useWorkspaceGuides();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Guides</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Canonical agent guides scoped to this workspace. Mirrored from legacy scripts during Phase 4.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link to={`/app/workspaces/${workspaceId}/guides/new`}>
              <FilePlus className="h-4 w-4 mr-2" />
              New guide
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/admin/scripts">
              <ExternalLink className="h-4 w-4 mr-2" />
              Legacy scripts
            </Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading guides…</p>
      ) : guides.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No guides yet. Create one in the legacy script builder; it will mirror here automatically.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {guides.map((g) => (
            <Link key={g.id} to={`/app/workspaces/${workspaceId}/guides/${g.id}`}>
              <Card className="hover:border-primary/40 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {g.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusVariant[g.status] ?? "secondary"}>{g.status}</Badge>
                      <Badge variant="outline">v{g.current_version}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  {g.description || "No description"}
                  <span className="mx-2">·</span>
                  Updated {new Date(g.updated_at).toLocaleDateString()}
                  {g.source_type === "script" && (
                    <>
                      <span className="mx-2">·</span>
                      <span className="text-muted-foreground/80">mirrored from legacy script</span>
                    </>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
