import { Eye } from "lucide-react";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import { EmptyState } from "@/components/common/EmptyState";

/**
 * Canonical workspace Supervisor placeholder.
 *
 * Supervisor is a canonical workspace module per the May 13 Canonical Build
 * Doc §4 but its implementation is deferred to a later phase. This is a
 * first-party workspace-shell placeholder — NOT a redirect to /admin and
 * NOT a soft cross-link inviting users to substitute admin tooling.
 */
export default function WorkspaceSupervisorPage() {
  return (
    <div className="space-y-6">
      <WorkspacePageHeader
        eyebrow="Supervisor"
        title="Supervisor"
        lede="Live monitoring and intervention for in-flight calls."
      />
      <EmptyState
        icon={Eye}
        title="Supervisor is a deferred canonical module"
        description="Real-time agent monitoring, listen / whisper / barge, and live queue health will land in this workspace surface in a later phase."
      />
    </div>
  );
}
