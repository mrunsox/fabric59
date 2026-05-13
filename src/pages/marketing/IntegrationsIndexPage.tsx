import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { SectionIntro } from "@/components/marketing/SectionIntro";
import { CapabilityCard } from "@/components/marketing/CapabilityCard";
import { CtaRow } from "@/components/marketing/CtaRow";
import { ProofStrip } from "@/components/marketing/ProofStrip";
import { integrationsIndexDescription } from "@/seo/marketingMetadata";
import {
  Phone,
  Scale,
  Briefcase,
  MessageSquare,
  Webhook,
  GitBranch,
} from "lucide-react";

/**
 * Phase G — Integrations index.
 * Capability-language tiles only. No status badges, no "Stub" surface.
 * Lifecycle/readiness lives on operational surfaces, not marketing.
 */
const PROVIDERS = [
  {
    icon: Phone,
    title: "Five9 telephony",
    body: "30+ SOAP Admin actions, multi-domain control, Web Connector automation, pre-call ANI lookup, and post-call event ingestion.",
    bullets: [
      "Provisioning, campaigns, skills, profiles, DNIS",
      "Sub-500ms ANI screen pop",
      "Realtime API event log",
    ],
  },
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
    icon: MessageSquare,
    title: "Slack",
    body: "Real-time agent workspace plus post-call notifications routed by disposition urgency.",
    bullets: [
      "Agent workspace channel mgmt",
      "Post-call event notifications",
      "Hub urgency-based routing",
    ],
  },
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

const FOUNDATION = [
  {
    icon: GitBranch,
    title: "One canonical integrations layer",
    body: "Every provider routes through the same integration_providers, integration_connections, and integration_mappings model. New providers slot in without forking the data model.",
  },
];

export default function IntegrationsIndexPage() {
  return (
    <MarketingLayout
      title="Integrations | Fabric59"
      description={integrationsIndexDescription()}
      ctaBanner={
        <section className="py-16 px-6 bg-muted/20">
          <SectionIntro
            title="Need a provider you don't see here?"
            lede="We scope new adapters with design partners. Tell us the system and the workflow you need it for."
            cta={
              <CtaRow
                primary={{ label: "Ask about a provider", to: "/contact" }}
                secondary={{ label: "See solutions", to: "/solutions" }}
              />
            }
          />
        </section>
      }
    >
      <section className="pt-20 pb-4 px-6">
        <SectionIntro
          eyebrow="Integrations"
          title="Five9-native, with the systems you already run"
          lede="Fabric59 is the operational intelligence layer around Five9 that connects into the CRMs, case-management tools, and workflow runners your team already lives in."
        />
      </section>

      <section className="py-12 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {PROVIDERS.map((p) => (
            <CapabilityCard
              key={p.title}
              icon={p.icon}
              title={p.title}
              body={p.body}
              bullets={p.bullets}
            />
          ))}
        </div>

        <div className="max-w-4xl mx-auto mt-16 grid md:grid-cols-1 gap-5">
          {FOUNDATION.map((f) => (
            <CapabilityCard key={f.title} icon={f.icon} title={f.title} body={f.body} />
          ))}
        </div>

        <ProofStrip
          className="mt-16"
          items={[
            "AES-256 credential vault",
            "Per-tenant rate limits",
            "Visual mapping with Test runner",
          ]}
        />
      </section>
    </MarketingLayout>
  );
}
