import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { SectionIntro } from "@/components/marketing/SectionIntro";
import { CtaRow } from "@/components/marketing/CtaRow";
import { ProofStrip } from "@/components/marketing/ProofStrip";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Phase G — Customers page.
 * Design-partner framing. Operational outcomes only — no fabricated logos
 * or vanity metrics.
 */
const STORIES = [
  {
    sector: "Legal intake",
    headline: "Five9 + MyCase, agents in one console",
    body:
      "First Fabric59 design partner running live MyCase intake via per-client API key. Agents work from canonical decision-tree guides; outcomes route per disposition into the right matter, with telephony reconciliation against Five9 logs.",
    outcome: "Eliminated glue scripts between dialer and case file",
  },
  {
    sector: "BPO operations",
    headline: "Multi-client workspaces on a shared Five9 domain",
    body:
      "Workspace-per-client isolation with Postgres RLS, per-tenant rate limits, tenant health, and a Supervisor / QA review queue replaced spreadsheet-driven client management.",
    outcome: "One cockpit replaces a folder of client trackers",
  },
  {
    sector: "Platform partner",
    headline: "Concierge onboarding, safe-mode rollout",
    body:
      "Design-partner flag, rollout status, GA readiness checklist, feedback drawer, and What's New release notes coordinate every pilot from kickoff through go-live.",
    outcome: "Predictable pilots with a documented path to GA",
  },
];

export default function CustomersPage() {
  return (
    <MarketingLayout
      title="Customer stories | Fabric59"
      description="How real teams are using Fabric59 today: legal intake on Five9, BPO multi-client operations, and platform-partner pilots."
      ctaBanner={
        <section className="py-16 px-6 bg-muted/20">
          <SectionIntro
            title="Want to be the next story?"
            lede="We're actively running design-partner pilots. The right teams get a direct channel to the Fabric59 build team."
            cta={
              <CtaRow
                primary={{ label: "Become a design partner", to: "/contact" }}
                secondary={{ label: "See solutions", to: "/solutions" }}
              />
            }
          />
        </section>
      }
    >
      <section className="pt-20 pb-4 px-6">
        <SectionIntro
          eyebrow="Customers"
          title="Real teams. Real workspaces. Real Five9."
          lede="Fabric59 is in active design-partner mode. We don't stage fake logos. The stories below describe how the product is being used today."
        />
      </section>

      <section className="py-12 px-6">
        <div className="max-w-4xl mx-auto space-y-5">
          {STORIES.map((s) => (
            <Card key={s.headline} className="border-border/60">
              <CardContent className="p-6 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                  {s.sector}
                </p>
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  {s.headline}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
                <p className="text-xs text-muted-foreground italic border-l-2 border-primary/40 pl-3">
                  {s.outcome}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <ProofStrip
          className="mt-16"
          items={[
            "Design-partner pilots only",
            "No fabricated logos or metrics",
            "Direct channel to the build team",
          ]}
        />
      </section>
    </MarketingLayout>
  );
}
