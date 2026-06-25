import { Link, Outlet, useParams } from "react-router-dom";
import { Settings as SettingsIcon } from "lucide-react";
import { useBusinessBrainFlag } from "@/lib/business-brain/flagResolver";
import { useAuth } from "@/contexts/AuthContext";
import { BbStateBlock } from "@/components/business-brain/BbStateBlock";
import { BrainPageHeader, BrainTabsBar, type BrainTab } from "@/components/business-brain/ui";
import { Button } from "@/components/ui/button";

/**
 * Business Brain — layout shell.
 *
 * Tabs: Knowledge Bin (sources inbox), Suggested Facts (review queue),
 * Approved Knowledge (governed truth), Search, Governance, Health.
 *
 * Phase 1 activation fix (preserved): disabled-state shows a role-aware
 * CTA instead of the raw `features.businessBrain.enabled` flag-name snippet.
 * Phase 2 Slice B: shell adopts BrainPageHeader + BrainTabsBar; raw nav
 * markup removed in favor of the shared primitives.
 *
 * Architecture: docs/business-brain-architecture.md
 */
export default function BusinessBrainLayoutPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const flag = useBusinessBrainFlag();
  const { isWorkspaceAdmin, isMasterAdmin } = useAuth();
  const adminLike = isWorkspaceAdmin || isMasterAdmin;

  if (!flag.enabled) {
    return (
      <div className="space-y-6">
        <BrainPageHeader
          eyebrow="Workspace"
          title="Business Brain"
          subtitle="Governed business knowledge for script creation and live assist."
        />
        <BbStateBlock
          kind="empty"
          data-testid="bb-layout-disabled"
          title="Business Brain isn't turned on for this workspace yet."
          description={
            adminLike
              ? "Enable it from Brain Settings to start ingesting sources and reviewing facts."
              : "Ask a workspace admin or owner to enable it from Brain Settings."
          }
          action={
            adminLike ? (
              <Button asChild size="sm">
                <Link to={`/w/${workspaceId}/settings/brain`}>
                  <SettingsIcon className="mr-1.5 h-3.5 w-3.5" />
                  Open Brain Settings
                </Link>
              </Button>
            ) : null
          }
        />
      </div>
    );
  }

  const base = `/w/${workspaceId}/brain`;
  const tabs: BrainTab[] = [
    { to: base, label: "Knowledge Base", end: true },
    { to: `${base}/suggested`, label: "Suggested Facts" },
    { to: `${base}/approved`, label: "Approved Knowledge" },
    { to: `${base}/search`, label: "Search" },
    { to: `${base}/governance`, label: "Governance" },
    { to: `${base}/health`, label: "Health" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <BrainPageHeader
        eyebrow="Workspace"
        title="Business Brain"
        subtitle="Ingest, review, and govern the business knowledge that powers scripts and assist."
        actions={
          adminLike ? (
            <Button asChild variant="outline" size="sm">
              <Link to={`/w/${workspaceId}/settings/brain`}>
                <SettingsIcon className="mr-1.5 h-3.5 w-3.5" />
                Settings
              </Link>
            </Button>
          ) : null
        }
      />
      <BrainTabsBar tabs={tabs} />
      <Outlet />
    </div>
  );
}
