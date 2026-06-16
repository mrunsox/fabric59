/**
 * Decision shim for /w/:workspaceId/campaigns/new.
 *
 * Precedence (Slice 2):
 *   1. Router state contains { source: "ai-blueprint", prefill } → always
 *      render the manual intake with the prefill, regardless of the ASC flag.
 *      The AI blueprint flow is a one-shot prefill that must not be diverted
 *      into the assisted wizard mid-handoff.
 *   2. URL query `?aiBlueprint=<marker>` → same as above (covers deep links
 *      from sources that cannot carry router state).
 *   3. URL query `?setupId=<uuid>` AND ASC flag on → resume the wizard.
 *   4. ASC flag on → mount a fresh wizard.
 *   5. Otherwise → render the canonical manual intake.
 *
 * All branches render in place (no redirects) so route identity, breadcrumbs,
 * and analytics stay stable.
 */
import { useLocation, useParams } from "react-router-dom";
import WorkspaceCampaignNewPage from "@/pages/workspace/WorkspaceCampaignNewPage";
import AscWizardPage from "./asc/AscWizardPage";
import { useAscWizardFlag } from "@/lib/asc/flagResolver";

export default function WorkspaceCampaignNewDecisionPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const location = useLocation();
  const flag = useAscWizardFlag(workspaceId);

  const state = (location.state ?? {}) as {
    prefill?: unknown;
    source?: string;
  };
  const hasBlueprintState =
    state.source === "ai-blueprint" && !!state.prefill;
  const hasBlueprintQuery = new URLSearchParams(location.search).has(
    "aiBlueprint",
  );

  if (hasBlueprintState || hasBlueprintQuery) {
    return <WorkspaceCampaignNewPage />;
  }

  if (flag.enabled) {
    return <AscWizardPage />;
  }
  return <WorkspaceCampaignNewPage />;
}
