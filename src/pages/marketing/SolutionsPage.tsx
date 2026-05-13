import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { PageHeader } from "@/components/ui/page-header";
import { SectionIntro } from "@/components/marketing/SectionIntro";
import { CapabilityCard } from "@/components/marketing/CapabilityCard";
import { CtaRow } from "@/components/marketing/CtaRow";
import { ProofStrip } from "@/components/marketing/ProofStrip";
import {
  PhoneIncoming,
  RotateCcw,
  ClipboardCheck,
  GitBranch,
  Activity,
} from "lucide-react";

/**
 * Phase G — Solutions page.
 * 5 canonical operating motions. Capability language only, no readiness badges.
 */
const MOTIONS = [
  {
    icon: PhoneIncoming,
    title: "Inbound intake",
    body: "Sub-500ms ANI lookup, screen pop, decision-tree guides, and disposition-driven CRM writeback the moment the call ends.",
    bullets: [
      "Pre-call ANI lookup with screen pop",
      "Visual decision-tree intake guides",
      "Outcome-routed CRM dispatch",
    ],
  },
  {
    icon: RotateCcw,
    title: "Reactivation campaigns",
    body: "Intake-driven outbound with reverse-engineered campaign blueprints, ANI block lists, and abandon-rate guardrails.",
    bullets: [
      "Campaign orchestration from intake form",
      "Reverse-engineer existing Five9 campaigns",
      "Callback queue + ANI block list",
    ],
  },
  {
    icon: ClipboardCheck,
    title: "QA + agent performance",
    body: "Workspace-scoped QA queue, scoring against shipped scripts, and KPI surfacing for supervisors and ops leads.",
    bullets: [
      "Per-workspace QA review queue",
      "Scorecards aligned to live scripts",
      "Supervisor KPI overview",
    ],
  },
  {
    icon: GitBranch,
    title: "CRM sync + workflow automation",
    body: "Visual field mapping with a Test runner, post-call automations, and workflow dispatch into the systems you already run.",
    bullets: [
      "Visual mapping builder with Test runner",
      "Per-disposition policy: allow / block / redact",
      "Zapier and Make outbound automations",
    ],
  },
  {
    icon: Activity,
    title: "Monitoring + reconciliation",
    body: "Realtime API event streaming, telephony reconciliation against Five9 logs, and audit-grade compliance export.",
    bullets: [
      "Realtime API event log",
      "Telephony ↔ CRM reconciliation",
      "Server-side compliance export bundle",
    ],
  },
];

export default function SolutionsPage() {
  return (
    <MarketingLayout
      title="Solutions | Fabric59"
      description="Five canonical operating motions on Fabric59: inbound intake, reactivation, QA, CRM sync, and monitoring — all on the same Five9-native workspace model."
      ctaBanner={
        <section className="py-16 px-6 bg-muted/20">
          <SectionIntro
            title="Walk through it with us"
            lede="Each motion maps directly onto a workspace surface that already ships. We'll show you exactly how it lands in your Five9 footprint."
            cta={
              <CtaRow
                primary={{ label: "Request a walkthrough", to: "/contact" }}
                secondary={{ label: "See pricing", to: "/pricing" }}
              />
            }
          />
        </section>
      }
    >
      <PageHeader
        eyebrow="Solutions"
        title="Five canonical operating motions on Five9"
        description="Real workflows shipped on the canonical Fabric59 workspace model — not slides, not theme-park demos."
        align="center"
      />

      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {MOTIONS.map((m) => (
            <CapabilityCard
              key={m.title}
              icon={m.icon}
              title={m.title}
              body={m.body}
              bullets={m.bullets}
            />
          ))}
        </div>

        <ProofStrip
          className="mt-16"
          items={[
            "Five9-native by default",
            "Workspace-scoped isolation",
            "Founder-led rollout",
          ]}
        />
      </section>
    </MarketingLayout>
  );
}
