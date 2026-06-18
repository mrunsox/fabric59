import { NavLink, Outlet, useParams } from "react-router-dom";
import { Inbox, ListChecks, CheckCircle2, Search, ShieldCheck } from "lucide-react";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import { useBusinessBrainFlag } from "@/lib/business-brain/flagResolver";
import { cn } from "@/lib/utils";

/**
 * Business Brain — Phase 1 / Slice 1 layout shell.
 *
 * Three tabs: Knowledge Bin (sources inbox), Suggested Facts (review queue),
 * Approved Knowledge (governed truth). Hidden when the workspace flag is
 * off; consumers should also avoid linking here when disabled.
 *
 * Architecture: docs/business-brain-architecture.md
 */
export default function BusinessBrainLayoutPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const flag = useBusinessBrainFlag();

  if (!flag.enabled) {
    return (
      <div className="space-y-6">
        <WorkspacePageHeader title="Business Brain" lede="Governed business knowledge for script creation and live assist." />
        <div className="rounded-lg border bg-card p-8 text-sm text-muted-foreground">
          Business Brain is not enabled for this workspace. Ask a workspace
          owner to turn on{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
            features.businessBrain.enabled
          </code>{" "}
          on the organization integration config.
        </div>
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
