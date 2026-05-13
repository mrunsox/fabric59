import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import RunsPage from "@/pages/admin/RunsPage";
import { Badge } from "@/components/ui/badge";

/**
 * Canonical workspace Runs surface.
 *
 * Thin wrapper that mounts the existing org-level RunsPage inside the
 * /w/:workspaceId/* shell so the canonical workspace nav has a real
 * destination. Underlying data remains org-scoped — strict workspace_id
 * filtering on flow_runs is a tracked follow-up slice.
 */
export default function WorkspaceRunsPage() {
  return (
    <div className="space-y-6">
      <WorkspacePageHeader
        eyebrow="Runs"
        title="Runs"
        lede="Recent flow executions for this workspace."
      />
      <p className="text-[11px] text-muted-foreground">
        <Badge variant="outline" className="mr-1.5 text-[10px]">Phase 8 follow-up</Badge>
        Run data is currently org-scoped. Strict workspace_id filtering is tracked as a follow-up.
      </p>
      <RunsPage />
    </div>
  );
}
