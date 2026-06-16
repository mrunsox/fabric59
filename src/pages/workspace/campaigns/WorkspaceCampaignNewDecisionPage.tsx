/**
 * Decision shim for /w/:workspaceId/campaigns/new.
 *
 * Route-behavior choice (locked):
 *   When the AI-assisted flag is OFF, render WorkspaceCampaignNewPage
 *   IN PLACE rather than redirecting. Two reasons:
 *     1. Several regression tests (aiBlueprintHandoff) mount this page at
 *        /w/:workspaceId/campaigns/new with router state. A redirect would
 *        drop that state and break the AI-blueprint handoff.
 *     2. The audited surface map (data/surfaceAudit.ts) treats
 *        /w/:workspaceId/campaigns/new as the canonical workspace intake
 *        route identity; preserving that identity keeps breadcrumbs,
 *        analytics, and existing tests stable.
 *
 *   When the flag is ON, this shim renders the wizard host directly (also
 *   in place, no redirect), so the canonical route remains the single
 *   entry point. The wizard URL `/assisted` is still independently
 *   addressable for deep links and shares.
 */
import { useParams } from "react-router-dom";
import WorkspaceCampaignNewPage from "@/pages/workspace/WorkspaceCampaignNewPage";
import AscWizardPage from "./asc/AscWizardPage";
import { useAscWizardFlag } from "@/lib/asc/flagResolver";

export default function WorkspaceCampaignNewDecisionPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const flag = useAscWizardFlag(workspaceId);
  if (flag.enabled) {
    return <AscWizardPage />;
  }
  return <WorkspaceCampaignNewPage />;
}
