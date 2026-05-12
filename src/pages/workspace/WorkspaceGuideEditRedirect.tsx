import { Navigate, useParams } from "react-router-dom";
import { useWorkspaceGuide } from "@/hooks/useWorkspaceGuides";

/**
 * Phase 4: canonical guide edit route bridges into the canonical builder
 * survivor (ScriptBuilderPage) for guides sourced from legacy scripts.
 * Once a fully canonical builder exists, this can render it directly.
 */
export default function WorkspaceGuideEditRedirect() {
  const { workspaceId, guideId } = useParams();
  const { data: guide, isLoading } = useWorkspaceGuide(guideId);

  if (isLoading) return <p className="text-sm text-muted-foreground">Opening guide builder…</p>;
  if (!guide) return <p className="text-sm text-muted-foreground">Guide not found.</p>;

  if (guide.source_type === "script" && guide.source_id) {
    return <Navigate to={`/admin/scripts/${guide.source_id}/builder`} replace />;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        This guide does not yet have a canonical builder bound. Native canonical authoring lands in a
        later Phase 4 increment.
      </p>
      <Navigate to={`/app/workspaces/${workspaceId}/guides/${guideId}`} replace />
    </div>
  );
}
