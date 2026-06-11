import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plug, Scale, Briefcase, Flame, Webhook, Code2, ArrowRight, Sparkles } from "lucide-react";

type Connector = {
  slug: string;
  name: string;
  icon: typeof Scale;
  status: "available" | "beta";
  description: string;
};

const CONNECTOR_GROUPS: { key: string; label: string; description: string; connectors: Connector[] }[] = [
  {
    key: "legal-pm",
    label: "Legal practice management",
    description: "Vertical pack for law firms — Clio, MyCase, and Smokeball.",
    connectors: [
      { slug: "clio", name: "Clio", icon: Scale, status: "available", description: "Sync matters and contacts to Clio Manage." },
      { slug: "mycase", name: "MyCase", icon: Briefcase, status: "available", description: "Create cases and tasks in MyCase." },
      { slug: "smokeball", name: "Smokeball", icon: Flame, status: "available", description: "Log activities and create matters in Smokeball." },
    ],
  },
  {
    key: "webhooks",
    label: "Webhooks & custom",
    description: "Provider-agnostic HTTP dispatch for any downstream system.",
    connectors: [
      { slug: "webhook", name: "Webhook", icon: Webhook, status: "available", description: "POST events to any HTTPS endpoint." },
      { slug: "custom-http", name: "Custom HTTP", icon: Code2, status: "beta", description: "Configure arbitrary REST calls with templated payloads." },
    ],
  },
];

function ConnectorCard({ c }: { c: Connector }) {
  const Icon = c.icon;
  return (
    <Link to={`/admin/connectors/${c.slug}`}>
      <Card className="hover:border-primary/40 transition-colors cursor-pointer h-full">
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <div className="h-10 w-10 rounded-xl bg-secondary/40 flex items-center justify-center">
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">{c.name}</CardTitle>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">{c.description}</p>
          <Badge variant={c.status === "available" ? "default" : "secondary"}>{c.status}</Badge>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function ConnectorsCatalogPage() {
  return (
    <div className="space-y-10 animate-fade-in">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Plug className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Connectors</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Vertical packs and provider-agnostic dispatch. Each pack groups the downstream systems for one industry.
          </p>
        </div>
      </div>

      {CONNECTOR_GROUPS.map((group) => (
        <section key={group.key} className="space-y-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">{group.label}</h2>
            <p className="text-xs text-muted-foreground mt-1">{group.description}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {group.connectors.map((c) => (
              <ConnectorCard key={c.slug} c={c} />
            ))}
            {group.key === "legal-pm" && (
              <Card className="border-dashed bg-muted/20">
                <CardContent className="py-8 text-center space-y-2">
                  <Sparkles className="h-5 w-5 mx-auto text-muted-foreground/60" />
                  <p className="text-sm font-medium">More integration packs coming</p>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    Medical, financial, property management, and more verticals on the roadmap.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
