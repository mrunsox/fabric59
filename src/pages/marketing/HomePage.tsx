import {
  PhoneIncoming, RotateCcw, ClipboardCheck, GitBranch, Activity,
  Phone, Scale, Webhook, MessageSquare, Compass, Headphones, Wrench,
  UserSearch, ListChecks, Target, BellRing,
} from "lucide-react";
import { MarketingShell } from "@/shells/MarketingShell";
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
 * Phase 3 — Fabric59 reposition.
 *
 * Multi-tenant guided call workspace for outsourced answering services and
 * virtual receptionist providers. Five9 handles the call. Fabric59 is the
 * brain. The client's system of record holds the outcome.
 */

const QUESTIONS = [
  {
    icon: UserSearch,
    title: "Who called?",
    body: "Pre-call ANI lookup matches the caller against the right client workspace before screen pop — caller identity, prior history, and account context land with the agent in under 500ms.",
  },
  {
    icon: ListChecks,
    title: "What happened on the call?",
    body: "Decision-tree guides, structured forms, and AI summaries capture the call as a clean interaction record — not a free-text note that nobody can route.",
  },
  {
    icon: Target,
    title: "What was the outcome?",
    body: "Dispositions, urgency selectors, and an outcome model turn the call into a structured decision the rest of your operation can act on.",
  },
  {
    icon: BellRing,
    title: "Who needs to be notified?",
    body: "Notification routing, integration write-back, sync logs, and exception queues push the outcome into the client's system of record and the right humans, instantly.",
  },
];

const MOTIONS = [
  { icon: PhoneIncoming, title: "Inbound intake",        outcome: "ANI lookup, screen pop, decision-tree guides, disposition-driven write-back into the client's system of record.", href: "/solutions#inbound-intake" },
  { icon: RotateCcw,     title: "Outbound reactivation", outcome: "Campaign orchestration, callback queues, ANI block lists for win-back motions across client workspaces.",        href: "/solutions#outbound-reactivation" },
  { icon: ClipboardCheck,title: "QA and review",         outcome: "Workspace-scoped review queue, scoring against the guide your agents actually shipped, supervisor live ops.",   href: "/solutions#qa-and-review" },
  { icon: GitBranch,     title: "System-of-record sync", outcome: "Visual field mapping, per-disposition policy, outbound webhooks into the workflow tools each client already runs.", href: "/solutions#crm-sync-handoff" },
  { icon: Activity,      title: "Monitoring and readiness", outcome: "Telephony reconciliation, client health, rate limits, pilot readiness state for every workspace you run.",      href: "/solutions#monitoring-readiness" },
];

const PERSONAS = [
  { icon: Compass,       role: "Operations leader",        jobs: ["Multi-workspace governance with config inheritance", "Client health, rate limits, audit-grade export across every account"], motionLabel: "See how ops leaders use Fabric59", motionHref: "/personas#ops-leader" },
  { icon: Headphones,    role: "Supervisor",               jobs: ["Live ops, callbacks, and QA review queue", "Push guide changes for any client without filing a ticket"],                       motionLabel: "See supervisor workflows",         motionHref: "/personas#supervisor" },
  { icon: Wrench,        role: "Implementation / admin",   jobs: ["Five9 Web Connector automation and visual mapping per client", "Test runner before any client adapter goes live"],              motionLabel: "See implementation playbook",      motionHref: "/personas#implementation-admin" },
  { icon: PhoneIncoming, role: "Intake / receptionist lead", jobs: ["Decision-tree guides and per-disposition routing per client", "Reconciliation against telephony logs"],                       motionLabel: "See intake workflows",             motionHref: "/personas#intake-owner" },
];

const INTEGRATIONS = [
  { icon: Phone,         title: "Five9 telephony",                       body: "Multi-domain control, Web Connector automation, pre-call ANI lookup, post-call event ingestion. Call handling stays in Five9 — Fabric59 orchestrates everything around the call." },
  { icon: Scale,         title: "Legal practice management pack",        body: "First vertical pack live today. MyCase intake live, Clio Grow Lead Inbox MVP shipped, Clio Manage activates on OAuth, Smokeball on the roadmap. More vertical packs (medical, financial, property management) to come." },
  { icon: MessageSquare, title: "Slack notifications",                   body: "Real-time agent workspace plus per-disposition notification routing — the right human gets pinged the second the call ends." },
  { icon: Webhook,       title: "Zapier + Make webhooks",                body: "Outbound dispatch into the workflow tools each of your clients already runs, scoped per workspace." },
];

