import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, GitBranch, Bot, Megaphone, Scale, CheckCircle2, Phone,
  Globe, GitFork, Building2, Lock, FileSearch, MessageSquare, UserCog, Mail,
  UserSearch, ListChecks, Target, BellRing,
} from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";
import { StructuredData } from "@/components/seo/StructuredData";
import { MegaMenuHeader } from "@/components/marketing/MegaMenuHeader";
import { MegaFooter } from "@/components/marketing/MegaFooter";
import {
  organizationLD,
  productOverviewDescription,
  softwareApplicationLD,
} from "@/seo/marketingMetadata";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Status = "Live" | "Partial" | "Coming soon";

type Section = {
  id: string;
  icon: typeof Phone;
  badge: string;
  status: Status;
  title: string;
  body: string;
  bullets: string[];
  technical?: string[];
};

// Order mirrors LandingPage `availableNow`, then Partial, then Coming soon —
// titles and status tags stay 1:1 with the landing-page audit baseline.
const sections: Section[] = [
  {
    id: "five9",
    icon: Phone,
    badge: "Five9 SOAP",
    status: "Live",
    title: "Deep Five9 SOAP integration",
    body: "Fabric59 wraps the Five9 SOAP Admin API behind one unified edge function. 30+ live actions cover the full lifecycle of agents, campaigns, skills, profiles, DNIS, dispositions, and call variables.",
    bullets: [
      "30+ live SOAP actions across WsAdminService v13",
      "Single five9-main edge function with audit logging and dedupe",
      "ANI-based pre-call lookup with sub-500ms screen-pops",
    ],
    technical: [
      "WsAdminService SOAP v13 schema alignment",
      "Event dedupe key: callId + tenantId + disposition",
      "Per-tenant Five9 credentials encrypted with pgcrypto",
    ],
  },
  {
    id: "domains",
    icon: Globe,
    badge: "Multi-domain Five9",
    status: "Live",
    title: "Multi-domain Five9 management",
    body: "Manage credentials, IVR settings, and connection tests across multiple Five9 domains from one console. Domain identifiers are derived automatically from configured credentials.",
    bullets: [
      "Per-domain credentials and IVR settings",
      "Live connection-test endpoints per domain",
      "Automated Five9 domain identifier derivation",
    ],
    technical: [
      "Pabbly proxy bridge for Five9 admin authentication",
      "Five9 Web Connector registration automated per domain",
      "Disconnect-domain safeguards before credential rotation",
    ],
  },
  {
    id: "legal",
    icon: Scale,
    badge: "Legal Connect",
    status: "Live",
    title: "Five9 → legal CRM bridge",
    body: "Pre-call ANI lookup matches contacts and resolves matters before the agent says hello. Disposition outcomes drive CRM writebacks under a per-campaign policy engine that enforces field-level allow, block, and redact rules. MyCase is live; Clio Grow Lead Inbox shipped as MVP via the clio-grow edge function with idempotent sync jobs. The full Clio Manage adapter is queued behind OAuth provisioning.",
    bullets: [
      "MyCase live via per-client API-key intake",
      "Clio Grow Lead Inbox MVP — live via clio-grow edge function",
      "Clio Manage adapter — activates on OAuth provisioning",
      "Per-disposition policy engine with field-level rules",
    ],
    technical: [
      "Adapter pattern: five9-main dispatches to Clio / MyCase",
      "Clio webhook fast-ack pattern for sync reliability",
      "MyCase capability fallbacks where API support is missing",
      "identity_xrefs table maps Five9 ↔ CRM contacts/matters",
    ],
  },
  {
    id: "mappings",
    icon: GitBranch,
    badge: "Field Mapping",
    status: "Live",
    title: "Visual field mapping with a real Test runner",
    body: "Drag a Five9 field to a CRM destination, attach transforms for formatting or normalization, then run a real Test execution against the client config before publishing.",
    bullets: [
      "Drag-and-drop React Flow canvas",
      "Reusable transforms (format, normalize, default)",
      "Real Test runner — executes mappings against live client configs",
    ],
    technical: [
      "Mappings stored as JSONB on tenants.integration_configs",
      "Test runner uses runMappingTest with sample CRM payloads",
      "Config inheritance: Client overrides Partner overrides Org",
    ],
  },
  {
    id: "scripts",
    icon: GitFork,
    badge: "Agent Scripts",
    status: "Live",
    title: "Decision-tree agent script builder",
    body: "React Flow scripting with 22 unified node types, conditional branching, skip and jump logic, data gates, and a runtime simulator. Designed for agents working live in Five9 Desktop.",
    bullets: [
      "22 unified CustomNode types in one canvas",
      "Conditional branching, skip/jump, data gates",
      "Runtime simulator + interactive call-flow playback for QA",
    ],
    technical: [
      "Mandatory worksheet completion enforced via agentMustCompleteWorksheet",
      "Script sessions tracked independently from telephony sessions",
      "AI-assisted node suggestions inside the builder",
    ],
  },
  {
    id: "tenancy",
    icon: Building2,
    badge: "Multi-tenant",
    status: "Live",
    title: "Org / Partner / Client hierarchy with RLS",
    body: "Three-level tenancy with config inheritance — Client overrides Partner overrides Org. Postgres Row-Level Security plus SECURITY DEFINER role checks fence every tenant query.",
    bullets: [
      "Three-level config inheritance",
      "Postgres RLS isolation on every table",
      "SECURITY DEFINER role checks (no recursion in policies)",
    ],
    technical: [
      "Views use security_invoker = true to honor caller RLS",
      "Secondary org_id filters in queries as defense-in-depth",
      "Multi-org membership with switching in AuthContext",
    ],
  },
  {
    id: "security",
    icon: Lock,
    badge: "Security & Audit",
    status: "Live",
    title: "Encrypted credentials and audit-grade compliance export",
    body: "Five9 and CRM credentials are encrypted with pgcrypto (AES-256). A server-side compliance export bundles API logs, an RLS snapshot, and config history for auditors. SOC 2 is not claimed.",
    bullets: [
      "AES-256 credential vault (pgcrypto)",
      "Server-side compliance export bundle",
      "Immutable audit log of admin actions",
    ],
    technical: [
      "Master-admin bypass with granular permission checks",
      "Inbound webhook security via x-webhook-secret headers",
      "Credential lifecycle safeguards on disconnect",
    ],
  },
  {
    id: "logs",
    icon: FileSearch,
    badge: "API logs & reconciliation",
    status: "Live",
    title: "Realtime API logs and telephony reconciliation",
    body: "Stream API events in real time with deduplication. The reconciliation layer compares Five9 telephony logs against CRM syncs to surface drift before it becomes a billing or compliance issue.",
    bullets: [
      "Realtime API event stream (Supabase Realtime)",
      "Event deduplication on callId + tenant + disposition",
      "Five9 ↔ CRM telephony reconciliation reports",
    ],
    technical: [
      "Normalized usage + summary views (data-plane contracts)",
      "disposition_access controls reporting visibility",
      "Operational outage-mode pause controls",
    ],
  },
  {
    id: "slack",
    icon: MessageSquare,
    badge: "Slack",
    status: "Live",
    title: "Slack workspace integration",
    body: "Real-time Slack provisioning for agent workspaces and post-call notifications routed by urgency. No middleware email logic — Slack is the operational notification channel.",
    bullets: [
      "Workspace provisioning + member sync",
      "Urgency-based post-call notification routing",
      "Hub routes events to the right Slack channel automatically",
    ],
    technical: [
      "Connector uses standard_connectors with rotated tokens",
      "Notification routing decides channel by urgency tier",
      "No email notification logic in middleware (by design)",
    ],
  },
  {
    id: "campaigns",
    icon: Megaphone,
    badge: "Campaign Blueprints",
    status: "Live",
    title: "Campaign blueprints and intake automation",
    body: "A single intake form drives the provisioning sequence — campaigns, skills, profiles, DNIS, dispositions, ANI block lists, and queue-callback rules. Blueprints support replicate and reverse-engineer flows from existing Five9 setups.",
    bullets: [
      "Intake-form-driven SOAP automation",
      "ANI block lists via ModifyCampaignProfile",
      "Replicate or reverse-engineer existing campaigns",
    ],
    technical: [
      "Queue-callback automation with wait-time thresholds",
      "Abandon-rate reduction engine injects automated callbacks",
      "Campaign archiving for safe decommissioning",
    ],
  },

  // ---- Partial ----
  {
    id: "agents",
    icon: UserCog,
    badge: "Agent Provisioning",
    status: "Partial",
    title: "Agent provisioning across Five9 + Slack",
    body: "Provision agents into Five9 and Slack workspaces from a single form, with audit logging on every step. Google Workspace provisioning is on the roadmap.",
    bullets: [
      "Five9 agent provisioning — live",
      "Slack workspace provisioning — live",
      "Google Workspace provisioning — coming soon",
    ],
    technical: [
      "Privacy-first agent emails: firstlastinitial@domain.com",
      "Quick Provision auto-credentials with naming policy",
      "Hard-delete during deprovisioning (no soft-delete drift)",
    ],
  },
  {
    id: "dispositions",
    icon: Mail,
    badge: "Disposition Engine",
    status: "Partial",
    title: "Disposition email engine + CRM writebacks",
    body: "Branded per-disposition email routing is live today, including partner-level white-label overrides. CRM writebacks driven by disposition outcomes are landing next.",
    bullets: [
      "Per-disposition branded emails — live",
      "Partner-level white-label email template overrides — live",
      "CRM writeback hooks — coming soon",
    ],
    technical: [
      "Gated call reporting limited by disposition_access",
      "Post-call automation engine fans out by outcome",
      "Five9 prompt selection restricted to intake-defined set",
    ],
  },

  // ---- Coming soon ----
  {
    id: "callflow",
    icon: Bot,
    badge: "AI Call Flow Builder",
    status: "Coming soon",
    title: "AI Call Flow builder with one-click Five9 export",
    body: "Chat-driven call flow design with a runtime preview is in place. One-click export to Five9 IVR is in active development.",
    bullets: [
      "Chat-driven flow design — preview",
      "Interactive call-flow simulator — preview",
      "One-click Five9 IVR export — coming soon",
    ],
    technical: [
      "Alex AI persona drives CRM-aware setup prompts",
      "Deterministic templated outputs for legal-connect tooling",
    ],
  },
];

