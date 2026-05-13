import {
  PhoneIncoming,
  RotateCcw,
  ClipboardCheck,
  GitBranch,
  Activity,
  Phone,
  Scale,
  Webhook,
  MessageSquare,
  Compass,
  Headphones,
  Wrench,
} from "lucide-react";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { MarketingHero } from "@/components/marketing/MarketingHero";
import { SectionShell } from "@/components/marketing/SectionShell";
import { SectionIntro } from "@/components/marketing/SectionIntro";
import { MotionList } from "@/components/marketing/MotionList";
import { PersonaList } from "@/components/marketing/PersonaList";
import { CapabilityCard } from "@/components/marketing/CapabilityCard";
import { CtaRow } from "@/components/marketing/CtaRow";
import { ProofStrip } from "@/components/marketing/ProofStrip";
import { ProofQuote } from "@/components/marketing/ProofQuote";
import { StructuredData } from "@/components/seo/StructuredData";
import {
  CANONICAL_TAGLINE,
  buildFaqLD,
  canonicalSiteDescription,
  organizationLD,
  softwareApplicationLD,
} from "@/seo/marketingMetadata";

/**
 * Phase H — Premium landing page.
 *
 * Built from the canonical premium primitives. Every claim is grounded
 * in implemented product surfaces. No fake metrics, no logo wall, no
 * coming-soon inventory framing on the public page.
 */

const MOTIONS = [
  {
    icon: PhoneIncoming,
    title: "Inbound intake",
    outcome: "ANI lookup, screen pop, decision-tree guides, disposition-driven CRM writeback.",
    href: "/solutions#inbound-intake",
  },
  {
    icon: RotateCcw,
    title: "Outbound reactivation",
    outcome: "Campaign orchestration, callback queues, ANI block lists for win-back motions.",
    href: "/solutions#outbound-reactivation",
  },
  {
    icon: ClipboardCheck,
    title: "QA and review",
    outcome: "Workspace-scoped review queue, scoring against shipped guides, supervisor live ops.",
    href: "/solutions#qa-review",
  },
  {
    icon: GitBranch,
    title: "CRM sync and handoff",
    outcome: "Visual field mapping, post-call automations, downstream workflow dispatch.",
    href: "/solutions#crm-sync-handoff",
  },
  {
    icon: Activity,
    title: "Monitoring and readiness",
    outcome: "Telephony reconciliation, tenant health, rate limits, pilot readiness state.",
    href: "/solutions#monitoring-readiness",
  },
];

const PERSONAS = [
  {
    icon: Compass,
    role: "Operations leader",
    jobs: [
      "Multi-workspace governance with config inheritance",
      "Tenant health, rate limits, audit-grade export",
    ],
    motionLabel: "See how ops leaders use Fabric59",
    motionHref: "/personas#ops-leader",
  },
  {
    icon: Headphones,
    role: "Supervisor",
    jobs: [
      "Live ops, callbacks, and QA review queue",
      "Push script changes without filing a ticket",
    ],
    motionLabel: "See supervisor workflows",
    motionHref: "/personas#supervisor",
  },
  {
    icon: Wrench,
    role: "Implementation / admin",
    jobs: [
      "Five9 Web Connector automation and visual mapping",
      "Test runner before any adapter goes live",
    ],
    motionLabel: "See implementation playbook",
    motionHref: "/personas#implementation-admin",
  },
  {
    icon: PhoneIncoming,
    role: "Intake / service-ops owner",
    jobs: [
      "Decision-tree guides and per-disposition routing",
      "Reconciliation against telephony logs",
    ],
    motionLabel: "See intake workflows",
    motionHref: "/personas#intake-owner",
  },
];

const INTEGRATIONS = [
  {
    icon: Phone,
    title: "Five9 telephony",
    body: "Multi-domain control, Web Connector automation, pre-call ANI lookup, post-call event ingestion.",
  },
  {
    icon: Scale,
    title: "Legal CRM — Clio first, MyCase next",
    body: "Adapter-based downstream system-of-record. MyCase live, Clio Grow Lead Inbox MVP shipped, Clio Manage activates on OAuth.",
  },
  {
    icon: MessageSquare,
    title: "Slack notifications",
    body: "Real-time agent workspace plus post-call event routing by disposition urgency.",
  },
  {
    icon: Webhook,
    title: "Zapier + Make webhooks",
    body: "Outbound dispatch into the workflow tools your business already runs.",
  },
];

