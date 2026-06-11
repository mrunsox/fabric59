import { Phone, Scale, Briefcase, MessageSquare, Webhook, GitBranch, Layers, Sparkles } from "lucide-react";
import { MarketingShell as MarketingLayout } from "@/shells/MarketingShell";
import { MarketingHero } from "@/components/marketing/MarketingHero";
import { SectionShell } from "@/components/marketing/SectionShell";
import { SectionIntro } from "@/components/marketing/SectionIntro";
import { CapabilityCard } from "@/components/marketing/CapabilityCard";
import { CtaRow } from "@/components/marketing/CtaRow";
import { ProofStrip } from "@/components/marketing/ProofStrip";
import { integrationsIndexDescription } from "@/seo/marketingMetadata";

/**
 * Phase 3 — Integrations index.
 *
 * Reframed around the in-app "vertical pack" concept. Five9 is the call layer;
 * vertical packs plug into the canonical outcome pipeline:
 *   InteractionRecord → contact/matter match → adapter writeback → notifications.
 *
 * Legal practice management is the first vertical pack live today. More
 * vertical packs (medical EHR, property management, financial/CRM, etc.) are
 * on the roadmap and listed as a "More integration packs coming" tile.
 */

const TELEPHONY = [
  {
    icon: Phone,
    title: "Five9 telephony",
    body: "The call layer. Multi-domain control via the SOAP Admin API, Web Connector automation, pre-call ANI lookup, and post-call event ingestion. Call handling stays in Five9 — Fabric59 orchestrates everything around the call.",
    bullets: [
      "Provisioning, campaigns, skills, profiles, DNIS",
      "Sub-500ms ANI screen pop",
      "Realtime API event log",
    ],
  },
];

const LEGAL_PACK = [
  {
    icon: Scale,
    title: "MyCase",
    body: "Per-client API key intake. Contact and matter writeback driven by call dispositions, with idempotent sync jobs.",
    bullets: [
      "Contact + matter resolution",
      "Disposition-driven writeback",
      "Telephony reconciliation",
    ],
  },
  {
    icon: Scale,
    title: "Clio Grow",
    body: "Lead Inbox MVP via the clio-grow edge function. Idempotent sync jobs land new leads from intake outcomes.",
    bullets: [
      "Lead Inbox dispatch",
      "Idempotent sync workers",
      "Per-disposition routing rules",
    ],
  },
  {
    icon: Briefcase,
    title: "Clio Manage",
    body: "Adapter shipped. Activates on OAuth credential provisioning so writebacks flow into the firm's case file.",
    bullets: [
      "OAuth credential lifecycle",
      "Capability fallbacks for missing endpoints",
      "Mappable to existing matter schemas",
    ],
  },
  {
    icon: Scale,
    title: "Smokeball",
    body: "On the roadmap. Joins the legal practice management pack alongside Clio and MyCase via the same adapter pattern.",
    bullets: [
      "Roadmap — design partner scoping",
      "Same canonical outcome pipeline",
      "Per-firm credential isolation",
    ],
  },
];

const FUTURE_PACKS = [
  {
    icon: Sparkles,
    title: "More integration packs coming",
    body: "Vertical packs for medical EHR, property management, financial/CRM, and other professional services are scoped with design partners. Each pack plugs into the same outcome pipeline as legal — interaction record, contact match, adapter writeback, notifications.",
    bullets: [
      "Medical EHR pack — roadmap",
      "Property management pack — roadmap",
      "Financial / CRM pack — roadmap",
    ],
  },
];

const NOTIFICATIONS = [
  {
    icon: MessageSquare,
    title: "Slack",
    body: "Real-time agent workspace plus post-call notifications routed by disposition urgency, per client workspace.",
    bullets: [
      "Agent workspace channel management",
      "Post-call event notifications",
      "Hub urgency-based routing",
    ],
  },
];

const WORKFLOW = [
  {
    icon: Webhook,
    title: "Zapier + Make",
    body: "Outbound webhooks dispatch into the workflow tools each of your clients already runs.",
    bullets: [
      "Per-workspace webhook targets",
      "Disposition-scoped triggers",
      "Test runner before go-live",
    ],
  },
];

