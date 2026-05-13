import { Link } from "react-router-dom";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { SectionIntro } from "@/components/marketing/SectionIntro";
import { CtaRow } from "@/components/marketing/CtaRow";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight } from "lucide-react";

/**
 * Phase G — Pricing page.
 * Honest packaging. No self-serve checkout language.
 */
const TIERS = [
  {
    name: "Pilot",
    blurb: "For design partners and first-engagement firms.",
    price: "Custom",
    cadence: "Concierge onboarding",
    features: [
      "1 workspace",
      "1 Five9 domain",
      "MyCase or Clio Grow adapter",
      "Workspace analytics + QA queue",
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
      "Full canonical workspace surfaces",
      "Workspace-scoped RBAC",
      "Per-tenant rate limits and tenant health",
      "Implementation-led rollout with a Fabric59 lead",
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
      description="Honest, usage-based pricing. Pilot, Operator, and Platform tiers built around the canonical workspace model. No self-serve checkout — every engagement is scoped."
      ctaBanner={
        <section className="py-16 px-6 bg-muted/20">
          <SectionIntro
            title="Every engagement is scoped"
            lede="Self-serve checkout, plan management, and payment methods are deferred until the billing backend lands. We quote and invoice directly in the meantime."
            cta={
              <CtaRow
                primary={{ label: "Scope your program", to: "/contact" }}
                secondary={{ label: "See solutions", to: "/solutions" }}
              />
            }
          />
        </section>
      }
    >
      <section className="pt-20 pb-4 px-6">
        <SectionIntro
          eyebrow="Pricing"
          title="Priced for real operations, not seat-padding"
          lede="Fabric59 is sold as a working operations layer, not a per-seat dashboard. Pricing is anchored to the canonical workspace and call-session signals already in product."
        />
      </section>

      <section className="py-12 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-5">
          {TIERS.map((t) => (
            <Card
              key={t.name}
              className={
                t.highlight
                  ? "border-primary/60 shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.25)]"
                  : "border-border/60"
              }
            >
              <CardContent className="p-6 space-y-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold tracking-tight">{t.name}</h2>
                    {t.highlight && (
                      <Badge className="bg-primary/10 text-primary border-primary/30">
                        Most teams
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{t.blurb}</p>
                </div>
                <div>
                  <div className="text-3xl font-semibold tracking-tight text-foreground">
                    {t.price}
                  </div>
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
                <Link
                  to={t.cta.to}
                  className={
                    t.highlight
                      ? "inline-flex w-full items-center justify-center gap-1.5 h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                      : "inline-flex w-full items-center justify-center gap-1.5 h-10 rounded-md border border-border bg-background text-sm font-medium hover:bg-muted transition-colors"
                  }
                >
                  {t.cta.label} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </MarketingLayout>
  );
}
