import { MarketingShell as MarketingLayout } from "@/shells/MarketingShell";
import { MarketingHero } from "@/components/marketing/MarketingHero";
import { SectionShell } from "@/components/marketing/SectionShell";
import { SectionIntro } from "@/components/marketing/SectionIntro";
import { CtaRow } from "@/components/marketing/CtaRow";
import { ProofQuote } from "@/components/marketing/ProofQuote";

/**
 * Phase 3 / Phase 4 — Customers page.
 *
 * Design-partner framing only. No fabricated logos, no inflated metrics.
 * One calm proof quote, then operating-motion narratives rendered as
 * Brain-aligned story panels.
 */
const STORIES = [
  {
    sector: "Legal intake",
    headline: "Five9 + MyCase, agents in one console",
    body: "First Fabric59 design partner running live MyCase intake. Agents work from a per-firm guide with Business Brain answers on screen — conflict prompts, matter context, the firm's own language. Outcomes route per disposition into the right matter, with telephony reconciliation against Five9 logs.",
    outcome: "Eliminated glue scripts between dialer and case file",
  },
  {
    sector: "BPO operations",
    headline: "Multi-client workspaces on a shared Five9 domain",
    body: "Workspace-per-client isolation with row-level data separation, per-tenant rate limits, and tenant health replaced spreadsheet-driven client management. Business Brain gave supervisors one place to curate each client's answers and one Governance queue to keep them current.",
    outcome: "One cockpit replaces a folder of client trackers",
  },
  {
    sector: "Platform partner",
    headline: "Concierge onboarding, safe-mode rollout",
    body: "Design-partner flag, rollout status, GA readiness checklist, feedback drawer, and What's New release notes coordinate every pilot from kickoff through go-live. Business Brain Health gives the partner and the pilot team the same view of coverage and freshness.",
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
        lede="Fabric59 is in active design-partner mode. The stories below describe how teams use Fabric59 today, including the Business Brain that ships inside it. No fabricated logos, no inflated metrics."
        size="md"
      />

      <SectionShell surface="inset" bordered>
        <ProofQuote
          quote="We stopped maintaining glue scripts the day Fabric59 wired Five9 into our intake CRM."
          context="Operations lead at a legal-intake contact center using Fabric59 today"
        />
      </SectionShell>

      <SectionShell bordered>
        <div className="max-w-4xl mx-auto space-y-5">
          {STORIES.map((s) => (
            <article
              key={s.headline}
              className="bb-panel p-6 md:p-8 transition-colors hover:border-primary/30"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="bb-badge bb-badge-info">{s.sector}</span>
              </div>
              <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground leading-tight">
                {s.headline}
              </h2>
              <p className="mt-3 text-sm md:text-[15px] text-muted-foreground leading-relaxed">
                {s.body}
              </p>
              <div className="mt-5 flex items-start gap-3 rounded-lg border border-border/60 bg-[hsl(var(--bb-surface-inset))] px-4 py-3">
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary mt-0.5 shrink-0">
                  Outcome
                </span>
                <span className="text-sm text-foreground/85">{s.outcome}</span>
              </div>
            </article>
          ))}
        </div>
      </SectionShell>
    </MarketingLayout>
  );
}
