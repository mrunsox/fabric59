import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * Shared dashboard header primitive.
 *
 * Visual unifier for the three scope-distinct dashboards:
 *   - /superadmin            (platform cockpit)
 *   - /admin                 (organization cockpit)
 *   - /admin/workspaces      (workspaces list)
 *
 * Each surface keeps its own route, page component, and query layer.
 * They share this header so titles, subtitles, and the scope chip render
 * identically across cockpits — the only knob is the data each surface
 * passes in.
 */
export type DashboardScope = "platform" | "organization" | "workspace";

const SCOPE_LABEL: Record<DashboardScope, string> = {
  platform: "Platform",
  organization: "Organization",
  workspace: "Workspace",
};

interface DashboardHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  /** Optional scope chip rendered alongside the title. */
  scope?: DashboardScope;
  /** Optional right-aligned actions (buttons, links). */
  actions?: React.ReactNode;
}

export function DashboardHeader({
  icon: Icon,
  title,
  subtitle,
  scope,
  actions,
}: DashboardHeaderProps) {
  return (
    <header className="flex items-start gap-4">
      <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground truncate">
            {title}
          </h1>
          {scope && (
            <Badge
              variant="outline"
              className="text-[10px] uppercase tracking-wider"
            >
              {SCOPE_LABEL[scope]}
            </Badge>
          )}
        </div>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}

export default DashboardHeader;
