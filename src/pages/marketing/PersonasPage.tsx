import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { SectionIntro } from "@/components/marketing/SectionIntro";
import { CapabilityCard } from "@/components/marketing/CapabilityCard";
import { CtaRow } from "@/components/marketing/CtaRow";
import { ProofStrip } from "@/components/marketing/ProofStrip";
import {
  Compass,
  Headphones,
  Wrench,
  PhoneIncoming,
} from "lucide-react";

/**
 * Phase G — Personas page.
 * 4 canonical buyer roles, each tied to product surfaces.
 */
const PERSONAS = [
  {
    icon: Compass,
    title: "Operations leaders",
    body: "Run multiple Five9 programs across clients. Need workspace-level isolation, honest billing signal, and a single cockpit to see what's healthy.",
    bullets: [
      "Org / Partner / Client hierarchy with config inheritance",
      "Tenant health and per-tenant rate limits",
      "Audit-grade compliance export",
    ],
  },
  {
    icon: Headphones,
    title: "Supervisors",
    body: "Live ops on a single workspace. Need QA review, KPI surfacing, and the ability to push script changes without filing a ticket.",
    bullets: [
      "QA review queue scoped to workspace",
      "KPI overview + top dispositions",
      "Direct script and guide editing",
    ],
  },
  {
    icon: Wrench,
    title: "Implementation + admins",
    body: "Wire Five9 to the CRMs and tools their team already uses. Need a Five9 Web Connector path, visual mapping, and a Test runner before anything goes live.",
    bullets: [
      "Five9 Web Connector automation",
      "Visual field mapping with Test runner",
      "MyCase, Clio, Slack, Zapier, Make adapters",
    ],
  },
  {
    icon: PhoneIncoming,
    title: "Intake + service-ops owners",
    body: "Own outcomes per call. Need decision-tree guides, disposition routing, callback orchestration, and reconciliation against telephony logs.",
    bullets: [
      "Visual decision-tree intake guides",
      "Per-disposition CRM dispatch policies",
      "Callback queue + ANI block list",
    ],
  },
];

export default function PersonasPage() {
  return (
    <MarketingLayout
      title="Who Fabric59 is for | Personas"
      description="Fabric59 is built for operations leaders, supervisors, implementation admins, and intake owners running real Five9 programs."
      ctaBanner={
        <section className="py-16 px-6 bg-muted/20">
          <SectionIntro
            title="Not sure which fits?"
            lede="We'll scope your role and program in a single walkthrough."
            cta={
              <CtaRow
                primary={{ label: "Talk to us", to: "/contact" }}
                secondary={{ label: "Explore solutions", to: "/solutions" }}
              />
            }
          />
        </section>
      }
    >
      <section className="pt-20 pb-4 px-6">
        <SectionIntro
          eyebrow="Personas"
          title="Built for the teams running Five9 in the real world"
          lede="Fabric59 is opinionated. It is the canonical operating layer for the four roles that own real Five9 programs day to day."
        />
      </section>

      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-5">
          {PERSONAS.map((p) => (
            <CapabilityCard
              key={p.title}
              icon={p.icon}
              title={p.title}
              body={p.body}
              bullets={p.bullets}
            />
          ))}
        </div>

        <ProofStrip
          className="mt-16"
          items={[
            "Concierge onboarding",
            "Workspace-first by design",
            "Founder-led pilots",
          ]}
        />
      </section>
    </MarketingLayout>
  );
}
