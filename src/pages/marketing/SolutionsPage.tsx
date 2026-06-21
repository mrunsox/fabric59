import {
  PhoneIncoming,
  RotateCcw,
  ClipboardCheck,
  GitBranch,
  Activity,
  Scale,
  Headphones,
  Building2,
  Stethoscope,
  Wallet,
  Briefcase,
  UserSearch,
  ListChecks,
  Target,
  BellRing,
} from "lucide-react";
import { MarketingShell as MarketingLayout } from "@/shells/MarketingShell";
import { MarketingHero } from "@/components/marketing/MarketingHero";
import { SectionShell } from "@/components/marketing/SectionShell";
import { SectionIntro } from "@/components/marketing/SectionIntro";
import { CapabilityCard } from "@/components/marketing/CapabilityCard";
import { CtaRow } from "@/components/marketing/CtaRow";

/**
 * Phase 3 — Solutions page.
 *
 * Two solution lenses (legal-answering-services, virtual-receptionists)
 * plus the five canonical operating motions, all reframed around the
 * "Five9 is the call, Fabric59 is the brain, system of record holds the
 * outcome" story for outsourced answering and VR providers.
 *
 * No new routes — anchor sections satisfy the brief's
 * /solutions/legal-answering-services and /solutions/virtual-receptionists
 * surfaces.
 */

const QUESTIONS = [
  { icon: UserSearch, title: "Who called?",                body: "Caller matched to the right client workspace before screen pop, with prior history and account context already on screen." },
  { icon: ListChecks, title: "What happened on the call?", body: "Agents follow a per-client guide and read from approved Business Brain knowledge — not free-text notes nobody can route." },
  { icon: Target,     title: "What was the outcome?",       body: "Dispositions, urgency selectors, outcome model — structured decisions, not free-text notes." },
  { icon: BellRing,   title: "Who needs to be notified?",   body: "Notification routing, system-of-record write-back, sync logs, exception queues." },
];

const MOTIONS = [
  {
    anchor: "inbound-intake",
    icon: PhoneIncoming,
    eyebrow: "Inbound intake",
    title: "Capture every inbound call as structured intake — per client, per vertical",
    body: "Pre-call ANI lookup matches the caller against the right client workspace before screen pop. Decision-tree guides walk the agent through qualification for that specific client. Disposition routes the outcome into the client's system of record the moment the call ends.",
    bullets: [
      "Sub-500ms ANI lookup with screen pop",
      "Per-client decision-tree guides edited inside the workspace",
      "Outcome-routed write-back into the client's system of record",
    ],
    surfacedIn: "Workspace · Guides, Forms, Campaigns, QA · Brain · Approved Knowledge on screen pop",
    topic: "inbound-intake",
  },
  {
    anchor: "outbound-reactivation",
    icon: RotateCcw,
    eyebrow: "Outbound reactivation",
    title: "Win-back and follow-up motions without spreadsheet ops",
    body: "Reverse-engineer existing Five9 campaigns into reusable blueprints. Configure callback queues, abandon-rate guardrails, and ANI block lists from one workspace — replicate across client accounts in minutes.",
    bullets: [
      "Campaign blueprints replicated across client workspaces",
      "Callback queue with wait-time thresholds",
      "ANI block list applied via ModifyCampaignProfile",
    ],
    surfacedIn: "Workspace · Campaigns, Templates",
    topic: "outbound-reactivation",
  },
  {
    anchor: "qa-and-review",
    icon: ClipboardCheck,
    eyebrow: "QA and review",
    title: "QA scored against the guide your agents actually shipped",
    body: "Workspace-scoped review queue with scorecards bound to the live decision-tree guides for each client. Supervisors push guide changes for any client without filing a ticket.",
    bullets: [
      "Per-workspace QA review queue",
      "Scorecards bound to live per-client guides",
      "Supervisor live-ops view",
    ],
    surfacedIn: "Workspace · QA, Analytics · Brain · Governance (stale facts, gaps)",
    topic: "qa-review",
  },
  {
    anchor: "crm-sync-handoff",
    icon: GitBranch,
    eyebrow: "System-of-record sync and handoff",
    title: "One canonical adapter layer for every client's system of record",
    body: "Visual field mapping with a Test runner before any adapter goes live. Per-disposition policy controls allow / block / redact behavior. Workflow webhooks dispatch into Zapier and Make per client workspace.",
    bullets: [
      "Visual mapping builder with Test runner",
      "Per-disposition policy: allow / block / redact",
      "Outbound Zapier and Make dispatch per client",
    ],
    surfacedIn: "Workspace · Integrations, Settings",
    topic: "crm-sync",
  },
  {
    anchor: "monitoring-readiness",
    icon: Activity,
    eyebrow: "Monitoring and readiness",
    title: "Pilot readiness for every client, not a vanity status page",
    body: "Telephony reconciliation against Five9 logs, per-tenant rate limits, tenant health, and a shared GA readiness checklist coordinate every client rollout from kickoff through go-live.",
    bullets: [
      "Telephony reconciliation vs Five9 logs",
      "Per-tenant rate limits and tenant health",
      "Shared GA readiness checklist per client",
    ],
    surfacedIn: "Admin · Connectors, Reports, Settings",
    topic: "monitoring",
  },
];

