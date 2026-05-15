import { Radio } from "lucide-react";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import { EmptyState } from "@/components/common/EmptyState";

/**
 * Agent Cockpit shell — Phase B stub.
 *
 * Mounted at /w/:workspaceId/agent so the canonical route exists and is
 * reachable from the command palette + direct URL. The real cockpit
 * (call controls, live script, worksheet, disposition picker) lands in a
 * later phase. No telephony / WebRTC work in this pass.
 */
export default function WorkspaceAgentCockpitPage() {
  return (
    <div className="space-y-6">
      <WorkspacePageHeader
        eyebrow="Agent"
        title="Agent cockpit"
        lede="The unified agent runtime — script, worksheet, disposition, and call controls in one workspace."
      />
      <EmptyState
        icon={Radio}
        title="Agent cockpit shell"
        description="This is the canonical agent cockpit surface. Live call controls, script playback, and disposition capture will land here in a later phase."
      />
    </div>
  );
}
