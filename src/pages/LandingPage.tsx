import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SEOHead } from "@/components/seo/SEOHead";
import { StructuredData } from "@/components/seo/StructuredData";
import { MegaMenuHeader } from "@/components/marketing/MegaMenuHeader";
import { MegaFooter } from "@/components/marketing/MegaFooter";
import { LogoCarousel } from "@/components/marketing/LogoCarousel";
import { FeatureTabs } from "@/components/marketing/FeatureTabs";
import { StatsCounter } from "@/components/marketing/StatsCounter";
import { TestimonialCards } from "@/components/marketing/TestimonialCards";
import { LeadCaptureBar } from "@/components/marketing/LeadCaptureBar";
import { motion } from "framer-motion";
import {
  ArrowRight, ChevronRight, HelpCircle, Check, Star,
  Link as LinkIcon, Settings, Zap, Scale, Globe,
  Phone, Shield, Database, Workflow
} from "lucide-react";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";

// --- Data ---

const pricingTiers = [
  {
    name: "Starter", price: "$197", period: "/mo",
    description: "For small teams getting started with Five9 automation.",
    features: ["1 Five9 domain", "Up to 25 agents", "CRM field mapping", "10 integrations", "Email support"],
    cta: "Get Started", ctaLink: "/signup", highlighted: false,
  },
  {
    name: "Professional", price: "$497", period: "/mo",
    description: "For growing contact centers that need full automation.",
    features: ["Up to 5 Five9 domains", "Unlimited agents", "AI Call Flow Builder", "Campaign automation", "Legal Connect", "55+ integrations", "Priority support"],
    cta: "Get Started", ctaLink: "/signup", highlighted: true,
  },
  {
    name: "Enterprise", price: "Custom", period: "",
    description: "For BPOs and large organizations with custom needs.",
    features: ["Unlimited domains", "Multi-tenant management", "Custom integrations", "Dedicated onboarding", "SLA and SSO"],
    cta: "Contact Sales", ctaLink: "mailto:hi@fabric59.com", highlighted: false,
  },
];

const faqItems = [
  { question: "What is Fabric59?", answer: "Fabric59 is an all-in-one Five9 integration platform that automates agent onboarding, offboarding, CRM field mapping, and 55+ third-party integrations. It's built specifically for BPOs and contact centers to reduce manual provisioning from hours to minutes." },
  { question: "How does Fabric59 integrate with Five9?", answer: "Fabric59 connects directly to your Five9 domain via SOAP API credentials. It supports 30+ SOAP actions for provisioning agents, managing campaigns, skills, profiles, and DNIS. It also handles call variables, disposition mapping, and pre-call lookup/screen-pop via webhook connectors." },
  { question: "What CRMs does Fabric59 support?", answer: "Fabric59 supports Salesforce, HubSpot, Clio, MyCase, Workiz, Zendesk, and any CRM with a REST API. The Legal Connect module provides deep Clio and MyCase integration with automated contact resolution, matter linking, and disposition-driven writebacks." },
  { question: "How does agent onboarding work?", answer: "Enter the agent's details once, and Fabric59 provisions their accounts across Five9, Google Workspace, and Slack simultaneously. Credentials are auto-generated and delivered securely. The entire process takes under a minute." },
  { question: "What is Legal Connect?", answer: "Legal Connect is our deep integration module for law firms. It connects Five9 calls with Clio and MyCase, providing automated contact lookup, matter linking, disposition-to-action mapping, and a policy engine with field-level allow/block/redact rules." },
  { question: "Is Fabric59 secure?", answer: "Yes. Fabric59 uses AES-256 encryption at rest and TLS 1.3 in transit. We enforce role-based access control with organization-level data isolation, row-level security at the database layer, and maintain full audit trails." },
  { question: "How much does Fabric59 cost?", answer: "Fabric59 offers three plans: Starter at $197/mo, Professional at $497/mo, and Enterprise with custom pricing. Contact hi@fabric59.com for Enterprise pricing." },
  { question: "Can I manage multiple Five9 domains?", answer: "Yes. Fabric59 supports multi-domain management with separate credentials, branding, and IVR settings per domain. The multi-tenant system lets you manage multiple clients from a single dashboard." },
  { question: "What is the AI Call Flow Builder?", answer: "The AI Call Flow Builder lets you design call flows through a chat-driven interface powered by AI. Describe your requirements in plain language, and the system generates a complete call flow. Test with an interactive simulator." },
];

const howItWorksSteps = [
  { icon: LinkIcon, step: "1", title: "Connect Your Five9 Account", description: "Link your Five9 domain credentials and verify the connection in seconds." },
  { icon: Settings, step: "2", title: "Configure Integrations", description: "Set up CRM connectors and use the visual field mapping builder to define data flows." },
  { icon: Zap, step: "3", title: "Automate & Scale", description: "Onboard agents in one click. Data syncs automatically across all connected platforms." },
];

