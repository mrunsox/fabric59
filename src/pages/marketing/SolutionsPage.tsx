import {
  PhoneIncoming,
  RotateCcw,
  ClipboardCheck,
  GitBranch,
  Activity,
} from "lucide-react";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { MarketingHero } from "@/components/marketing/MarketingHero";
import { SectionShell } from "@/components/marketing/SectionShell";
import { SectionIntro } from "@/components/marketing/SectionIntro";
import { CapabilityCard } from "@/components/marketing/CapabilityCard";
import { CtaRow } from "@/components/marketing/CtaRow";

/**
 * Phase H — Solutions page.
 *
 * Anchored sections per canonical operating motion. Each section maps to a
 * real workspace surface and routes its CTA to /contact?topic=<slug>.
 */

const MOTIONS = [
  {
    anchor: "inbound-intake",
    icon: PhoneIncoming,
    eyebrow: "Inbound intake",
    title: "Capture every inbound call as structured intake",
    body: "Pre-call ANI lookup matches the caller before screen pop. Decision-tree guides walk the agent through scoring and qualification. Disposition routes the result into the downstream system the moment the call ends.",
    bullets: [
      "Sub-500ms ANI lookup with screen pop",
      "Decision-tree guides edited inside the workspace",
      "Outcome-routed CRM dispatch per disposition",
    ],
    surfacedIn: "Workspace · Guides, Forms, Campaigns, QA",
    topic: "inbound-intake",
  },
  {
    anchor: "outbound-reactivation",
    icon: RotateCcw,
    eyebrow: "Outbound reactivation",
    title: "Win-back motions without spreadsheet ops",
    body: "Reverse-engineer existing Five9 campaigns into reusable blueprints. Configure callback queues, abandon-rate guardrails, and ANI block lists from one workspace.",
    bullets: [
      "Campaign blueprints replicated across workspaces",
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
    title: "QA scored against the script you actually shipped",
    body: "Workspace-scoped review queue with scorecards bound to live decision-tree guides. Supervisors push script changes without filing a ticket.",
    bullets: [
      "Per-workspace QA review queue",
      "Scorecards bound to live guides",
      "Supervisor live-ops view",
    ],
    surfacedIn: "Workspace · QA, Analytics",
    topic: "qa-review",
  },
  {
    anchor: "crm-sync-handoff",
    icon: GitBranch,
    eyebrow: "CRM sync and handoff",
    title: "One canonical adapter layer for downstream systems",
    body: "Visual field mapping with a Test runner before any adapter goes live. Per-disposition policy controls allow / block / redact behavior. Workflow webhooks dispatch into Zapier and Make.",
    bullets: [
      "Visual mapping builder with Test runner",
      "Per-disposition policy: allow / block / redact",
      "Outbound Zapier and Make dispatch",
    ],
    surfacedIn: "Workspace · Integrations, Settings",
    topic: "crm-sync",
  },
  {
    anchor: "monitoring-readiness",
    icon: Activity,
    eyebrow: "Monitoring and readiness",
    title: "Pilot readiness, not a status page",
    body: "Telephony reconciliation against Five9 logs, per-tenant rate limits, tenant health, and a shared GA readiness checklist coordinate every pilot from kickoff through go-live.",
    bullets: [
      "Telephony reconciliation vs Five9 logs",
      "Per-tenant rate limits and tenant health",
      "Shared GA readiness checklist",
    ],
    surfacedIn: "Admin · Connectors, Reports, Settings",
    topic: "monitoring",
  },
];

export default function SolutionsPage() {
  return (
    <MarketingLayout
      title="Solutions | Fabric59"
      description="Five canonical operating motions on Fabric59: inbound intake, outbound reactivation, QA, CRM sync, and monitoring."
      ctaBanner={
        <SectionShell>
          <SectionIntro
            title="Map a motion to your operation"
            lede="We will walk through the motion in your Five9 footprint and your downstream system, on a working call."
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
        title="Five operating motions on one workspace"
        lede="Real workflows shipped on the canonical Fabric59 workspace model. Each motion lands in a workspace surface that already exists."
      />

      {MOTIONS.map((m, i) => (
        <SectionShell
          key={m.anchor}
          id={m.anchor}
          muted={i % 2 === 1}
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
