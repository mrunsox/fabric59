import { Link, NavLink, Outlet, useParams } from "react-router-dom";
import { Inbox, ListChecks, CheckCircle2, Search, ShieldCheck, Activity, Settings as SettingsIcon } from "lucide-react";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import { useBusinessBrainFlag } from "@/lib/business-brain/flagResolver";
import { useAuth } from "@/contexts/AuthContext";
import { BbStateBlock } from "@/components/business-brain/BbStateBlock";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Business Brain — layout shell.
 *
 * Tabs: Knowledge Bin (sources inbox), Suggested Facts (review queue),
 * Approved Knowledge (governed truth), Search, Governance, Health.
 *
 * Phase 1 activation fix: disabled-state shows a role-aware CTA instead of
 * the raw `features.businessBrain.enabled` flag-name snippet. Admins are
 * routed straight into the Settings page; non-admins see a clear ask.
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
        <WorkspacePageHeader title="Business Brain" lede="Governed business knowledge for script creation and live assist." />
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
  const tabs: Array<{ to: string; label: string; icon: typeof Inbox; end?: boolean }> = [
    { to: base, label: "Knowledge Bin", icon: Inbox, end: true },
    { to: `${base}/suggested`, label: "Suggested Facts", icon: ListChecks },
    { to: `${base}/approved`, label: "Approved Knowledge", icon: CheckCircle2 },
    { to: `${base}/search`, label: "Search", icon: Search },
    { to: `${base}/governance`, label: "Governance", icon: ShieldCheck },
    { to: `${base}/health`, label: "Health", icon: Activity },
  ];

  return (
    <div className="space-y-6">
      <WorkspacePageHeader title="Business Brain" lede="Ingest, review, and govern the business knowledge that powers scripts and assist." />
      <nav className="flex items-center gap-1 border-b">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              cn(
                "inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors -mb-px",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )
            }
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