const statusStyle: Record<Status, string> = {
  Live: "bg-success/10 text-success border-success/30",
  Partial: "bg-primary/10 text-primary border-primary/30",
  "Coming soon": "bg-accent/10 text-accent border-accent/30",
};

const QUESTION_FRAMING = [
  {
    icon: UserSearch,
    title: "Who called?",
    body: "Workspace + campaign context, multi-tenant client separation, pre-call ANI lookup, screen pop with caller identity and prior history.",
    surfaces: "Five9 SOAP integration · Multi-domain Five9 · Org / Partner / Client tenancy",
  },
  {
    icon: ListChecks,
    title: "What happened on the call?",
    body: "Decision-tree agent guides with conditional branching, structured form capture, AI summaries, and an interactive runtime simulator for QA.",
    surfaces: "Decision-tree script builder · Visual field mapping · Agent provisioning",
  },
  {
    icon: Target,
    title: "What was the outcome?",
    body: "Dispositions, urgency selectors, gated reporting, and a per-disposition policy engine with field-level allow / block / redact rules.",
    surfaces: "Disposition engine · Campaign blueprints · API logs & reconciliation",
  },
  {
    icon: BellRing,
    title: "Who needs to be notified?",
    body: "System-of-record write-back through vertical packs (legal practice management today), Slack routing by urgency, Zapier/Make webhooks, exception queues.",
    surfaces: "Legal Connect (Clio + MyCase) · Slack · Encrypted credentials & audit",
  },
];

