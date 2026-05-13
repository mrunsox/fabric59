import { Phone, Scale, Briefcase, MessageSquare, Webhook, GitBranch } from "lucide-react";
import { MarketingShell as MarketingLayout } from "@/shells/MarketingShell";
import { MarketingHero } from "@/components/marketing/MarketingHero";
import { SectionShell } from "@/components/marketing/SectionShell";
import { SectionIntro } from "@/components/marketing/SectionIntro";
import { CapabilityCard } from "@/components/marketing/CapabilityCard";
import { CtaRow } from "@/components/marketing/CtaRow";
import { ProofStrip } from "@/components/marketing/ProofStrip";
import { integrationsIndexDescription } from "@/seo/marketingMetadata";

/**
 * Phase H — Integrations index.
 * Honest categories. No status badges. No stub tile.
 */
const TELEPHONY = [
  {
    icon: Phone,
    title: "Five9 telephony",
    body: "Multi-domain control via the SOAP Admin API, Web Connector automation, pre-call ANI lookup, and post-call event ingestion.",
    bullets: [
      "Provisioning, campaigns, skills, profiles, DNIS",
      "Sub-500ms ANI screen pop",
      "Realtime API event log",
    ],
  },
];

const LEGAL_CRM = [
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
];

const NOTIFICATIONS = [
  {
    icon: MessageSquare,
    title: "Slack",
    body: "Real-time agent workspace plus post-call notifications routed by disposition urgency.",
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
    body: "Outbound webhooks dispatch into the workflow tools your business already runs.",
    bullets: [
      "Per-workspace webhook targets",
      "Disposition-scoped triggers",
      "Test runner before go-live",
    ],
  },
];

const FOUNDATION = {
  icon: GitBranch,
  title: "One canonical integrations layer",
  body: "Every provider routes through the same integration_providers, integration_connections, and integration_mappings model. New adapters slot in without forking the data model.",
};

function CategoryBlock({
  eyebrow,
  title,
  items,
}: {
  eyebrow: string;
  title: string;
  items: typeof TELEPHONY;
}) {
  return (
    <div>
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground">{title}</h2>
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
            title="Need an adapter you don't see here?"
            lede="We scope new adapters with design partners. Tell us the system and the workflow it has to support."
            cta={
              <CtaRow
                primary={{ label: "Ask about a provider", to: "/contact?topic=integrations" }}
                secondary={{ label: "See solutions", to: "/solutions" }}
              />
            }
          />
        </SectionShell>
      }
    >
      <MarketingHero
        eyebrow="Integrations"
        title="Five9-native, with the systems you already run"
        lede="Telephony lives in Five9. Downstream system-of-record is provider-agnostic by design — Clio first, MyCase next, with an adapter pattern that absorbs the next provider without reshaping the data model."
      />

      <SectionShell bordered>
        <div className="space-y-16">
          <CategoryBlock eyebrow="Telephony" title="The session and event layer" items={TELEPHONY} />
          <CategoryBlock eyebrow="Legal CRM" title="Adapter-based downstream system" items={LEGAL_CRM} />
          <CategoryBlock eyebrow="Notifications" title="Real-time team coordination" items={NOTIFICATIONS} />
          <CategoryBlock eyebrow="Workflow" title="Outbound dispatch" items={WORKFLOW} />
        </div>
      </SectionShell>

      <SectionShell muted bordered>
        <div className="max-w-4xl mx-auto">
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
