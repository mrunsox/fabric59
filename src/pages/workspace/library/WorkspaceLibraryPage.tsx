import { Link, useParams } from "react-router-dom";
import { BookOpen, FileStack, Layers, ExternalLink } from "lucide-react";
import { ConfigPage, type ConfigSection } from "@/components/workspace/page-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";
import WorkspaceGuidesPage from "@/pages/workspace/WorkspaceGuidesPage";
import WorkspaceTemplatesPage from "@/pages/workspace/WorkspaceTemplatesPage";
import { useCampaignBlueprints } from "@/hooks/useCampaignBlueprints";

/**
 * Phase 3 — Library shell.
 *
 * Nav umbrella over the existing Guides, Templates, and Blueprints
 * surfaces. No merged data model: each section embeds the canonical
 * source page (Guides, Templates) or a read-only blueprint listing.
 *
 * Standalone /guides and /templates routes remain mounted for deep
 * links and backwards compatibility — this shell does NOT replace them.
 */
export default function WorkspaceLibraryPage() {
  const sections: ConfigSection[] = [
    {
      key: "guides",
      label: "Guides",
      description: "Agent scripts",
      icon: <BookOpen className="h-3.5 w-3.5" />,
      render: () => <GuidesSection />,
    },
    {
      key: "templates",
      label: "Templates",
      description: "Reusable building blocks",
      icon: <FileStack className="h-3.5 w-3.5" />,
      render: () => <WorkspaceTemplatesPage />,
    },
    {
      key: "blueprints",
      label: "Blueprints",
      description: "Campaign starting points",
      icon: <Layers className="h-3.5 w-3.5" />,
      render: () => <BlueprintsSection />,
    },
  ];

  return (
    <ConfigPage
      eyebrow="Build"
      title="Library"
      lede="Reusable building blocks for this workspace — agent guides, templates, and campaign blueprints."
      sections={sections}
    />
  );
}

function GuidesSection() {
  const { workspaceId } = useParams();
  return (
    <div className="space-y-4">
      <Card className="border-dashed bg-muted/30">
        <CardContent className="pt-4 pb-4 text-xs text-muted-foreground">
          The <Link to={`/w/${workspaceId}/guide`} className="text-primary hover:underline">workspace guide</Link>{" "}
          is the canonical playbook for this workspace. Additional guides
          listed here are supplementary references.
        </CardContent>
      </Card>
      <WorkspaceGuidesPage />
    </div>
  );
}

function BlueprintsSection() {
  const { workspaceId } = useParams();
  const { data: blueprints = [], isLoading } = useCampaignBlueprints();

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading blueprints…</p>;
  }

  if (blueprints.length === 0) {
    return (
      <EmptyState
        icon={Layers}
        title="No blueprints yet"
        description="Campaign blueprints are reusable starting points authored at the organization level. Use them when creating a new campaign to seed scripts, dispositions, and IVR flow."
        action={
          <Button asChild size="sm" variant="outline">
            <Link to={`/w/${workspaceId}/campaigns/new`}>
              Start a campaign <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Read-only view. Blueprints are managed at the organization level and
        applied when creating a new campaign.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {blueprints.map((b) => (
          <Card key={b.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between gap-2">
                <span className="truncate">{b.name}</span>
                {b.tags?.length > 0 && (
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {b.tags.length} tag{b.tags.length === 1 ? "" : "s"}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {b.description || "No description"}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {b.departments?.length > 0 && (
                  <Badge variant="secondary" className="text-[10px]">
                    {b.departments.length} dept{b.departments.length === 1 ? "" : "s"}
                  </Badge>
                )}
                {b.dispositions?.length > 0 && (
                  <Badge variant="secondary" className="text-[10px]">
                    {b.dispositions.length} disposition{b.dispositions.length === 1 ? "" : "s"}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