const VR_CAPABILITIES = [
  { icon: Building2,  title: "Multi-tenant by design",   body: "One Fabric59 organization, many client workspaces. Each client is fully isolated — data, guides, dispositions, integrations." },
  { icon: Headphones, title: "Coverage you actually run", body: "After-hours, overflow, triage, message-taking, lead capture, and escalation flows — modeled per client and per service line." },
  { icon: GitBranch,  title: "Per-client systems of record", body: "Each workspace pushes the call result into the right downstream system — legal practice management today, more vertical packs on the way." },
  { icon: Activity,   title: "Operations visibility across accounts", body: "Per-client health, telephony reconciliation, rate limits, and readiness state — without leaving the platform." },
  { icon: ListChecks, title: "Per-client knowledge, governed centrally", body: "Each client's answers live in their own Business Brain. Supervisors curate; agents read. Gaps and stale answers surface in one queue across every account you run." },
];

const VERTICALS = [
  { icon: Scale,       label: "Legal" },
  { icon: Stethoscope, label: "Medical (roadmap)" },
  { icon: Wallet,      label: "Financial (roadmap)" },
  { icon: Building2,   label: "Property management (roadmap)" },
  { icon: Briefcase,   label: "Professional services (roadmap)" },
];

export default function SolutionsPage() {
  return (
    <MarketingLayout
      title="Solutions | Fabric59"
      description="Solutions for outsourced answering services and virtual receptionist providers. Multi-vertical guided call workspace with a deep legal practice management pack live today."
      ctaBanner={
        <SectionShell>
          <SectionIntro
            title="Map a motion to your operation"
            lede="We will walk through the motion in your Five9 footprint and the systems of record your clients live in, on a working call."
            cta={
              <CtaRow
                primary={{ label: "Start a pilot", to: "/contact?topic=pilot" }}
                secondary={{ label: "See pricing", to: "/pricing" }}
              />
            }
          />
        </SectionShell>
      }
    >
      <MarketingHero
        eyebrow="Solutions"
        title="Built for outsourced answering services and virtual receptionists"
        lede="Five9 handles the call. Fabric59 runs the workspace. Business Brain — the governed knowledge layer inside Fabric59 — gives your agents the right answer for each client, every time."
      />

      {/* Four-question framing as the spine */}
      <SectionShell id="four-questions" bordered>
        <SectionIntro
          eyebrow="The spine of every solution"
          title="Four questions Fabric59 answers on every call"
          lede="Whatever your client does, every call your agents take collapses to the same four questions. Fabric59 structures all of them — and routes the answers into the right place."
          className="mb-12"
        />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {QUESTIONS.map((q) => (
            <CapabilityCard key={q.title} icon={q.icon} title={q.title} body={q.body} />
          ))}
        </div>
      </SectionShell>

      {/* Legal answering services — zoomed-in vertical */}
      <SectionShell id="legal-answering-services" muted bordered>
        <SectionIntro
          eyebrow="Solution · Legal answering services"
          title="The deep legal vertical pack, live today"
          lede="Fabric59 powers many verticals; this section is zoomed in on how it works for law firms and the legal answering services that staff their phones. Intake coordinators run guided calls for many firms across one workspace platform — with conflict-check prompts, matter context, and direct write-back into the firm's case management system."
          className="mb-12"
        />
        <div className="grid gap-5 md:grid-cols-3">
          <CapabilityCard
            icon={Scale}
            title="Built for legal intake"
            body="Per-firm intake guides backed by Business Brain — conflict-check prompts, matter context, and the firm's approved language all surface inline as the intake call moves."
            bullets={[
              "Per-firm intake guides and forms",
              "Conflict-check prompts inline",
              "Case / matter context surfaced on screen pop",
            ]}
          />
          <CapabilityCard
            icon={GitBranch}
            title="Direct to the firm's case management"
            body="The legal practice management pack writes outcomes back into Clio, MyCase, and Smokeball (roadmap). Intake coordinators do not log into the firm's case system — Fabric59 handles the handoff."
            bullets={[
              "Clio Manage and Clio Grow",
              "MyCase live today",
              "Smokeball on the roadmap",
            ]}
          />
          <CapabilityCard
            icon={BellRing}
            title="Notify the right attorney, instantly"
            body="Disposition-driven Slack, email, and webhook notifications route urgent intakes to the right attorney or paralegal at the firm the second the call ends."
            bullets={[
              "Per-disposition urgency routing",
              "White-label notifications per firm",
              "Exception queues for follow-up",
            ]}
          />
        </div>
        <div className="mt-8">
          <CtaRow
            align="center"
            primary={{ label: "Talk about legal intake", to: "/contact?topic=legal-answering" }}
            secondary={{ label: "See the legal practice management pack", to: "/integrations#legal-practice-management" }}
          />
        </div>
      </SectionShell>

      {/* Virtual receptionists — multi-vertical operations */}
      <SectionShell id="virtual-receptionists" bordered>
        <SectionIntro
          eyebrow="Solution · Virtual receptionists & outsourced answering"
          title="One platform for every client you answer for"
          lede="Virtual receptionist operations and outsourced answering shops answer phones for many clients across many industries — legal, medical, financial, property management, and other professional services. Fabric59 is the multi-tenant workspace platform that lets your team do that without juggling tabs."
          className="mb-12"
        />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {VR_CAPABILITIES.map((c) => (
            <CapabilityCard key={c.title} icon={c.icon} title={c.title} body={c.body} />
          ))}
        </div>

        <div className="mt-12 max-w-3xl mx-auto text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary mb-4">
            Verticals
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Legal is the first deep vertical pack. Additional packs are scoped with design partners.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {VERTICALS.map((v) => (
              <span
                key={v.label}
                className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border border-border bg-card/60 text-foreground/80"
              >
                <v.icon className="h-3.5 w-3.5 text-primary" />
                {v.label}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-10">
          <CtaRow
            align="center"
            primary={{ label: "Talk about VR operations", to: "/contact?topic=virtual-receptionist" }}
          />
        </div>
      </SectionShell>

      {MOTIONS.map((m, i) => (
        <SectionShell
          key={m.anchor}
          id={m.anchor}
          muted={i % 2 === 0}
          bordered
        >
          <div className="grid gap-10 lg:grid-cols-[1fr_360px] items-start">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary mb-3">
                {m.eyebrow}
              </p>
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
                {m.title}
              </h2>
              <p className="mt-4 text-base text-muted-foreground leading-relaxed max-w-2xl">
                {m.body}
              </p>
              <p className="mt-6 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Surfaced in · <span className="text-foreground/80">{m.surfacedIn}</span>
              </p>
              <div className="mt-6">
                <CtaRow
                  align="left"
                  primary={{ label: "Talk about this motion", to: `/contact?topic=${m.topic}` }}
                />
              </div>
            </div>
            <CapabilityCard icon={m.icon} title={m.eyebrow} body={m.body} bullets={m.bullets} />
          </div>
        </SectionShell>
      ))}
    </MarketingLayout>
  );
}
