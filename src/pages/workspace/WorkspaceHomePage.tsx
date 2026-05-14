import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Megaphone, BookOpen, FormInput, FileStack,
  BarChart3, ClipboardCheck, Plug, Settings, Sparkles, ShieldAlert,
  Users,
} from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceCampaigns } from "@/hooks/useWorkspaceCampaigns";
import { useWorkspaceGuides } from "@/hooks/useWorkspaceGuides";
import { useWorkspaceTemplates } from "@/hooks/useWorkspaceTemplates";
import { useWorkspaceForms } from "@/hooks/useWorkspaceForms";
import { useWorkspaceClients } from "@/hooks/useWorkspaceClients";
import { isDemoName } from "@/lib/demoHeuristic";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import { KpiCard } from "@/components/common/KpiCard";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ActionCard } from "@/components/common/ActionCard";
import { RecentList, type RecentListItem } from "@/components/common/RecentList";

const SECONDARY_LINKS = [
  { label: "Analytics", icon: BarChart3, href: "analytics" },
  { label: "QA", icon: ClipboardCheck, href: "qa" },
  { label: "Integrations", icon: Plug, href: "integrations" },
  { label: "Assistant", icon: Sparkles, href: "assistant" },
  { label: "Settings", icon: Settings, href: "settings" },
];

export default function WorkspaceHomePage() {
  const { workspace } = useWorkspace();
  const { data: campaigns = [], isLoading: campaignsLoading } = useWorkspaceCampaigns();
  const { data: guides = [], isLoading: guidesLoading } = useWorkspaceGuides();
  // Workspace home is strictly workspace-scoped — platform/org-inherited
  // templates do NOT count toward the Templates KPI or Recent. They remain
  // visible inside the Templates library page (which uses the default
  // "inherited" scope).
  const { data: templates = [], isLoading: templatesLoading } = useWorkspaceTemplates({
    scope: "workspace",
  });
  const { data: forms = [], isLoading: formsLoading } = useWorkspaceForms();
  const { data: clients = [], isLoading: clientsLoading } = useWorkspaceClients();
  if (!workspace) return null;
  const base = `/w/${workspace.id}`;

  // Conservative demo exclusion for fresh-start counts.
  const realCampaigns = campaigns.filter((c) => !isDemoName(c.name));
  const realGuides = guides.filter((g) => !isDemoName(g.name));
  const realTemplates = templates.filter((t) => !isDemoName(t.name));
  const realForms = forms.filter((f) => !isDemoName(f.name));
  const realClients = clients.filter((c) => !isDemoName(c.name));
  const demoClientCount = clients.length - realClients.length;

  const recent: RecentListItem[] = [
    ...realCampaigns.map((c) => ({ key: `c-${c.id}`, title: c.name, href: `${base}/campaigns/${c.id}`, meta: `Campaign · updated ${new Date(c.updated_at).toLocaleDateString()}`, _u: c.updated_at })),
    ...realGuides.map((g) => ({ key: `g-${g.id}`, title: g.name, href: `${base}/guides/${g.id}`, meta: `Guide · updated ${new Date(g.updated_at).toLocaleDateString()}`, _u: g.updated_at })),
    ...realForms.map((f) => ({ key: `f-${f.id}`, title: f.name, href: `${base}/forms/${f.id}`, meta: `Form · updated ${new Date(f.updated_at).toLocaleDateString()}`, _u: f.updated_at })),
    ...realTemplates.map((t) => ({ key: `t-${t.id}`, title: t.name, href: `${base}/templates/${t.id}`, meta: `Template · updated ${new Date(t.updated_at).toLocaleDateString()}`, _u: t.updated_at })),
  ]
    .sort((a, b) => b._u.localeCompare(a._u))
    .slice(0, 5)
    .map(({ _u, ...rest }) => rest);

  const totalReal = realCampaigns.length + realGuides.length + realForms.length + realTemplates.length;

  const createActions = [
    { label: "New campaign", icon: Megaphone, href: `${base}/campaigns/new`, hint: "Outbound or inbound program" },
    { label: "New guide", icon: BookOpen, href: `${base}/guides/new`, hint: "Agent script & decision tree" },
    { label: "New form", icon: FormInput, href: `${base}/forms/new`, hint: "Capture inbound leads" },
    { label: "New template", icon: FileStack, href: `${base}/templates?new=1`, hint: "Reusable content (fork in library)" },
  ];

  return (
    <div className="space-y-6">
      <WorkspacePageHeader
        title={workspace.name}
        lede={
          totalReal === 0
            ? "Fresh workspace. Start by creating something below."
            : "Workspace cockpit. Live counts and recent activity for this workspace."
        }
      />

      {/* Canonical KPI row — 5 items, outline order. */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard label="Clients" value={realClients.length} icon={Users} loading={clientsLoading}
          hint={demoClientCount > 0 ? `${demoClientCount} demo hidden` : undefined} />
        <KpiCard label="Campaigns" value={realCampaigns.length} icon={Megaphone} loading={campaignsLoading} />
        <KpiCard label="Guides" value={realGuides.length} icon={BookOpen} loading={guidesLoading} />
        <KpiCard label="Forms" value={realForms.length} icon={FormInput} loading={formsLoading} />
        <KpiCard label="Templates" value={realTemplates.length} icon={FileStack} loading={templatesLoading} />
      </div>

      {/* Primary create actions — uses canonical ActionCard primitive */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Create</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {createActions.map((a) => (
            <ActionCard key={a.label} to={a.href} icon={a.icon} label={a.label} hint={a.hint} />
          ))}
        </div>
      </section>

      {/* Recent canonical items — uses canonical RecentList primitive */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent</h2>
        <RecentList
          items={recent}
          emptyTitle="Nothing here yet"
          emptyDescription="Recent campaigns, guides, forms, and templates will appear here as you create them."
        />
      </section>

      {/* Demo data notice — uses canonical EmptyState primitive */}
      {demoClientCount > 0 && (
        <EmptyState
          icon={ShieldAlert}
          title={`${demoClientCount} demo / test client row${demoClientCount === 1 ? "" : "s"} excluded`}
          description="These match the conservative demo heuristic and are hidden from workspace counts. Review the candidates before any cleanup."
          action={
            <Button asChild variant="outline" size="sm">
              <Link to={`${base}/reset`}>Review</Link>
            </Button>
          }
        />
      )}

      {/* Explore */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Explore</h2>
        <div className="flex flex-wrap gap-2">
          {SECONDARY_LINKS.map((l) => {
            const Icon = l.icon;
            return (
              <Button key={l.href} asChild variant="outline" size="sm">
                <Link to={`${base}/${l.href}`}>
                  <Icon className="h-3.5 w-3.5 mr-1.5" /> {l.label}
                </Link>
              </Button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