const FAQ = [
  {
    question: "Who is Fabric59 for?",
    answer:
      "Outsourced answering service providers and virtual receptionist companies that answer calls on behalf of many clients across multiple industries. Fabric59 is the multi-tenant workspace platform you sit on top of Five9 — your clients are workspaces, your agents work guided calls across all of them.",
  },
  {
    question: "Is Fabric59 only for legal answering services?",
    answer:
      "No. Fabric59 is multi-vertical by design — legal, medical, financial, property management, and other professional services. Legal is the first deep vertical pack because the legal practice management integrations (Clio, MyCase, Smokeball) shipped first. Additional vertical packs are on the roadmap.",
  },
  {
    question: "How does Fabric59 sit next to Five9?",
    answer:
      "Five9 handles the call — ACD, dialer, agent desktop. Fabric59 is the brain between Five9 and your client's system of record: pre-call ANI lookup, on-call guides and forms, structured outcomes, and downstream write-back. We do not replace your phone system.",
  },
  {
    question: "Which systems of record can Fabric59 write into today?",
    answer:
      "The legal practice management pack is live: MyCase intake via per-client API key, Clio Grow Lead Inbox MVP, Clio Manage on OAuth provisioning, Smokeball on the roadmap. The adapter layer is provider-agnostic — additional vertical packs and downstream systems are scoped with design partners.",
  },
  {
    question: "How is each client's data isolated?",
    answer:
      "Every client is a workspace under your organization. Workspace data is isolated by Postgres Row-Level Security with SECURITY DEFINER role checks. Credentials are encrypted at rest. A server-side compliance export bundles logs, config history, and an RLS snapshot per workspace.",
  },
  {
    question: "How do I get started?",
    answer:
      "Onboarding is founder-led. Talk to us to scope your Five9 footprint, the clients and verticals you serve, and your rollout. Self-serve signup and billing will open later.",
  },
];

export default function HomePage() {
  return (
    <MarketingShell
      title={`Fabric59 — ${CANONICAL_TAGLINE}`}
      description={canonicalSiteDescription()}
      ctaBanner={
        <SectionShell size="md">
          <SectionIntro
            title="Walk through it with us"
            lede="Founder-led pilots for outsourced answering and virtual receptionist providers. We map your Five9 footprint, your clients, and the systems of record they live in — in a single working session."
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
        eyebrow="Multi-tenant guided call workspace · For outsourced answering & virtual receptionists"
        title={
          <>
            Five9 handles the call.{" "}
            <span className="text-primary">Fabric59 is the brain.</span>
          </>
        }
        lede="Your client's system of record holds the outcome. Fabric59 is the multi-tenant guided call workspace platform for outsourced answering services and virtual receptionist providers — multi-vertical by design, with a deep legal practice management pack shipping first."
        primary={{ label: "Start a pilot", to: "/contact?topic=pilot" }}
        secondary={{ label: "Sign in", to: "/login" }}
      />

      <SectionShell id="four-questions" bordered>
        <SectionIntro
          eyebrow="Every call, structured"
          title="Four questions. One workspace. Every client."
          lede="Fabric59 structures every call your agents take around the four questions that actually matter for an answering service — and routes the answers into the right client's system of record."
          className="mb-12"
        />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {QUESTIONS.map((q) => (
            <CapabilityCard key={q.title} icon={q.icon} title={q.title} body={q.body} />
          ))}
        </div>
      </SectionShell>

      <SectionShell id="motions" muted bordered>
        <SectionIntro eyebrow="Operating motions" title="Five real motions, one multi-client workspace" lede="Each motion lands in a real workspace surface that already ships — scoped per client account you run on Fabric59." className="mb-12" />
        <MotionList items={MOTIONS} />
      </SectionShell>

      <SectionShell id="personas" bordered>
        <SectionIntro eyebrow="Built for" title="The four roles that run an answering-service operation" lede="Fabric59 is opinionated about who runs guided calls across many clients. Each persona has a workspace surface mapped to their day." className="mb-12" />
        <PersonaList items={PERSONAS} />
      </SectionShell>

      <SectionShell id="integrations" muted bordered>
        <SectionIntro eyebrow="Integrations posture" title="Five9-native telephony, vertical packs for downstream" lede="Five9 is the call layer. Downstream system-of-record is grouped into vertical packs — legal practice management ships first, more verticals follow. Each pack plugs into the same canonical outcome pipeline." className="mb-12" />
        <div className="grid gap-5 md:grid-cols-2">
          {INTEGRATIONS.map((i) => (
            <CapabilityCard key={i.title} icon={i.icon} title={i.title} body={i.body} />
          ))}
        </div>
        <ProofStrip
          className="mt-14"
          items={["Postgres RLS isolation per workspace", "AES-256 credential vault", "Per-client rate limits", "Visual mapping with Test runner"]}
        />
      </SectionShell>

      <SectionShell id="proof" bordered>
        <ProofQuote
          quote="We stopped maintaining glue scripts the day Fabric59 wired Five9 into our clients' systems of record."
          context="Operations lead at an outsourced answering service running multiple legal clients on Fabric59 today"
        />
        <p className="mt-4 text-[11px] text-muted-foreground/70 text-center italic">
          Quote anonymized at the customer's request. Fabric59 does not publish fabricated testimonials.
        </p>
      </SectionShell>

      <SectionShell id="faq" muted bordered>
        <SectionIntro eyebrow="Questions" title="Honest answers about what ships today" className="mb-10" />
        <div className="max-w-3xl mx-auto space-y-4">
          {FAQ.map((q) => (
            <details key={q.question} className="group rounded-xl border border-border/60 bg-card/60 p-5 open:bg-card">
              <summary className="cursor-pointer list-none text-sm font-semibold text-foreground flex items-center justify-between gap-4">
                {q.question}
                <span aria-hidden className="text-primary transition-transform group-open:rotate-45 text-lg leading-none">+</span>
              </summary>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{q.answer}</p>
            </details>
          ))}
        </div>
      </SectionShell>
    </MarketingShell>
  );
}
