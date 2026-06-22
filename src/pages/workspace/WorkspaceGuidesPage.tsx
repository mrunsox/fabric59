import { Link, useParams } from "react-router-dom";
import { useWorkspaceGuides } from "@/hooks/useWorkspaceGuides";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilePlus, FileText } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ActionCard } from "@/components/common/ActionCard";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";

export default function WorkspaceGuidesPage() {
  const { workspaceId } = useParams();
  const { data: guides = [], isLoading } = useWorkspaceGuides();

  return (
    <div className="space-y-6">
      <WorkspacePageHeader
        eyebrow="Guides"
        title="Guides"
        lede="Canonical agent guides scoped to this workspace."
        action={
          <Button asChild size="sm">
            <Link to={`/w/${workspaceId}/guides/new`}>
              <FilePlus className="h-3.5 w-3.5 mr-1.5" /> New guide
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading guides…</p>
      ) : guides.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No guides yet"
          description="Guides give agents a script to follow. Publishing the workspace guide is also one of the workspace setup steps."
          action={
            <Button asChild size="sm">
              <Link to={`/w/${workspaceId}/guides/new`}>
                <FilePlus className="h-3.5 w-3.5 mr-1.5" /> New guide
              </Link>
            </Button>
          }
        />
      ) : (
        <>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ActionCard
            to={`/w/${workspaceId}/guides/new`}
            icon={FilePlus}
            label="New guide"
            hint="Agent script & decision tree"
          />
        </div>
        <div className="grid gap-3">
          {guides.map((g) => (
            <Link key={g.id} to={`/w/${workspaceId}/guides/${g.id}`}>
              <Card className="hover:border-primary/40 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {g.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={g.status} />
                      <Badge variant="outline" className="text-[10px]">v{g.current_version}</Badge>
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
                      <span className="text-muted-foreground/80">mirrored from script</span>
                    </>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        </>
      )}
    </div>
  );
}
