import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Check, ArrowRight } from "lucide-react";

const TIERS = [
  {
    name: "Pilot",
    blurb: "For design partners and first-engagement firms.",
    price: "Custom",
    cadence: "Concierge onboarding",
    features: [
      "1 workspace",
      "1 Five9 domain",
      "MyCase or Clio adapter",
      "Workspace analytics + QA",
      "Direct Slack channel with the team",
    ],
    cta: { label: "Start a pilot", to: "/contact" },
    highlight: false,
  },
  {
    name: "Operator",
    blurb: "For BPOs and law firms running real intake volume.",
    price: "Usage-based",
    cadence: "Per call session + per workspace",
    features: [
      "Unlimited workspaces inside one organization",
      "All canonical workspace surfaces (campaigns, guides, templates, integrations)",
      "Honest billing shell with real invoices + usage",
      "Workspace-scoped RBAC",
      "Per-tenant rate limits and tenant health",
    ],
    cta: { label: "Talk to sales", to: "/contact" },
    highlight: true,
  },
  {
    name: "Platform",
    blurb: "For partners running their own clients on Fabric59.",
    price: "Contact us",
    cadence: "Annual + revenue share",
    features: [
      "Multi-org governance",
      "White-label branding overrides",
      "Superadmin / vault / source exports",
      "Design-partner ops view",
      "Custom integration provider work",
    ],
    cta: { label: "Become a partner", to: "/contact" },
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <MarketingLayout
      title="Pricing | Fabric59"
      description="Honest, usage-based pricing. Pilot, Operator, and Platform tiers built around the canonical workspace model."
    >
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto text-center mb-14">
          <Badge variant="outline" className="border-primary/40 text-primary mb-4">
            Pricing
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Priced for real operations, not seat-padding
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            Fabric59 is sold as a working operations layer, not a per-seat dashboard. Pricing is
            anchored to the canonical workspace and call session signals already in product.
          </p>
        </div>

        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-5">
          {TIERS.map((t) => (
            <Card
              key={t.name}
              className={t.highlight ? "border-primary/60 shadow-lg" : ""}
            >
              <CardContent className="p-6 space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">{t.name}</h2>
                    {t.highlight && <Badge>Most teams</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{t.blurb}</p>
                </div>
                <div>
                  <div className="text-3xl font-bold tracking-tight">{t.price}</div>
                  <div className="text-xs text-muted-foreground">{t.cadence}</div>
                </div>
                <ul className="text-sm text-muted-foreground space-y-2">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild className="w-full gap-1.5" variant={t.highlight ? "default" : "outline"}>
                  <Link to={t.cta.to}>
                    {t.cta.label} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-10 max-w-xl mx-auto">
          Self-serve checkout, plan management, and payment methods are deferred until the billing
          backend lands. We will quote and invoice directly in the meantime.
        </p>
      </section>
    </MarketingLayout>
  );
}