const OUTCOME_PIPELINE = {
  icon: GitBranch,
  title: "Every pack plugs into the same outcome pipeline",
  body: "InteractionRecord → contact / matter match → adapter writeback → notifications. Whether the system of record is a legal case management tool today or a medical EHR tomorrow, the route from call to outcome to write-back is identical.",
};

const FOUNDATION = {
  icon: Layers,
  title: "One canonical integrations layer",
  body: "Every provider routes through the same integration_providers, integration_connections, and integration_mappings model. New vertical packs slot in without forking the data model.",
};

function CategoryBlock({
  eyebrow,
  title,
  lede,
  items,
  id,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  items: typeof TELEPHONY;
  id?: string;
}) {
  return (
    <div id={id}>
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground">{title}</h2>
        {lede && <p className="mt-3 text-sm text-muted-foreground max-w-2xl">{lede}</p>}
      </div>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <CapabilityCard key={p.title} icon={p.icon} title={p.title} body={p.body} bullets={p.bullets} />
        ))}
      </div>
    </div>
  );
}

export default function IntegrationsIndexPage() {
  return (
    <MarketingLayout
      title="Integrations | Fabric59"
      description={integrationsIndexDescription()}
      ctaBanner={
        <SectionShell>
          <SectionIntro
            title="Need a vertical pack you don't see here?"
            lede="We scope new packs and adapters with design partners. Tell us the vertical, the system of record, and the workflow it has to support."
            cta={
              <CtaRow
                primary={{ label: "Ask about a pack", to: "/contact?topic=integrations" }}
                secondary={{ label: "See solutions", to: "/solutions" }}
              />
            }
          />
        </SectionShell>
      }
    >
      <MarketingHero
        eyebrow="Integrations"
        title="Five9 telephony plus vertical integration packs"
        lede="Five9 handles the call. Vertical packs handle the writeback into each client's system of record. Legal practice management is live today — more packs are on the way."
      />

      <SectionShell bordered>
        <div className="space-y-16">
          <CategoryBlock
            eyebrow="Telephony"
            title="The call layer"
            items={TELEPHONY}
          />

          {/* Vertical integration packs — primary frame */}
          <div id="vertical-packs" className="space-y-12">
            <SectionIntro
              align="left"
              eyebrow="Vertical integration packs"
              title="Grouped by the system your clients actually live in"
              lede="Each pack is a tested set of adapters for one vertical. Legal practice management ships first because most outsourced answering services start there. New packs land alongside it as we scope them with design partners."
            />
            <CategoryBlock
              eyebrow="Pack · Live"
              title="Legal practice management"
              lede="The first vertical pack live today. Covers Clio, MyCase, and Smokeball (roadmap)."
              items={LEGAL_PACK}
              id="legal-practice-management"
            />
            <CategoryBlock
              eyebrow="Roadmap"
              title="More integration packs coming"
              lede="Additional vertical packs are scoped with design partners. Each new pack plugs into the same canonical outcome pipeline."
              items={FUTURE_PACKS}
              id="more-packs"
            />
          </div>

          <CategoryBlock
            eyebrow="Notifications"
            title="Real-time team coordination"
            items={NOTIFICATIONS}
          />
          <CategoryBlock
            eyebrow="Workflow"
            title="Outbound dispatch"
            items={WORKFLOW}
          />
        </div>
      </SectionShell>

      <SectionShell muted bordered>
        <div className="max-w-4xl mx-auto space-y-6">
          <CapabilityCard icon={OUTCOME_PIPELINE.icon} title={OUTCOME_PIPELINE.title} body={OUTCOME_PIPELINE.body} />
          <CapabilityCard icon={FOUNDATION.icon} title={FOUNDATION.title} body={FOUNDATION.body} />
          <ProofStrip
            className="mt-12"
            items={[
              "AES-256 credential vault",
              "Per-tenant rate limits",
              "Visual mapping with Test runner",
            ]}
          />
        </div>
      </SectionShell>
    </MarketingLayout>
  );
}
