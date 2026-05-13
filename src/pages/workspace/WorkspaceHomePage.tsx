import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Megaphone, BookOpen, FormInput, FileStack, Plus, ArrowRight,
  BarChart3, ClipboardCheck, Plug, Settings, Sparkles, ShieldAlert,
} from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceCampaigns } from "@/hooks/useWorkspaceCampaigns";
import { useWorkspaceGuides } from "@/hooks/useWorkspaceGuides";
import { useWorkspaceTemplates } from "@/hooks/useWorkspaceTemplates";
import { useWorkspaceForms } from "@/hooks/useWorkspaceForms";
import { useWorkspaceClients } from "@/hooks/useWorkspaceClients";
import { isDemoName } from "@/lib/demoHeuristic";

type RecentItem = {
  key: string;
  kind: "Campaign" | "Guide" | "Form" | "Template";
  name: string;
  href: string;
  updated_at: string;
};

const SECONDARY_LINKS = [
  { label: "Analytics", icon: BarChart3, href: "analytics" },
  { label: "QA", icon: ClipboardCheck, href: "qa" },
  { label: "Integrations", icon: Plug, href: "integrations" },
  { label: "Assistant", icon: Sparkles, href: "assistant" },
  { label: "Settings", icon: Settings, href: "settings" },
];

export default function WorkspaceHomePage() {
  const { workspace } = useWorkspace();
  const { data: campaigns = [] } = useWorkspaceCampaigns();
  const { data: guides = [] } = useWorkspaceGuides();
  const { data: templates = [] } = useWorkspaceTemplates();
  const { data: forms = [] } = useWorkspaceForms();
  const { data: clients = [] } = useWorkspaceClients();
  if (!workspace) return null;
  const base = `/w/${workspace.id}`;

  // Conservative demo exclusion for fresh-start counts.
  const realCampaigns = campaigns.filter((c) => !isDemoName(c.name));
  const realGuides = guides.filter((g) => !isDemoName(g.name));
  const realTemplates = templates.filter((t) => !isDemoName(t.name));
  const realForms = forms.filter((f) => !isDemoName(f.name));
  const realClients = clients.filter((c) => !isDemoName(c.name));
  const demoClientCount = clients.length - realClients.length;

  const allReal: RecentItem[] = [
    ...realCampaigns.map((c) => ({ key: `c-${c.id}`, kind: "Campaign" as const, name: c.name, href: `${base}/campaigns/${c.id}`, updated_at: c.updated_at })),
    ...realGuides.map((g) => ({ key: `g-${g.id}`, kind: "Guide" as const, name: g.name, href: `${base}/guides/${g.id}`, updated_at: g.updated_at })),
    ...realForms.map((f) => ({ key: `f-${f.id}`, kind: "Form" as const, name: f.name, href: `${base}/forms/${f.id}`, updated_at: f.updated_at })),
    ...realTemplates.map((t) => ({ key: `t-${t.id}`, kind: "Template" as const, name: t.name, href: `${base}/templates/${t.id}`, updated_at: t.updated_at })),
  ].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 5);

  const totalReal = realCampaigns.length + realGuides.length + realForms.length + realTemplates.length;

  const createActions = [
    { label: "New campaign", icon: Megaphone, href: `${base}/campaigns/new`, hint: "Outbound or inbound program" },
    { label: "New guide", icon: BookOpen, href: `${base}/guides/new`, hint: "Agent script & decision tree" },
    { label: "New form", icon: FormInput, href: `${base}/forms/new`, hint: "Capture inbound leads" },
    { label: "New template", icon: FileStack, href: `${base}/templates`, hint: "Reusable content (fork in library)" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Badge variant="outline" className="border-accent/40 text-accent mb-2">Workspace home</Badge>
        <h1 className="text-2xl font-semibold tracking-tight">{workspace.name}</h1>
        {totalReal === 0 ? (
          <p className="text-sm text-muted-foreground mt-1">
            Fresh workspace. Start by creating something below.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground mt-1">
            {realCampaigns.length} campaign{realCampaigns.length === 1 ? "" : "s"} ·{" "}
            {realGuides.length} guide{realGuides.length === 1 ? "" : "s"} ·{" "}
            {realForms.length} form{realForms.length === 1 ? "" : "s"} ·{" "}
            {realTemplates.length} template{realTemplates.length === 1 ? "" : "s"} ·{" "}
            {realClients.length} client{realClients.length === 1 ? "" : "s"}
          </p>
        )}
      </div>

      {/* Primary create actions */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Create</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {createActions.map((a) => {
            const Icon = a.icon;
            return (
              <Link key={a.label} to={a.href}>
                <Card className="h-full hover:border-primary/60 transition-colors group">
                  <CardContent className="pt-5 pb-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{a.label}</div>
                      <div className="text-xs text-muted-foreground">{a.hint}</div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Recent canonical items */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent</h2>
        {allReal.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Nothing here yet. Recent campaigns, guides, forms, and templates will appear here as you create them.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0 divide-y">
              {allReal.map((r) => (
                <Link key={r.key} to={r.href} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-accent/5">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{r.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.kind} · updated {new Date(r.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </CardContent>
          </Card>
        )}
      </section>

      {/* Demo data notice */}
      {demoClientCount > 0 && (
        <Card className="border-dashed">
          <CardHeader className="pb-2 flex-row items-center gap-2 space-y-0">
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">{demoClientCount} demo / test rows excluded</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground flex items-center justify-between gap-3">
            <span>
              {demoClientCount} client row{demoClientCount === 1 ? "" : "s"} matching the conservative demo heuristic
              are hidden from these counts. Review the candidates before any cleanup.
            </span>
            <Button asChild variant="outline" size="sm">
              <Link to={`${base}/reset`}>Review</Link>
            </Button>
          </CardContent>
        </Card>
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
