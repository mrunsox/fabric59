import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plug, Scale, Briefcase, Flame, Webhook, Code2, ArrowRight } from "lucide-react";

const CONNECTORS = [
  { slug: "clio", name: "Clio", icon: Scale, status: "available", description: "Sync matters and contacts to Clio Manage." },
  { slug: "mycase", name: "MyCase", icon: Briefcase, status: "available", description: "Create cases and tasks in MyCase." },
  { slug: "smokeball", name: "Smokeball", icon: Flame, status: "available", description: "Log activities and create matters in Smokeball." },
  { slug: "webhook", name: "Webhook", icon: Webhook, status: "available", description: "POST events to any HTTPS endpoint." },
  { slug: "custom-http", name: "Custom HTTP", icon: Code2, status: "beta", description: "Configure arbitrary REST calls with templated payloads." },
];

export default function ConnectorsCatalogPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Plug className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Connectors</h1>
          <p className="text-sm text-muted-foreground mt-1">External systems your Five9 events can drive</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {CONNECTORS.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.slug} to={`/admin/connectors/${c.slug}`}>
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
        })}
      </div>
    </div>
  );
}
