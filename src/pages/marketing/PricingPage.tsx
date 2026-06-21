import { Link } from "react-router-dom";
import { Check, ArrowRight } from "lucide-react";
import { MarketingShell as MarketingLayout } from "@/shells/MarketingShell";
import { MarketingHero } from "@/components/marketing/MarketingHero";
import { SectionShell } from "@/components/marketing/SectionShell";
import { SectionIntro } from "@/components/marketing/SectionIntro";
import { CtaRow } from "@/components/marketing/CtaRow";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Phase 3 — Pricing page.
 *
 * Tiers framed around provider scale: number of client workspaces, campaigns
 * per workspace, concurrent agents, and the vertical integration packs
 * included. Fabric59 is purchased by the provider (outsourced answering or
 * virtual receptionist business), not by the individual end-client firm.
 *
 * Concierge-led only. Every CTA routes to /contact?topic=pricing or pilot.
 */
const TIERS = [
  {
    name: "Starter operation",
    blurb: "For new outsourced answering or virtual receptionist providers running a single vertical.",
    price: "Custom",
    cadence: "Concierge onboarding",
    features: [
      "Up to 5 client workspaces",
      "1 Five9 domain, shared across clients",
      "Legal practice management pack included",
      "Standard guides, forms, QA queue, and analytics",
      "Business Brain included — knowledge ingestion, review, approved answers, governance, health",
      "Direct channel with the build team",
    ],
    cta: { label: "Start a pilot", to: "/contact?topic=pricing" },
    highlight: false,
  },
  {
    name: "Growing provider",
    blurb: "For established answering services and VR operations running real call volume across many clients.",
    price: "Usage-based",
    cadence: "Per client workspace + per call session",
    features: [
      "Up to 50 client workspaces in one organization",
      "Unlimited campaigns and guides per workspace",
      "Concurrent agent seats sized to your shift coverage",
      "Legal practice management pack included; additional vertical packs add-on",
      "Per-tenant rate limits and tenant health",
      "Business Brain included across every workspace",
      "Implementation-led rollout per client",
    ],
    cta: { label: "Talk to us", to: "/contact?topic=pricing" },
    highlight: true,
  },
  {
    name: "Network operator",
    blurb: "For multi-brand answering networks and enterprise VR operations running many clients across multiple verticals.",
    price: "Contact us",
    cadence: "Annual + per-workspace usage",
    features: [
      "Unlimited client workspaces across multiple organizations",
      "Multi-domain Five9 across brands or regions",
      "All current vertical integration packs included",
      "White-label branding overrides per brand and per client",
      "Business Brain included across every workspace and brand",
      "Design-partner ops view and custom adapter scoping",
    ],
    cta: { label: "Become a network partner", to: "/contact?topic=pricing" },
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <MarketingLayout
      title="Pricing | Fabric59"
      description="Pricing for outsourced answering services and virtual receptionist providers. Tiered by client workspaces, concurrent agents, and vertical integration packs."
      ctaBanner={
        <SectionShell>
          <SectionIntro
            title="Every engagement is scoped"
            lede="Self-serve checkout, plan management, and payment methods are deferred. Until then we quote and invoice directly so the rollout matches the way you actually run your clients."
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
        title="Priced for providers, not for end clients"
        lede="Fabric59 is purchased by outsourced answering services and virtual receptionist providers. Your clients are workspaces. Tiers scale with workspaces, concurrent agents, and the vertical integration packs you need."
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
                        Most providers
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
          Workspaces map to your clients. Vertical packs are billed per pack. No self-serve checkout, no auto-renew traps.
        </p>
      </SectionShell>
    </MarketingLayout>
  );
}
