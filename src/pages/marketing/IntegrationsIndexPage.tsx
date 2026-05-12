import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Phone, Scale, MessageSquare, Webhook, ArrowRight } from "lucide-react";
import { integrationsIndexDescription } from "@/seo/marketingMetadata";

const PROVIDERS = [
  { logo: "/integration-logos/salesforce.svg", name: "Five9", status: "Live", note: "30+ SOAP actions, multi-domain, sync engine.", icon: Phone },
  { logo: "/integration-logos/google.svg", name: "MyCase", status: "Live", note: "Per-client API key intake, contact + matter writeback.", icon: Scale },
  { logo: "/integration-logos/google.svg", name: "Clio Grow", status: "Live", note: "Lead Inbox MVP via clio-grow edge function with idempotent sync jobs.", icon: Scale },
  { logo: "/integration-logos/google.svg", name: "Clio Manage", status: "Coming soon", note: "Adapter shipped; activates on OAuth credential provisioning.", icon: Scale },
  { logo: "/integration-logos/slack.svg", name: "Slack", status: "Live", note: "Real-time agent workspace + post-call notifications.", icon: MessageSquare },
  { logo: "/integration-logos/zapier.svg", name: "Zapier / Make", status: "Live", note: "Outbound webhooks + workflow automations dispatch.", icon: Webhook },
  { logo: "/integration-logos/hubspot.svg", name: "HubSpot, Salesforce, Zendesk, Pipedrive…", status: "Stub", note: "Provider stubs marked for deletion in Phase 7 follow-up. Not exposed in product.", icon: Webhook },
];

export default function IntegrationsIndexPage() {
  return (
    <MarketingLayout
      title="Integrations | Fabric59"
      description={integrationsIndexDescription()}
    >
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto text-center mb-14">
          <Badge variant="outline" className="border-primary/40 text-primary mb-4">
            Integrations
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            One canonical integrations layer
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            Phase 7 collapsed every provider mapping into <code className="text-xs">integration_providers</code>,{" "}
            <code className="text-xs">integration_connections</code>, and{" "}
            <code className="text-xs">integration_mappings</code>. New providers slot in without
            forking the data model.
          </p>
        </div>

        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-4">
          {PROVIDERS.map((p) => (
            <Card key={p.name}>
              <CardContent className="p-5 flex items-start gap-4">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <p.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold truncate">{p.name}</h3>
                    <Badge
                      variant="outline"
                      className={
                        p.status === "Live"
                          ? "border-success/40 text-success"
                          : p.status === "Stub"
                          ? "border-muted-foreground/40 text-muted-foreground"
                          : "border-primary/40 text-primary"
                      }
                    >
                      {p.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{p.note}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button asChild className="gap-1.5">
            <Link to="/contact">
              Ask about a provider <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </section>
    </MarketingLayout>
  );
}
