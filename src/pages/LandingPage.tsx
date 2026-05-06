import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SEOHead } from "@/components/seo/SEOHead";
import { StructuredData } from "@/components/seo/StructuredData";
import { MegaMenuHeader } from "@/components/marketing/MegaMenuHeader";
import { MegaFooter } from "@/components/marketing/MegaFooter";
import { motion } from "framer-motion";
import { ScrollToTopButton } from "@/components/layout/ScrollToTopButton";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowRight, ChevronRight, HelpCircle, Phone, Shield, Database,
  Workflow, Scale, GitBranch, GitFork, Building2, FileSearch,
  MessageSquare, Layers, Lock, Sparkles, Clock, Calendar, Bot,
  Globe, Mail, Megaphone,
} from "lucide-react";

// --- Available now (audit-verified shipped capabilities) ---
const availableNow = [
  {
    icon: Phone,
    title: "Deep Five9 SOAP integration",
    desc: "30+ SOAP actions covering agents, campaigns, skills, profiles, DNIS, dispositions, and call variables — wired through a single unified edge function.",
  },
  {
    icon: Globe,
    title: "Multi-domain Five9 management",
    desc: "Manage credentials, IVR settings, and connection tests across multiple Five9 domains with automated domain identifier derivation.",
  },
  {
    icon: Scale,
    title: "Five9 → CRM bridge for legal intake",
    desc: "MyCase live with per-client API key intake. Clio adapter is built and ready to activate when OAuth secrets are provisioned.",
  },
  {
    icon: GitBranch,
    title: "Visual field mapping with Test runner",
    desc: "Drag-and-drop CRM field mapping, transforms, and a real Test runner that executes mappings against live tenant configs.",
  },
  {
    icon: GitFork,
    title: "Decision-tree script builder",
    desc: "React Flow scripting with 22 node types, conditional branching, skip/jump logic, data gates, and a runtime simulator.",
  },
  {
    icon: Building2,
    title: "Multi-tenant org / partner / client hierarchy",
    desc: "Three-level tenancy with config inheritance (Client > Partner > Org), Postgres RLS isolation, and SECURITY DEFINER role checks.",
  },
  {
    icon: Lock,
    title: "Encrypted credentials & audit-grade compliance export",
    desc: "AES-256 / pgcrypto for CRM and Five9 credentials. Server-side compliance export bundles logs, RLS snapshots, and config history.",
  },
  {
    icon: FileSearch,
    title: "API logs & reconciliation",
    desc: "Realtime API event streaming with deduplication and a telephony reconciliation layer comparing Five9 logs against CRM syncs.",
  },
  {
    icon: MessageSquare,
    title: "Slack workspace integration",
    desc: "Real-time Slack provisioning for agent workspaces and post-call event notifications routed by urgency.",
  },
  {
    icon: Megaphone,
    title: "Campaign blueprints & intake automation",
    desc: "Campaign intake form drives automated SOAP API sequences. Blueprints support replicate and reverse-engineer flows.",
  },
];

// --- Coming soon (built but gated, or actively in progress) ---
const comingSoon = [
  { icon: Scale, title: "Clio activation", note: "Adapter shipped — awaiting OAuth credentials." },
  { icon: Bot, title: "AI Call Flow export", note: "Builder previews live; one-click Five9 export in progress." },
  { icon: Mail, title: "Disposition email writebacks", note: "Engine routes emails; CRM writeback hooks landing next." },
  { icon: Building2, title: "Google Workspace provisioning", note: "Schema in place; provisioning flow on the roadmap." },
  { icon: Sparkles, title: "Self-serve billing & plans", note: "Today onboarding is founder-led. Stripe enforcement coming." },
];

// --- Process ---
const processSteps = [
  { icon: Calendar, step: "1", title: "Talk to us", description: "Short scoping call to map your Five9 footprint, CRMs, and intake workflows." },
  { icon: Phone, step: "2", title: "Connect Five9 + your legal stack", description: "We wire your Five9 domain(s), MyCase or Clio, and any required CRMs into Fabric59." },
  { icon: Workflow, step: "3", title: "Roll out agent workflows", description: "Decision-tree scripts, mappings, dispositions, and reconciliation go live with your team." },
];