export default function ProductTourPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="Product Overview — Fabric59"
        description={productOverviewDescription()}
        canonical="https://fabric59.com/product"
        ogTitle="Fabric59 Product Overview — the brain between Five9 and your client's system of record"
      />
      <StructuredData data={[organizationLD, softwareApplicationLD()]} />

      <MegaMenuHeader />

      <main>
        <section className="py-20 text-center max-w-3xl mx-auto px-6">
          <Badge variant="secondary" className="mb-4 border border-primary/30 bg-primary/10 text-primary">
            Product overview
          </Badge>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            Five9 handles the call. Fabric59 is the brain.
          </h1>
          <p className="text-muted-foreground text-lg mb-3">
            Your client's system of record holds the outcome. Fabric59 structures every call your agents take around four questions — and routes the answers into the right place.
          </p>
          <p className="text-muted-foreground text-sm mb-6">
            Built for outsourced answering services and virtual receptionist providers. Multi-vertical by design, with a deep legal practice management pack live today. Every capability below is tagged Live, Partial, or Coming soon based on what is actually in production.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="text-xs px-3 py-1.5 rounded-full bg-muted/50 border border-border hover:border-primary/40 hover:text-primary transition-colors inline-flex items-center gap-2"
              >
                {s.badge}
                <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${statusStyle[s.status]}`}>
                  {s.status}
                </span>
              </a>
            ))}
          </div>
        </section>

        {/* Four-question framing — the spine of the product */}
        <section className="max-w-5xl mx-auto px-6 pb-16">
          <div className="mb-10 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
              The four questions
            </div>
            <h2 className="text-3xl font-bold tracking-tight">
              Fabric59 structures every call around four questions
            </h2>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
              Fabric59 is not a phone system. It is not a practice management suite. It is the workflow layer between Five9 and your client's system of record — legal practice management today (Clio, MyCase, Smokeball roadmap), more vertical packs to come.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {QUESTION_FRAMING.map((q) => (
              <Card key={q.title} className="border-border/60">
                <CardContent className="p-6">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 ring-1 ring-primary/15">
                    <q.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight">{q.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{q.body}</p>
                  <p className="mt-4 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Surfaces · <span className="text-foreground/80 normal-case tracking-normal">{q.surfaces}</span>
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <div className="max-w-5xl mx-auto px-6 pb-20 space-y-16">
          {sections.map((s, i) => (
            <motion.section
              key={s.id}
              id={s.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="grid md:grid-cols-2 gap-10 items-center scroll-mt-24"
            >
              <div className={i % 2 === 1 ? "md:order-2" : ""}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    <s.icon className="h-3.5 w-3.5" /> {s.badge}
                  </div>
                  <Badge variant="outline" className={`text-[10px] uppercase tracking-wide ${statusStyle[s.status]}`}>
                    {s.status}
                  </Badge>
                </div>
                <h2 className="text-3xl font-bold mb-3">{s.title}</h2>
                <p className="text-muted-foreground mb-4 leading-relaxed">{s.body}</p>
                <ul className="space-y-2">
                  {s.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                {s.technical && s.technical.length > 0 && (
                  <div className="mt-5 rounded-lg border border-border/60 bg-muted/30 p-4">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                      Under the hood
                    </div>
                    <ul className="space-y-1.5">
                      {s.technical.map((t) => (
                        <li key={t} className="text-xs text-muted-foreground leading-relaxed flex gap-2">
                          <span className="text-primary mt-0.5">›</span>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <Card className={i % 2 === 1 ? "md:order-1" : ""}>
                <CardContent className="p-8 aspect-video flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5">
                  <s.icon className="h-20 w-20 text-primary/30" />
                </CardContent>
              </Card>
            </motion.section>
          ))}
        </div>

        <section className="py-16 text-center bg-muted/30">
          <h2 className="text-3xl font-bold mb-3">Want to see it on your stack?</h2>
          <p className="text-muted-foreground mb-6">Onboarding is founder-led. We'll scope your Five9 program and integrations together.</p>
          <Button size="lg" asChild>
            <Link to="/contact">Request a walkthrough <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </section>
      </main>

      <MegaFooter />
    </div>
  );
}
