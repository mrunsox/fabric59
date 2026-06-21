import { Compass, Headphones, Wrench, PhoneIncoming } from "lucide-react";
import { MarketingShell as MarketingLayout } from "@/shells/MarketingShell";
import { MarketingHero } from "@/components/marketing/MarketingHero";
import { SectionShell } from "@/components/marketing/SectionShell";
import { SectionIntro } from "@/components/marketing/SectionIntro";
import { PersonaList } from "@/components/marketing/PersonaList";
import { CtaRow } from "@/components/marketing/CtaRow";

/**
 * Phase H — Personas page.
 * 4 canonical roles, each anchored and tied to a real motion.
 */
const PERSONAS = [
  {
    icon: Compass,
    role: "Operations leader",
    anchorId: "ops-leader",
    jobs: [
      "Run multiple Five9 programs across clients with workspace isolation",
      "Govern config inheritance across Org, Partner, and Client",
      "Watch coverage, freshness, and gaps across every client from one Business Brain Health view",
    ],
    motionLabel: "Maps to monitoring and readiness",
    motionHref: "/solutions#monitoring-readiness",
  },
  {
    icon: Headphones,
    role: "Supervisor",
    anchorId: "supervisor",
    jobs: [
      "Live ops on a single workspace — callbacks, queues, KPIs",
      "Review suggested answers before they reach a live call, and resolve stale facts from the same queue",
      "Push script changes inline without filing a ticket",
    ],
    motionLabel: "Maps to QA and review",
    motionHref: "/solutions#qa-and-review",
  },
  {
    icon: Wrench,
    role: "Implementation / admin",
    anchorId: "implementation-admin",
    jobs: [
      "Wire Five9 to the downstream systems the team already uses",
      "Load each client's knowledge into Business Brain — paste, upload, CSV, FAQ — and approve it once",
      "Roll out through the shared GA readiness checklist",
    ],
    motionLabel: "Maps to CRM sync and handoff",
    motionHref: "/solutions#crm-sync-handoff",
  },
  {
    icon: PhoneIncoming,
    role: "Intake / service-ops owner",
    anchorId: "intake-owner",
    jobs: [
      "Own outcomes per call — intake, qualification, handoff",
      "Decision-tree guides with per-disposition routing",
      "Approved Business Brain answers and per-disposition routing surface on screen pop, every call",
    ],
    motionLabel: "Maps to inbound intake",
    motionHref: "/solutions#inbound-intake",
  },
];

export default function PersonasPage() {
  return (
    <MarketingLayout
      title="Who Fabric59 is for | Personas"
      description="Fabric59 is built for ops leaders, supervisors, implementation admins, and intake owners running real Five9 programs."
      ctaBanner={
        <SectionShell>
          <SectionIntro
            title="Not sure which persona fits?"
            lede="A single working call usually answers it. We will scope your role and your program together."
            cta={
              <CtaRow
                primary={{ label: "Start a pilot", to: "/contact?topic=pilot" }}
                secondary={{ label: "Explore solutions", to: "/solutions" }}
              />
            }
          />
        </SectionShell>
      }
    >
      <MarketingHero
        eyebrow="Personas"
        title="Built for the four roles that own a Five9 program"
        lede="Fabric59 is opinionated. Each persona lands in a workspace surface mapped to their day."
      />

      <SectionShell bordered>
        <PersonaList items={PERSONAS} />
      </SectionShell>
    </MarketingLayout>
  );
}
