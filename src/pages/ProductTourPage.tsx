import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, GitBranch, Bot, Megaphone, Scale, CheckCircle2, Phone,
  Globe, GitFork, Building2, Lock, FileSearch, MessageSquare, UserCog, Mail,
} from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";
import { MegaMenuHeader } from "@/components/marketing/MegaMenuHeader";
import { MegaFooter } from "@/components/marketing/MegaFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Status = "Live" | "Partial" | "Coming soon";

const sections: {
  id: string;
  icon: typeof Phone;
  badge: string;
  status: Status;
  title: string;
  body: string;
  bullets: string[];
}[] = [
  {
    id: "five9",
    icon: Phone,
    badge: "Five9 SOAP",
    status: "Live",
    title: "Deep Five9 SOAP integration",
    body: "Fabric59 talks to Five9 through a unified edge function that wraps the Five9 SOAP Admin API. 30+ live actions cover the lifecycle of agents, campaigns, skills, profiles, DNIS, dispositions, and call variables.",
    bullets: [
      "30+ live SOAP actions",
      "Unified five9-main edge function with dedup and audit logging",
      "ANI-based pre-call lookup with sub-500ms screen-pops",
    ],
  },
  {
    id: "domains",
    icon: Globe,
    badge: "Multi-domain Five9",
    status: "Live",
    title: "Multi-domain Five9 management",
    body: "Manage credentials, IVR settings, and connection tests across multiple Five9 domains. Domain identifiers are derived automatically from configured credentials.",
    bullets: [
      "Per-domain credentials and IVR settings",
      "Live connection testing",
      "Automated domain identifier derivation",
    ],
  },
  {
    id: "legal",
    icon: Scale,
    badge: "Legal Connect",
    status: "Live",
    title: "Five9 → legal CRM bridge",
    body: "Pre-call ANI lookup matches contacts and resolves matters before the agent says hello. Disposition outcomes drive CRM writebacks under a policy engine that enforces field-level allow, block, and redact rules per campaign. MyCase is live; Clio is built and queued behind activation.",
    bullets: [
      "MyCase via per-client API key intake (live)",
      "Clio adapter built; activates on OAuth provisioning (coming soon)",
      "Per-disposition policy engine with field-level rules",
    ],
  },
  {
    id: "mappings",
    icon: GitBranch,
    badge: "Field Mapping",
    status: "Live",
    title: "Visual field mapping with a real Test runner",
    body: "Drag a Five9 field to a CRM destination, add transforms if you need formatting or normalization, then run a real Test execution against the tenant config before publishing.",
    bullets: [
      "Drag-and-drop canvas",
      "Reusable transforms",
      "Real Test runner against tenant configs",
    ],
  },
  {
    id: "scripts",
    icon: GitFork,
    badge: "Agent Scripts",
    status: "Live",
    title: "Decision-tree agent script builder",
    body: "React Flow scripting with 22 node types, conditional branching, skip and jump logic, data gates, and a runtime simulator. Built for agents working in Five9 Desktop.",
    bullets: [
      "22 unified node types",
      "Conditional branching, skip/jump, data gates",
      "Runtime simulator for QA",
    ],
  },
  {
    id: "tenancy",
    icon: Building2,
    badge: "Multi-tenant",
    status: "Live",
    title: "Org / Partner / Client hierarchy with RLS",
    body: "Three-level tenancy with config inheritance: Client overrides Partner overrides Org. Postgres Row-Level Security plus SECURITY DEFINER role checks fence every tenant query.",
    bullets: [
      "Three-level config inheritance",
      "Postgres RLS isolation",
      "SECURITY DEFINER role checks",
    ],
  },
  {
    id: "security",
    icon: Lock,
    badge: "Security & Audit",
    status: "Live",
    title: "Encrypted credentials and compliance export",
    body: "Five9 and CRM credentials are encrypted with pgcrypto (AES-256). A server-side compliance export bundles logs, an RLS snapshot, and config history for auditors.",
    bullets: [
      "AES-256 credential vault",
      "Server-side compliance export",
      "Immutable audit log",
    ],
  },
  {
    id: "logs",
    icon: FileSearch,
    badge: "API logs & reconciliation",
    status: "Live",
    title: "Realtime API logs and telephony reconciliation",
    body: "Stream API events in real time with deduplication. The reconciliation layer compares Five9 telephony logs against CRM syncs to catch drift.",
    bullets: [
      "Realtime API event stream",
      "Event deduplication (callId + tenant + disposition)",
      "Five9 ↔ CRM reconciliation",
    ],
  },
  {
    id: "agents",
    icon: UserCog,
    badge: "Agent Provisioning",
    status: "Partial",
    title: "Agent provisioning across Five9 + Slack",
    body: "Provision agents into Five9 and Slack workspaces from a single form, with audit logging on every step. Google Workspace provisioning is on the roadmap.",
    bullets: [
      "Five9 agent provisioning (live)",
      "Slack workspace provisioning (live)",
      "Google Workspace provisioning (coming soon)",
    ],
  },
  {
    id: "campaigns",
    icon: Megaphone,
    badge: "Campaign Blueprints",
    status: "Live",
    title: "Campaign blueprints and intake automation",
    body: "A single intake form drives the provisioning sequence — campaigns, skills, profiles, DNIS, dispositions. Blueprints support replicate and reverse-engineer flows.",
    bullets: [
      "Intake-form-driven SOAP automation",
      "Per-disposition email routing",
      "Replicate and reverse-engineer existing campaigns",
    ],
  },
  {
    id: "slack",
    icon: MessageSquare,
    badge: "Slack",
    status: "Live",
    title: "Slack workspace integration",
    body: "Real-time Slack provisioning for agent workspaces and post-call notifications routed by urgency.",
    bullets: [
      "Workspace provisioning",
      "Urgency-based post-call notifications",
    ],
  },
  {
    id: "callflow",
    icon: Bot,
    badge: "AI Call Flow Builder",
    status: "Coming soon",
    title: "AI Call Flow builder with one-click Five9 export",
    body: "Chat-driven call flow design with a runtime preview is in place. One-click export to Five9 is in progress.",
    bullets: [
      "Chat-driven flow design (preview)",
      "Interactive simulator (preview)",
      "One-click Five9 export (coming soon)",
    ],
  },
  {
    id: "dispositions",
    icon: Mail,
    badge: "Disposition Engine",
    status: "Partial",
    title: "Disposition email engine + CRM writebacks",
    body: "Branded per-disposition email routing is live today. CRM writebacks driven by disposition are landing next.",
    bullets: [
      "Per-disposition branded emails (live)",
      "CRM writeback hooks (coming soon)",
    ],
  },
];

const statusStyle: Record<Status, string> = {
  Live: "bg-success/10 text-success border-success/30",
  Partial: "bg-primary/10 text-primary border-primary/30",
  "Coming soon": "bg-accent/10 text-accent border-accent/30",
};

export default function ProductTourPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="Product Tour | Fabric59"
        description="A truth-based walkthrough of Fabric59 capabilities — what ships today and what's on the roadmap."
        canonical="https://fabric59.com/product"
      />

      <MegaMenuHeader />

      <main>
        <section className="py-20 text-center max-w-3xl mx-auto px-6">
          <Badge variant="secondary" className="mb-4 border border-primary/30 bg-primary/10 text-primary">
            Product tour
          </Badge>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            Every capability, with an honest status tag
          </h1>
          <p className="text-muted-foreground text-lg mb-6">
            Each section below is tagged Live, Partial, or Coming soon — based on what is actually in production today.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="text-xs px-3 py-1.5 rounded-full bg-muted/50 border border-border hover:border-primary/40 hover:text-primary transition-colors"
              >
                {s.badge}
              </a>
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
