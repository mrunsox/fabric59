import { Link } from "react-router-dom";
import { Plus, Plug, FlaskConical, BookOpen, LayoutGrid, BarChart3, type LucideIcon } from "lucide-react";
import { useActiveWorkspaceId } from "@/hooks/useActiveWorkspaceId";

export function QuickActionsGrid({ clientId }: { clientId?: string } = {}) {
  // Canonical CTAs only — no compatibility-only or redirect targets.
  // Org-level: View workspaces / Open connectors / View reports / Open docs.
  // Client-scoped variant retains operational setup actions, with the
  // "Create campaign" CTA targeting the canonical workspace-scoped intake
  // (/w/:workspaceId/campaigns/new) so we never link first-class UI at the
  // /admin/campaigns/new redirect-only write surface. If the user has no
  // resolvable workspace yet, we fall back to the workspaces index instead
  // of showing a broken link.
  const { workspaceId } = useActiveWorkspaceId();

  const createCampaignHref = clientId
    ? workspaceId
      ? `/w/${workspaceId}/campaigns/new?client=${clientId}`
      : `/admin/workspaces`
    : "";

  const actions: { title: string; href: string; icon: LucideIcon }[] = clientId
    ? [
        { title: "Create campaign", href: createCampaignHref, icon: Plus },
        { title: "Connect provider", href: `/admin/clients/${clientId}/legal-connect`, icon: Plug },
        { title: "Run readiness test", href: `/admin/test?tenant=${clientId}`, icon: FlaskConical },
        { title: "Open docs", href: "/admin/docs", icon: BookOpen },
      ]
    : [
        { title: "View workspaces", href: "/admin/workspaces", icon: LayoutGrid },
        { title: "Open connectors", href: "/admin/connectors", icon: Plug },
        { title: "View reports", href: "/admin/reports", icon: BarChart3 },
        { title: "Open docs", href: "/admin/docs", icon: BookOpen },
      ];

  return (
    <div className="rounded-2xl border border-border bg-card p-8 space-y-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Quick Actions</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Jump straight into a setup task</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.title}
              to={a.href}
              className="flex flex-col items-start gap-2 p-4 rounded-xl border border-border bg-background hover:border-primary/30 hover:bg-primary/[0.02] transition-all group"
            >
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <span className="text-xs font-medium text-foreground leading-snug">{a.title}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