// --- Structured Data ---
const organizationLD = {
  "@context": "https://schema.org", "@type": "Organization",
  name: "Fabric59", url: "https://fabric59.lovable.app",
  description: "Five9 integration platform for agent lifecycle management and CRM field mapping.",
  contactPoint: { "@type": "ContactPoint", email: "hi@fabric59.com", contactType: "customer service" },
  parentOrganization: { "@type": "Organization", name: "UNSOX Digital", url: "https://unsox.com" },
};

const faqLD = {
  "@context": "https://schema.org", "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question", name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const cardReveal = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.15, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="Fabric59 | Five9 Integration Hub for CRM & Agent Lifecycle Management"
        description="Fabric59 automates Five9 agent onboarding, CRM field mapping, Legal Connect for Clio/MyCase, and 55+ integrations for BPOs and contact centers."
        canonical="https://fabric59.lovable.app/"
      />
      <StructuredData data={[organizationLD, faqLD]} />

      <MegaMenuHeader />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          {/* Background effects */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-20%,hsl(var(--primary)/0.15),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,hsl(var(--accent)/0.08),transparent_50%)]" />
          <div className="absolute inset-0" style={{
            backgroundImage: "radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            opacity: 0.3,
          }} />

          <div className="relative max-w-5xl mx-auto text-center px-6 pt-28 pb-20">
            <motion.div custom={0} initial="hidden" animate="visible" variants={fadeUp}>
              <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-xs tracking-wide uppercase border border-primary/30 bg-primary/10 text-primary">
                Five9 Integration Platform
              </Badge>
            </motion.div>

            <motion.h1 custom={1} initial="hidden" animate="visible" variants={fadeUp}
              className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6"
            >
              Automate.{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                Integrate.
              </span>
              <br />
              Scale.
            </motion.h1>

            <motion.p custom={2} initial="hidden" animate="visible" variants={fadeUp}
              className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
            >
              The all-in-one platform for Five9 agent lifecycle management, CRM field mapping, Legal Connect, and 55+ integrations — built for BPOs and contact centers.
            </motion.p>

            <motion.div custom={3} initial="hidden" animate="visible" variants={fadeUp}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Button size="lg" className="gap-2 text-base px-8 h-12 shadow-lg shadow-primary/20" asChild>
                <Link to="/signup">
                  Start Free Trial <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="gap-2 text-base px-8 h-12" asChild>
                <a href="#features">
                  Explore Features <ChevronRight className="h-4 w-4" />
                </a>
              </Button>
            </motion.div>

            {/* Trust badges */}
            <motion.div custom={4} initial="hidden" animate="visible" variants={fadeUp}
              className="flex flex-wrap items-center justify-center gap-6 mt-12 text-xs text-muted-foreground"
            >
              <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-primary" /> AES-256 Encrypted</span>
              <span className="flex items-center gap-1.5"><Database className="h-3.5 w-3.5 text-primary" /> Row-Level Security</span>
              <span className="flex items-center gap-1.5"><Workflow className="h-3.5 w-3.5 text-primary" /> 30+ SOAP Actions</span>
            </motion.div>
          </div>
        </section>

        {/* Logo Carousel */}
        <LogoCarousel />

        {/* Feature Tabs */}
        <FeatureTabs />

        {/* Legal Connect Highlight */}
        <section id="legal-connect" className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,hsl(var(--primary)/0.06),transparent_60%)]" />
          <div className="relative max-w-6xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                <Badge className="mb-4 bg-accent/10 text-accent border-accent/30">Legal Connect</Badge>
                <h2 className="text-3xl font-bold mb-4">Deep Clio & MyCase Integration</h2>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Purpose-built for legal intake contact centers. Automate contact resolution, matter linking, and disposition-driven CRM writebacks with a policy engine that enforces field-level rules.
                </p>
                <div className="space-y-4">
                  {[
                    { icon: Phone, text: "Pre-call ANI lookup with automatic contact matching" },
                    { icon: Scale, text: "Disposition → CRM action mapping with configurable rules" },
                    { icon: Shield, text: "Policy engine: allow, block, or redact fields per campaign" },
                    { icon: Globe, text: "Webhook sync with retry logic and dead-letter handling" },
                  ].map((item) => (
                    <div key={item.text} className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                        <item.icon className="h-4 w-4 text-accent" />
                      </div>
                      <span className="text-sm text-foreground">{item.text}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                className="aspect-square rounded-2xl bg-gradient-to-br from-accent/10 via-primary/5 to-transparent border border-border/30 flex items-center justify-center"
              >
                <div className="text-center p-8">
                  <Scale className="h-20 w-20 text-accent/30 mx-auto mb-4" />
                  <div className="text-sm font-medium text-muted-foreground">Legal Connect Dashboard</div>
                  <div className="mt-4 space-y-2 max-w-xs mx-auto">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-card/50 border border-border/30 text-xs text-muted-foreground">
                      <div className="h-2 w-2 rounded-full bg-success" /> Contact resolved → Clio
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-card/50 border border-border/30 text-xs text-muted-foreground">
                      <div className="h-2 w-2 rounded-full bg-primary" /> Matter linked → #2847
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-card/50 border border-border/30 text-xs text-muted-foreground">
                      <div className="h-2 w-2 rounded-full bg-accent" /> Communication created
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Five9 Deep Integration */}
        <section id="five9" className="py-20">
          <div className="max-w-6xl mx-auto px-6">
            <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
              <Badge className="mb-4 bg-primary/10 text-primary border-primary/30">Five9 Integration</Badge>
              <h2 className="text-3xl font-bold mb-3">Deep Five9 SOAP API Integration</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">30+ SOAP actions for full programmatic control of your Five9 domains.</p>
            </motion.div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { title: "Agent Provisioning", desc: "Create, update, and remove agents with skill and campaign assignments" },
                { title: "Campaign Management", desc: "Create campaigns, manage DNIS, configure IVR scripts programmatically" },
                { title: "Skill & Profile Setup", desc: "Auto-create skills and profiles during campaign provisioning" },
                { title: "Call Variable Management", desc: "Define and map call variables for screen-pop and data capture" },
                { title: "Pre-Call Lookup", desc: "ANI/DNIS lookup endpoint for real-time contact resolution before call connect" },
                { title: "Web Connector Config", desc: "Configure Five9 web connectors for webhook-based integrations" },
              ].map((item, i) => (
                <motion.div key={item.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                  <Card className="border-border/40 bg-card/50 h-full hover:border-primary/30 transition-colors">
                    <CardContent className="p-5">
                      <h3 className="font-semibold text-sm mb-1.5">{item.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats Counter */}
        <StatsCounter />

        {/* How It Works */}
        <section id="how-it-works" className="max-w-5xl mx-auto px-6 py-20">
          <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">How It Works</h2>
            <p className="text-muted-foreground">Get up and running in three simple steps.</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-7 left-[16.67%] right-[16.67%] h-px bg-gradient-to-r from-primary/30 via-primary/50 to-primary/30" />
            {howItWorksSteps.map((s, i) => (
              <motion.div key={s.step} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={cardReveal} className="text-center relative">
                <div className="h-14 w-14 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center mx-auto mb-5 relative z-10 bg-background">
                  <s.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Step {s.step}</div>
                <h3 className="font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <TestimonialCards />

        {/* Pricing */}
        <section id="pricing" className="max-w-5xl mx-auto px-6 py-20">
          <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Simple, Transparent Pricing</h2>
            <p className="text-muted-foreground">Choose the plan that fits your contact center.</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {pricingTiers.map((tier, i) => (
              <motion.div key={tier.name} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={cardReveal}>
                <Card className={`h-full relative ${tier.highlighted ? "border-primary shadow-lg shadow-primary/10" : "border-border/60"}`}>
                  {tier.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="gap-1 bg-primary text-primary-foreground"><Star className="h-3 w-3" fill="currentColor" /> Most Popular</Badge>
                    </div>
                  )}
                  <CardContent className="p-8 flex flex-col h-full">
                    <h3 className="text-lg font-semibold mb-1">{tier.name}</h3>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-3xl font-extrabold">{tier.price}</span>
                      {tier.period && <span className="text-muted-foreground text-sm">{tier.period}</span>}
                    </div>
                    <p className="text-sm text-muted-foreground mb-6">{tier.description}</p>
                    <ul className="space-y-3 mb-8 flex-1">
                      {tier.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Button className="w-full" variant={tier.highlighted ? "default" : "outline"} asChild>
                      {tier.ctaLink.startsWith("mailto:") ? <a href={tier.ctaLink}>{tier.cta}</a> : <Link to={tier.ctaLink}>{tier.cta}</Link>}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="max-w-3xl mx-auto px-6 py-20">
          <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="flex items-center justify-center gap-3 mb-10">
            <HelpCircle className="h-6 w-6 text-primary" />
            <h2 className="text-3xl font-bold">FAQ</h2>
          </motion.div>
          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-base font-medium">{item.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* Lead Capture CTA */}
        <LeadCaptureBar />
      </main>

      <MegaFooter />
    </div>
  );
}
