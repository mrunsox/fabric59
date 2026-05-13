import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { MarketingHero } from "@/components/marketing/MarketingHero";
import { SectionShell } from "@/components/marketing/SectionShell";
import { SectionIntro } from "@/components/marketing/SectionIntro";
import { CtaRow } from "@/components/marketing/CtaRow";
import { ProofQuote } from "@/components/marketing/ProofQuote";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Phase H — Customers page.
 *
 * Design-partner framing only. No fabricated logos, no inflated metrics.
 * One calm proof quote, then operating-motion narratives.
 */
const STORIES = [
  {
    sector: "Legal intake",
    headline: "Five9 + MyCase, agents in one console",
    body: "First Fabric59 design partner running live MyCase intake via per-client API key. Agents work from canonical decision-tree guides; outcomes route per disposition into the right matter, with telephony reconciliation against Five9 logs.",
    outcome: "Eliminated glue scripts between dialer and case file",
  },
  {
    sector: "BPO operations",
    headline: "Multi-client workspaces on a shared Five9 domain",
    body: "Workspace-per-client isolation with Postgres RLS, per-tenant rate limits, tenant health, and a Supervisor / QA review queue replaced spreadsheet-driven client management.",
    outcome: "One cockpit replaces a folder of client trackers",
  },
  {
    sector: "Platform partner",
    headline: "Concierge onboarding, safe-mode rollout",
    body: "Design-partner flag, rollout status, GA readiness checklist, feedback drawer, and What's New release notes coordinate every pilot from kickoff through go-live.",
    outcome: "Predictable pilots with a documented path to GA",
  },
];

export default function CustomersPage() {
  return (
    <MarketingLayout
      title="Customers | Fabric59"
      description="How real teams use Fabric59 today: legal intake on Five9, multi-client BPO operations, and platform-partner pilots."
      ctaBanner={
        <SectionShell>
          <SectionIntro
            title="Want to be the next story?"
            lede="We are actively running design-partner pilots. The right teams get a direct channel to the build team."
            cta={
              <CtaRow
                primary={{ label: "Become a design partner", to: "/contact?topic=pilot" }}
                secondary={{ label: "See solutions", to: "/solutions" }}
              />
            }
          />
        </SectionShell>
      }
    >
      <MarketingHero
        eyebrow="Customers"
        title="Real teams. Real workspaces. Real Five9."
        lede="Fabric59 is in active design-partner mode. We do not stage fake logos. The stories below describe how the product is being used today."
      />

      <SectionShell muted bordered>
        <ProofQuote
          quote="We stopped maintaining glue scripts the day Fabric59 wired Five9 into our intake CRM."
          context="Operations lead at a legal-intake contact center using Fabric59 today"
        />
      </SectionShell>

      <SectionShell bordered>
        <div className="max-w-4xl mx-auto space-y-5">
          {STORIES.map((s) => (
            <Card key={s.headline} className="border-border/60">
              <CardContent className="p-6 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
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
      </SectionShell>
    </MarketingLayout>
  );
}