const faqItems = [
  {
    question: "What is Fabric59?",
    answer: "Fabric59 is a Five9-native control plane and legal-intake bridge. It connects Five9 to legal CRMs (MyCase live today, Clio ready to activate), provides multi-tenant operations for BPOs, and handles agent scripting, mapping, dispositions, reconciliation, and compliance export.",
  },
  {
    question: "How does Fabric59 integrate with Five9?",
    answer: "Through the Five9 SOAP Admin API. Fabric59 ships 30+ SOAP actions for provisioning agents, managing campaigns, skills, profiles, DNIS, and call variables, plus a webhook layer for pre-call ANI lookup and post-call events.",
  },
  {
    question: "Which CRMs are supported today?",
    answer: "MyCase is live using per-client API key intake. The Clio adapter is built and waiting on OAuth activation. Additional CRMs are added on a per-engagement basis through the same adapter pattern.",
  },
  {
    question: "How do I get started?",
    answer: "Onboarding is currently founder-led. Book a walkthrough and we’ll scope your Five9 program, integrations, and rollout together. Self-serve signup and billing will open later.",
  },
  {
    question: "Is Fabric59 secure?",
    answer: "Credentials are encrypted with pgcrypto (AES-256). Tenant data is isolated via Postgres Row-Level Security with SECURITY DEFINER role checks. A server-side compliance export bundles logs, config history, and an RLS snapshot.",
  },
  {
    question: "Do you have SOC 2?",
    answer: "Not yet. We do not claim SOC 2 today. We follow strong baseline controls (encryption at rest, RLS, audit logs, compliance export) and will pursue formal certifications as the business matures.",
  },
];

// --- Structured data ---
const organizationLD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Fabric59",
  url: "https://fabric59.com",
  description: "Five9-native control plane and legal-intake bridge for contact centers and law firms.",
  contactPoint: { "@type": "ContactPoint", email: "hi@fabric59.com", contactType: "customer service" },
  parentOrganization: { "@type": "Organization", name: "UNSOX Digital", url: "https://unsox.com" },
};

const faqLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="Fabric59 — Five9-Native Control Plane & Legal-Intake Bridge"
        description="Fabric59 connects Five9 to legal CRMs (MyCase live, Clio ready), with visual field mapping, decision-tree scripting, multi-tenant ops, and audit-grade compliance export."
        canonical="https://fabric59.com/"
      />
      <StructuredData data={[organizationLD, faqLD]} />

      <MegaMenuHeader />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-20%,hsl(var(--primary)/0.15),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,hsl(var(--accent)/0.08),transparent_50%)]" />
          <div className="absolute inset-0" style={{
            backgroundImage: "radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            opacity: 0.3,
          }} />

          <div className="relative max-w-5xl mx-auto text-center px-6 pt-28 pb-24">
            <motion.div custom={0} initial="hidden" animate="visible" variants={fadeUp}>
              <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-xs tracking-wide uppercase border border-primary/30 bg-primary/10 text-primary">
                Five9 control plane · Legal-intake bridge
              </Badge>
            </motion.div>

            <motion.h1 custom={1} initial="hidden" animate="visible" variants={fadeUp}
              className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6"
            >
              The Five9-native bridge to your{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                legal CRM
              </span>
              .
            </motion.h1>

            <motion.p custom={2} initial="hidden" animate="visible" variants={fadeUp}
              className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
            >
              Fabric59 sits between Five9 and your CRM stack — wiring multi-domain Five9, MyCase (live) and Clio (ready to activate), visual field mapping, agent scripting, and audit-grade reconciliation into one operations platform.
            </motion.p>

            <motion.div custom={3} initial="hidden" animate="visible" variants={fadeUp}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Button size="lg" className="gap-2 text-base px-8 h-12 shadow-lg shadow-primary/20" asChild>
                <Link to="/contact">
                  Request a walkthrough <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="gap-2 text-base px-8 h-12" asChild>
                <a href="#available-now">
                  Explore the platform <ChevronRight className="h-4 w-4" />
                </a>
              </Button>
            </motion.div>

            <motion.div custom={4} initial="hidden" animate="visible" variants={fadeUp}
              className="flex flex-wrap items-center justify-center gap-6 mt-12 text-xs text-muted-foreground"
            >
              <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-primary" /> AES-256 encrypted credentials</span>
              <span className="flex items-center gap-1.5"><Database className="h-3.5 w-3.5 text-primary" /> Row-Level Security</span>
              <span className="flex items-center gap-1.5"><Workflow className="h-3.5 w-3.5 text-primary" /> 30+ Five9 SOAP actions</span>
            </motion.div>
          </div>
        </section>

        {/* Available Now */}
        <section id="available-now" className="py-24 border-t border-border/30">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-14">
              <Badge className="mb-4 bg-primary/10 text-primary border-primary/30">Available now</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-3">What ships today</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Every capability below is live in production for active engagements. No mockups, no vapor.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {availableNow.map((item, i) => (
                <motion.div key={item.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                  <Card className="border-border/50 bg-card/60 h-full hover:border-primary/40 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <item.icon className="h-5 w-5 text-primary" />
                        </div>
                        <Badge variant="secondary" className="text-[10px] uppercase tracking-wide bg-success/10 text-success border-success/30">
                          Available now
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-base mb-2">{item.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Coming Soon */}
        <section id="coming-soon" className="py-20 border-t border-border/30 bg-muted/20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-10">
              <Badge variant="outline" className="mb-4 border-accent/40 text-accent">Coming soon</Badge>
              <h2 className="text-3xl font-bold mb-3">On the roadmap</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Built or partially built — not yet generally available. We’ll only mark these live once they ship.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {comingSoon.map((item) => (
                <Card key={item.title} className="border-dashed border-border/60 bg-background/60">
                  <CardContent className="p-5">
                    <div className="h-9 w-9 rounded-md bg-accent/10 flex items-center justify-center mb-3">
                      <item.icon className="h-4 w-4 text-accent" />
                    </div>
                    <div className="text-sm font-semibold mb-1">{item.title}</div>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-3">{item.note}</p>
                    <span className="text-[10px] uppercase tracking-wider text-accent font-medium">Coming soon</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Five9 + Legal Intake spotlight */}
        <section id="legal-connect" className="py-24 relative overflow-hidden border-t border-border/30">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,hsl(var(--primary)/0.06),transparent_60%)]" />
          <div className="relative max-w-6xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                <Badge className="mb-4 bg-accent/10 text-accent border-accent/30">Five9 → Legal CRM</Badge>
                <h2 className="text-3xl font-bold mb-4">The bridge between your dialer and your case management system</h2>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Agents stay in Five9. Fabric59 handles the rest — pre-call ANI lookup, contact resolution, matter linking, and disposition-driven writebacks against MyCase today, with Clio queued behind a single activation step.
                </p>
                <div className="space-y-4">
                  {[
                    { icon: Phone, text: "Sub-500ms ANI-based pre-call lookup with screen-pop", badge: "Live" },
                    { icon: Scale, text: "MyCase integration via per-client API key intake", badge: "Live" },
                    { icon: Shield, text: "Per-disposition policy: allow / block / redact fields", badge: "Live" },
                    { icon: Globe, text: "Clio adapter — activates on OAuth credential provisioning", badge: "Coming soon" },
                  ].map((item) => (
                    <div key={item.text} className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                        <item.icon className="h-4 w-4 text-accent" />
                      </div>
                      <div className="flex-1 flex items-center justify-between gap-3">
                        <span className="text-sm text-foreground">{item.text}</span>
                        <Badge variant="outline" className={`text-[10px] shrink-0 ${item.badge === "Live" ? "border-success/40 text-success" : "border-accent/40 text-accent"}`}>
                          {item.badge}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                className="aspect-square rounded-2xl bg-gradient-to-br from-accent/10 via-primary/5 to-transparent border border-border/30 flex items-center justify-center"
              >
                <div className="text-center p-8 w-full">
                  <Scale className="h-16 w-16 text-accent/40 mx-auto mb-6" />
                  <div className="space-y-2 max-w-xs mx-auto">
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-card/70 border border-border/40 text-xs text-foreground">
                      <div className="h-2 w-2 rounded-full bg-success" /> Inbound call · ANI matched
                    </div>
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-card/70 border border-border/40 text-xs text-foreground">
                      <div className="h-2 w-2 rounded-full bg-primary" /> MyCase contact resolved
                    </div>
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-card/70 border border-border/40 text-xs text-foreground">
                      <div className="h-2 w-2 rounded-full bg-accent" /> Disposition → CRM writeback
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Multi-tenant + security */}
        <section id="security" className="py-24 border-t border-border/30">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-12">
              <Badge className="mb-4 bg-primary/10 text-primary border-primary/30">Multi-tenant by design</Badge>
              <h2 className="text-3xl font-bold mb-3">Built for agencies, partners, and their clients</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                A three-level hierarchy with config inheritance, hardened isolation, and an export trail you can hand to auditors.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { icon: Layers, title: "Org / Partner / Client", desc: "Configs merge top-down: Client overrides Partner overrides Org defaults." },
                { icon: Database, title: "Postgres RLS isolation", desc: "Every tenant query is fenced with RLS plus SECURITY DEFINER role checks." },
                { icon: Lock, title: "AES-256 credential vault", desc: "Five9 and CRM credentials stored encrypted via pgcrypto." },
                { icon: FileSearch, title: "Audit-grade compliance export", desc: "Server-side bundle of logs, config history, and an RLS snapshot." },
              ].map((item) => (
                <Card key={item.title} className="border-border/50 bg-card/60">
                  <CardContent className="p-6">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-sm mb-2">{item.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Quiet social proof — no fake names */}
        <section className="py-20 border-t border-border/30 bg-muted/20">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <Badge variant="outline" className="mb-4">In active use</Badge>
            <p className="text-2xl md:text-3xl font-medium leading-snug text-foreground">
              “We stopped maintaining glue scripts the day Fabric59 wired Five9 into our intake CRM.”
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              — Operations lead at a legal-intake contact center using Fabric59 today
            </p>
            <p className="text-xs text-muted-foreground/70 mt-3 italic">
              Quote anonymized at the customer’s request. We do not publish fabricated testimonials.
            </p>
          </div>
        </section>

        {/* How we work with you */}
        <section id="how" className="max-w-5xl mx-auto px-6 py-24 border-t border-border/30">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/30">How we work with you</Badge>
            <h2 className="text-3xl font-bold mb-3">Founder-led onboarding, not a self-serve trial</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Today every Fabric59 deployment is scoped and rolled out with you. Self-serve signup opens later.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-7 left-[16.67%] right-[16.67%] h-px bg-gradient-to-r from-primary/30 via-primary/50 to-primary/30" />
            {processSteps.map((s) => (
              <div key={s.step} className="text-center relative">
                <div className="h-14 w-14 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center mx-auto mb-5 relative z-10 bg-background">
                  <s.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Step {s.step}</div>
                <h3 className="font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Early access (replaces pricing) */}
        <section id="pricing" className="py-24 border-t border-border/30 bg-muted/20">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <Badge className="mb-4 bg-accent/10 text-accent border-accent/30">Early access</Badge>
            <h2 className="text-3xl font-bold mb-4">Founder-led pricing, scoped to your program</h2>
            <p className="text-muted-foreground leading-relaxed mb-8">
              We’re not publishing list prices yet. Self-serve billing is on the roadmap. For now, we scope each engagement around your Five9 footprint, CRMs, and rollout timeline — and quote accordingly.
            </p>
            <Button size="lg" className="gap-2" asChild>
              <Link to="/contact">
                Let’s scope your program <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="max-w-3xl mx-auto px-6 py-24 border-t border-border/30">
          <div className="flex items-center justify-center gap-3 mb-10">
            <HelpCircle className="h-6 w-6 text-primary" />
            <h2 className="text-3xl font-bold">FAQ</h2>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-base font-medium">{item.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* Final CTA */}
        <section className="py-24 border-t border-border/30">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to wire Five9 into your CRM stack?</h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Book a walkthrough and we’ll show you exactly what ships today, what’s on the roadmap, and what your rollout would look like.
            </p>
            <Button size="lg" className="gap-2 px-8 h-12 shadow-lg shadow-primary/20" asChild>
              <Link to="/contact">
                Request a walkthrough <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground mt-6 flex items-center justify-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Typical response within one business day
            </p>
          </div>
        </section>
      </main>

      <MegaFooter />
      <ScrollToTopButton />
    </div>
  );
}
