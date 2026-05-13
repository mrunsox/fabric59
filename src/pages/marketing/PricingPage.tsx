import { Link } from "react-router-dom";
import { Check, ArrowRight } from "lucide-react";
import { MarketingShell as MarketingLayout } from "@/shells/MarketingShell";
import { MarketingHero } from "@/components/marketing/MarketingHero";
import { SectionShell } from "@/components/marketing/SectionShell";
import { SectionIntro } from "@/components/marketing/SectionIntro";
import { CtaRow } from "@/components/marketing/CtaRow";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Phase H — Pricing page.
 *
 * Concierge-led only. Every CTA routes to /contact?topic=pricing or pilot.
 * No "buy now", no "subscribe", no "checkout" surface.
 */
const TIERS = [
  {
    name: "Pilot",
    blurb: "For design partners and first-engagement teams.",
    price: "Custom",
    cadence: "Concierge onboarding",
    features: [
      "1 workspace, 1 Five9 domain",
      "MyCase or Clio Grow adapter",
      "Workspace analytics + QA queue",
      "Direct channel with the build team",
    ],
    cta: { label: "Start a pilot", to: "/contact?topic=pricing" },
    highlight: false,
  },
  {
    name: "Operator",
    blurb: "For BPOs and law firms running real intake volume.",
    price: "Usage-based",
    cadence: "Per call session + per workspace",
    features: [
      "Unlimited workspaces in one organization",
      "Full canonical workspace surfaces",
      "Workspace-scoped RBAC",
      "Per-tenant rate limits and tenant health",
      "Implementation-led rollout",
    ],
    cta: { label: "Talk to us", to: "/contact?topic=pricing" },
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
      "Design-partner ops view",
      "Custom integration scoping",
    ],
    cta: { label: "Become a partner", to: "/contact?topic=pricing" },
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <MarketingLayout
      title="Pricing | Fabric59"
      description="Concierge-led pricing. Every Fabric59 engagement is scoped together — no self-serve checkout."
      ctaBanner={
        <SectionShell>
          <SectionIntro
            title="Every engagement is scoped"
            lede="Self-serve checkout, plan management, and payment methods are deferred. Until then we quote and invoice directly so the rollout matches your actual operation."
            cta={
              <CtaRow
                primary={{ label: "Scope your program", to: "/contact?topic=pricing" }}
                secondary={{ label: "See solutions", to: "/solutions" }}
              />
            }
          />
        </SectionShell>
      }
    >
      <MarketingHero
        eyebrow="Pricing"
        title="Priced for real operations, not seat padding"
        lede="Fabric59 is sold as a working operations layer. Pricing is anchored to the canonical workspace and call-session signals already in product."
      />

      <SectionShell bordered>
        <div className="grid md:grid-cols-3 gap-5">
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
                      <span className="text-[10px] uppercase tracking-[0.18em] text-primary">
                        Most teams
                      </span>
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
        <p className="mt-10 text-center text-xs text-muted-foreground">
          No self-serve checkout. No credit-card capture. No auto-renew traps.
        </p>
      </SectionShell>
    </MarketingLayout>
  );
}
