import { Link } from "react-router-dom";
import { Check, ArrowRight } from "lucide-react";
import { MarketingShell as MarketingLayout } from "@/shells/MarketingShell";
import { MarketingHero } from "@/components/marketing/MarketingHero";
import { SectionShell } from "@/components/marketing/SectionShell";
import { SectionIntro } from "@/components/marketing/SectionIntro";
import { CtaRow } from "@/components/marketing/CtaRow";
import { cn } from "@/lib/utils";

/**
 * Phase 3 / Phase 4 — Pricing page.
 *
 * Tiers framed around provider scale. Concierge-led only. Every CTA
 * routes to /contact?topic=pricing or pilot. The middle tier carries a
 * restrained "Recommended" treatment — small primary eyebrow only, no
 * loud ribbon or glow.
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
        lede="Fabric59 is purchased by outsourced answering services and virtual receptionist providers. Every tier includes Business Brain — the governed knowledge layer that powers your agents on every call. Tiers scale with workspaces, concurrent agents, and the vertical packs you need."
      />

      <SectionShell surface="inset" bordered>
        <div className="grid md:grid-cols-3 gap-5 items-stretch">
          {TIERS.map((t) => (
            <article
              key={t.name}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-card p-6 transition-colors",
                t.highlight
                  ? "border-primary/40 ring-1 ring-primary/15"
                  : "border-border/60",
              )}
            >
              {t.highlight && (
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary mb-2">
                  Recommended
                </p>
              )}
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                {t.name}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                {t.blurb}
              </p>
              <div className="mt-5 pb-5 border-b border-border/40">
                <div className="text-3xl font-semibold tracking-tight text-foreground">
                  {t.price}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{t.cadence}</div>
              </div>
              <ul className="text-sm text-muted-foreground space-y-2 mt-5 flex-1">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                    <span className="leading-relaxed">{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                to={t.cta.to}
                className={cn(
                  "mt-6 inline-flex w-full items-center justify-center gap-1.5 h-10 rounded-md text-sm font-medium transition-colors",
                  t.highlight
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border border-border bg-background hover:bg-muted",
                )}
              >
                {t.cta.label} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </article>
          ))}
        </div>
        <p className="mt-10 text-center text-xs text-muted-foreground">
          Workspaces map to your clients. Vertical packs are billed per pack. No self-serve checkout, no auto-renew traps.
        </p>
      </SectionShell>
    </MarketingLayout>
  );
}
