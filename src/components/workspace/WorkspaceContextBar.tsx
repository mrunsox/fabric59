import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceCampaigns } from "@/hooks/useWorkspaceCampaigns";
import { useWorkspaceGuides } from "@/hooks/useWorkspaceGuides";
import { useWorkspaceTemplates } from "@/hooks/useWorkspaceTemplates";
import { useWorkspaceForms } from "@/hooks/useWorkspaceForms";
import { useWorkspaceClients } from "@/hooks/useWorkspaceClients";
import { isDemoName } from "@/lib/demoHeuristic";
import { Users, Megaphone, BookOpen, FormInput, FileStack } from "lucide-react";
import { Link } from "react-router-dom";
import { WorkspaceScopeStrip } from "@/components/workspace/WorkspaceScopeStrip";

/**
 * WorkspaceContextBar — slim header strip rendered above every /w/:id/*
 * surface. Replaces the retired standalone Workspace Home dashboard by
 * surfacing the same KPI counters (Clients, Campaigns, Guides, Forms,
 * Templates) inline, so the data is always visible without needing its own
 * route. Demo-named records are filtered out of the counts to match the
 * legacy WorkspaceHomePage behavior.
 */
export function WorkspaceContextBar() {
  const { workspace } = useWorkspace();
  const { data: campaigns = [] } = useWorkspaceCampaigns();
  const { data: guides = [] } = useWorkspaceGuides();
  const { data: templates = [] } = useWorkspaceTemplates({ scope: "workspace" });
  const { data: forms = [] } = useWorkspaceForms();
  const { data: clients = [] } = useWorkspaceClients();

  if (!workspace) return null;
  const base = `/w/${workspace.id}`;

  const counters = [
    { key: "clients", label: "Clients", count: clients.filter((c) => !isDemoName(c.name)).length, href: `${base}/clients`, icon: Users },
    { key: "campaigns", label: "Campaigns", count: campaigns.filter((c) => !isDemoName(c.name)).length, href: `${base}/campaigns`, icon: Megaphone },
    { key: "guides", label: "Guides", count: guides.filter((g) => !isDemoName(g.name)).length, href: `${base}/guides`, icon: BookOpen },
    { key: "forms", label: "Forms", count: forms.filter((f) => !isDemoName(f.name)).length, href: `${base}/forms`, icon: FormInput },
    { key: "templates", label: "Templates", count: templates.filter((t) => !isDemoName(t.name)).length, href: `${base}/templates`, icon: FileStack },
  ];

  return (
    <div
      data-testid="workspace-context-bar"
      className="border-b border-border/40 bg-background/60 backdrop-blur-sm"
    >
      <div className="mx-auto max-w-[1440px] px-6 py-2.5 flex items-center gap-6 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
            Workspace
          </span>
          <span className="text-sm font-semibold text-foreground truncate max-w-[200px]">
            {workspace.name}
          </span>
        </div>
        <div className="h-4 w-px bg-border/60 shrink-0" />
        <WorkspaceScopeStrip />
        <div className="flex items-center gap-1.5">
          {counters.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.key}
                to={c.href}
                className="group inline-flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted/60 transition-colors"
                title={`${c.label}: ${c.count}`}
              >
                <Icon className="h-3.5 w-3.5 text-muted-foreground/70 group-hover:text-primary transition-colors" />
                <span className="text-xs font-medium text-foreground tabular-nums">
                  {c.count}
                </span>
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {c.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default WorkspaceContextBar;