const FAQ = [
  {
    question: "What is Fabric59?",
    answer:
      "Fabric59 is a multi-tenant operational intelligence platform for service organizations beginning with legal intake and call-center assisted workflows. Five9 is the telephony and session-event layer; downstream system-of-record is adapter-based, with Clio first and MyCase next.",
  },
  {
    question: "How does Fabric59 integrate with Five9?",
    answer:
      "Through the Five9 SOAP Admin API for control-plane operations, plus a webhook layer for pre-call ANI lookup and post-call events. Agents work inside Five9 Desktop — Fabric59 does not require direct CRM logins for agents.",
  },
  {
    question: "Which downstream systems are supported today?",
    answer:
      "MyCase intake is live via per-client API key. Clio Grow Lead Inbox is shipped as an MVP. Clio Manage activates on OAuth provisioning. The integration layer is provider-agnostic by design — additional adapters are scoped with design partners.",
  },
  {
    question: "How do I get started?",
    answer:
      "Onboarding is currently founder-led. Talk to us to scope your Five9 footprint, downstream systems, and rollout. Self-serve signup and billing will open later.",
  },
  {
    question: "How is data isolated?",
    answer:
      "Tenant data is isolated by Postgres Row-Level Security with SECURITY DEFINER role checks. Credentials are encrypted at rest. A server-side compliance export bundles logs, config history, and an RLS snapshot.",
  },
];

export default function LandingPage() {
  return (
    <MarketingLayout
      title={`Fabric59 — ${CANONICAL_TAGLINE}`}
      description={canonicalSiteDescription()}
      ctaBanner={
        <SectionShell size="md">
          <SectionIntro
            title="Walk through it with us"
            lede="Founder-led pilots. We map your Five9 footprint, downstream system, and rollout in a single working session."
            cta={
              <CtaRow
                primary={{ label: "Start a pilot", to: "/contact?topic=pilot" }}
                secondary={{ label: "See solutions", to: "/solutions" }}
              />
            }
          />
        </SectionShell>
      }
    >
      <StructuredData data={[organizationLD, softwareApplicationLD(), buildFaqLD(FAQ)]} />

      <MarketingHero
        eyebrow="Multi-tenant · Five9-native"
        title={
          <>
            Operational intelligence for{" "}
            <span className="text-primary">Five9 contact centers</span>.
          </>
        }
        lede="Fabric59 is the workspace-first operating layer for service teams. Five9 sessions, decision-tree guides, QA review, and disposition-driven CRM handoff — under one canonical org, partner, and client hierarchy."
        primary={{ label: "Start a pilot", to: "/contact?topic=pilot" }}
        secondary={{ label: "Sign in", to: "/login" }}
      />

      <SectionShell id="motions" bordered>
        <SectionIntro
          eyebrow="Operating motions"
          title="Five real motions, one workspace"
          lede="Each motion lands in a real workspace surface that already ships. No theme-park demos."
          className="mb-12"
        />
        <MotionList items={MOTIONS} />
      </SectionShell>

      <SectionShell id="personas" muted bordered>
        <SectionIntro
          eyebrow="Built for"
          title="The four roles that own a Five9 program"
          lede="Fabric59 is opinionated about who runs intake. Each persona has a workspace surface mapped to their day."
          className="mb-12"
        />
        <PersonaList items={PERSONAS} />
      </SectionShell>

      <SectionShell id="integrations" bordered>
        <SectionIntro
          eyebrow="Integrations posture"
          title="Five9-native, adapter-based downstream"
          lede="Five9 is the credibility wedge for telephony and session events. Downstream system-of-record is provider-agnostic — Clio first, MyCase next."
          className="mb-12"
        />
        <div className="grid gap-5 md:grid-cols-2">
          {INTEGRATIONS.map((i) => (
            <CapabilityCard key={i.title} icon={i.icon} title={i.title} body={i.body} />
          ))}
        </div>
        <ProofStrip
          className="mt-14"
          items={[
            "Postgres RLS isolation",
            "AES-256 credential vault",
            "Per-tenant rate limits",
            "Visual mapping with Test runner",
          ]}
        />
      </SectionShell>

      <SectionShell id="proof" muted bordered>
        <ProofQuote
          quote="We stopped maintaining glue scripts the day Fabric59 wired Five9 into our intake CRM."
          context="Operations lead at a legal-intake contact center using Fabric59 today"
        />
        <p className="mt-4 text-[11px] text-muted-foreground/70 text-center italic">
          Quote anonymized at the customer’s request. Fabric59 does not publish fabricated testimonials.
        </p>
      </SectionShell>

      <SectionShell id="faq" bordered>
        <SectionIntro eyebrow="Questions" title="Honest answers about what ships today" className="mb-10" />
        <div className="max-w-3xl mx-auto space-y-4">
          {FAQ.map((q) => (
            <details
              key={q.question}
              className="group rounded-xl border border-border/60 bg-card/60 p-5 open:bg-card"
            >
              <summary className="cursor-pointer list-none text-sm font-semibold text-foreground flex items-center justify-between gap-4">
                {q.question}
                <span
                  aria-hidden
                  className="text-primary transition-transform group-open:rotate-45 text-lg leading-none"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{q.answer}</p>
            </details>
          ))}
        </div>
      </SectionShell>
    </MarketingLayout>
  );
}
