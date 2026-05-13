import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import AgentsPage from "@/pages/admin/AgentsPage";
import { Badge } from "@/components/ui/badge";

/**
 * Canonical workspace Agents surface.
 *
 * Thin wrapper that mounts the existing org-level AgentsPage inside the
 * /w/:workspaceId/* shell. Underlying agent roster is currently org-scoped;
 * strict workspace_id filtering is a tracked follow-up slice.
 */
export default function WorkspaceAgentsPage() {
  return (
    <div className="space-y-6">
      <WorkspacePageHeader
        eyebrow="Agents"
        title="Agents"
        lede="Agent roster and presence for this workspace."
      />
      <p className="text-[11px] text-muted-foreground">
        <Badge variant="outline" className="mr-1.5 text-[10px]">Phase 8 follow-up</Badge>
        Agent data is currently org-scoped. Workspace-strict filtering is a tracked follow-up.
      </p>
      <AgentsPage />
    </div>
  );
}
