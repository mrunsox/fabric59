import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Fabric59Logo } from "@/components/brand/Fabric59Logo";
import { Fabric59Icon } from "@/components/brand/Fabric59Icon";
import { SEOHead } from "@/components/seo/SEOHead";
import { StructuredData } from "@/components/seo/StructuredData";
import { motion } from "framer-motion";
import {
  Users,
  UserCog,
  GitBranch,
  Plug,
  BarChart3,
  ArrowRight,
  ChevronRight,
  Heart,
  MapPin,
  Link as LinkIcon,
  Settings,
  Zap,
  HelpCircle,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// --- Data ---

const featureCards = [
  {
    icon: Users,
    title: "Agent Onboarding & Offboarding",
    description:
      "Provision agents across Five9, Google Workspace, and Slack in one click. Automate deprovisioning with grace periods, data transfers, and full audit trails.",
  },
  {
    icon: MapPin,
    title: "CRM Integration & Field Mapping",
    description:
      "Visual drag-and-drop builder to map Five9 contact fields to any CRM. Support for Clio, Workiz, Salesforce, HubSpot, and more with transformation logic built in.",
  },
];

const platformFeatures = [
  {
    icon: UserCog,
    title: "Agent Lifecycle",
    description:
      "One-click provisioning and deprovisioning across Five9, Google Workspace, and Slack with automated credential delivery.",
  },
  {
    icon: GitBranch,
    title: "Field Mapping Builder",
    description:
      "Visual canvas to connect Five9 contact fields to any CRM with drag-and-drop simplicity and custom transforms.",
  },
  {
    icon: Plug,
    title: "55+ Integrations",
    description:
      "Pre-built connectors for Salesforce, HubSpot, Slack, Twilio, Zapier, and dozens more — ready to configure.",
  },
  {
    icon: BarChart3,
    title: "Monitoring & Alerts",
    description:
      "Real-time API logs, error tracking, and a built-in test console for every integration request.",
  },
];

const howItWorksSteps = [
  {
    icon: LinkIcon,
    step: "1",
    title: "Connect Your Five9 Account",
    description: "Link your Five9 domain credentials and verify the connection in seconds.",
  },
  {
    icon: Settings,
    step: "2",
    title: "Configure Integrations & Map Fields",
    description:
      "Set up CRM connectors and use the visual field mapping builder to define data flows.",
  },
  {
    icon: Zap,
    step: "3",
    title: "Automate & Scale",
    description:
      "Onboard and offboard agents in one click. Data syncs automatically across all connected platforms.",
  },
];

const faqItems = [
  {
    question: "What is Fabric59?",
    answer:
      "Fabric59 is an all-in-one Five9 integration platform that automates agent onboarding, offboarding, CRM field mapping, and 55+ third-party integrations. It's built specifically for BPOs and contact centers to reduce manual provisioning from hours to minutes.",
  },
  {
    question: "How does Fabric59 integrate with Five9?",
    answer:
      "Fabric59 connects directly to your Five9 domain via API credentials. Once connected, it can provision and deprovision agents, sync contact data, manage skills and campaigns, and push data to connected CRM systems — all from a single dashboard.",
  },
  {
    question: "What CRMs does Fabric59 support?",
    answer:
      "Fabric59 supports Salesforce, HubSpot, Clio, Workiz, Zendesk, and any CRM with a REST API. The visual field mapping builder lets you map Five9 contact fields to any CRM with custom transformation logic.",
  },
  {
    question: "How does agent onboarding work?",
    answer:
      "Enter the agent's details once, and Fabric59 provisions their accounts across Five9, Google Workspace, and Slack simultaneously. Credentials are auto-generated and delivered securely. The entire process takes under a minute.",
  },
  {
    question: "Is Fabric59 secure?",
    answer:
      "Yes. Fabric59 uses AES-256 encryption at rest and TLS 1.3 in transit. We enforce role-based access control (RBAC) with organization-level data isolation, row-level security at the database layer, and maintain full audit trails for all actions.",
  },
  {
    question: "How much does Fabric59 cost?",
    answer:
      "Fabric59 offers flexible plans for teams of all sizes, from free starter plans to enterprise tiers with custom integrations and dedicated support. Contact us at hi@fabric59.com for pricing details.",
  },
];

// --- Structured Data ---

const organizationLD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Fabric59",
  url: "https://fabric59.lovable.app",
  logo: "https://fabric59.lovable.app/fabric59-icon.png",
  description:
    "Five9 integration platform for agent lifecycle management and CRM field mapping.",
  contactPoint: {
    "@type": "ContactPoint",
    email: "hi@fabric59.com",
    contactType: "customer service",
  },
  parentOrganization: {
    "@type": "Organization",
    name: "UNSOX Digital",
    url: "https://unsox.com",
  },
};

const softwareLD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Fabric59",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "All-in-one platform for Five9 agent lifecycle management, CRM field mapping, and 55+ integrations — built for BPOs and contact centers.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Free tier available. Enterprise plans available.",
  },
  url: "https://fabric59.lovable.app",
};

const faqLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

// --- Animations ---

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const cardReveal = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

// --- Component ---

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="Fabric59 | Five9 Integration Hub for CRM & Agent Lifecycle Management"
        description="Fabric59 automates Five9 agent onboarding, offboarding, CRM field mapping, and 55+ integrations for BPOs and contact centers."
        canonical="https://fabric59.lovable.app/"
      />
      <StructuredData data={[organizationLD, softwareLD, faqLD]} />

      {/* Header */}
      <header role="banner" className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <Fabric59Logo iconSize="md" />
          <nav aria-label="Main navigation" className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">
              How It Works
            </a>
            <a href="#faq" className="hover:text-foreground transition-colors">
              FAQ
            </a>
            <Link to="/outline" className="hover:text-foreground transition-colors">
              Build Outline
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Login</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section aria-label="Hero" className="max-w-4xl mx-auto text-center px-6 pt-24 pb-16">
          <motion.div custom={0} initial="hidden" animate="visible" variants={fadeUp}>
            <Badge
              variant="secondary"
              className="mb-6 px-4 py-1.5 text-xs tracking-wide uppercase border border-primary/30 bg-primary/10 text-primary"
            >
              Five9 Integration Platform
            </Badge>
          </motion.div>

          <motion.h1
            custom={1}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6"
          >
            Automate.{" "}
            <span className="text-primary">Integrate.</span>
            <br />
            Scale.
          </motion.h1>

          <motion.p
            custom={2}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            The all-in-one platform for Five9 agent lifecycle management, CRM
            field mapping, and 55+ integrations — built for BPOs and contact
            centers.
          </motion.p>

          <motion.div
            custom={3}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button size="lg" className="gap-2 text-base px-8" asChild>
              <Link to="/signup">
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="gap-2 text-base px-8" asChild>
              <Link to="/outline">
                View Build Outline <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </section>

        {/* Feature Cards */}
        <section aria-label="Key features" className="max-w-5xl mx-auto px-6 pb-20">
          <div className="grid md:grid-cols-2 gap-6">
            {featureCards.map((card, i) => (
              <motion.div
                key={card.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={cardReveal}
              >
                <Card className="group border-border/60 bg-card hover:border-primary/40 transition-colors h-full">
                  <CardContent className="p-8">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-5">
                      <card.icon className="h-6 w-6 text-primary" aria-hidden="true" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3">{card.title}</h3>
                    <p className="text-muted-foreground leading-relaxed mb-6">
                      {card.description}
                    </p>
                    <Button variant="ghost" size="sm" className="gap-1 px-0 text-primary" asChild>
                      <Link to="/signup">
                        Get Started <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Trust bar */}
        <motion.section
          aria-label="Social proof"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center pb-16"
        >
          <p className="text-sm text-muted-foreground tracking-wide">
            Trusted by <span className="text-foreground font-medium">50+</span>{" "}
            contact centers and BPOs nationwide
          </p>
        </motion.section>

        {/* Platform Features */}
        <section id="features" aria-label="Platform features" className="max-w-5xl mx-auto px-6 pb-24">
          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-2xl font-bold text-center mb-12"
          >
            Built for Five9 teams that need to move fast
          </motion.h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {platformFeatures.map((f, i) => (
              <motion.div
                key={f.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-30px" }}
                variants={cardReveal}
              >
                <Card className="border-border/40 bg-card/50 h-full">
                  <CardContent className="p-6">
                    <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                      <f.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                    </div>
                    <h3 className="font-semibold mb-2">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {f.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" aria-label="How it works" className="max-w-4xl mx-auto px-6 pb-24">
          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-2xl font-bold text-center mb-4"
          >
            How It Works
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-muted-foreground text-center mb-12 max-w-xl mx-auto"
          >
            Get up and running in three simple steps.
          </motion.p>
          <div className="grid md:grid-cols-3 gap-8">
            {howItWorksSteps.map((s, i) => (
              <motion.div
                key={s.step}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-30px" }}
                variants={cardReveal}
                className="text-center"
              >
                <div className="h-14 w-14 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center mx-auto mb-5">
                  <s.icon className="h-6 w-6 text-primary" aria-hidden="true" />
                </div>
                <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">
                  Step {s.step}
                </div>
                <h3 className="font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" aria-label="Frequently asked questions" className="max-w-3xl mx-auto px-6 pb-24">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-center gap-3 mb-10"
          >
            <HelpCircle className="h-6 w-6 text-primary" aria-hidden="true" />
            <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((item, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-left text-base font-medium">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer role="contentinfo" className="border-t border-border/40 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3 flex-wrap justify-center md:justify-start">
            <Fabric59Icon size="sm" />
            <span className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Fabric59
            </span>
            <span className="text-border">|</span>
            <span className="text-sm text-muted-foreground flex items-center gap-1.5">
              An UNSOX Digital Solution
              <a
                href="https://unsox.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex group/heart"
                aria-label="Visit UNSOX Digital"
              >
                <Heart
                  className="h-4 w-4 text-orange-500 animate-pulse group-hover/heart:animate-heart-pop"
                  fill="currentColor"
                  aria-hidden="true"
                />
              </a>
            </span>
          </div>
          <nav aria-label="Footer navigation" className="flex items-center gap-5 flex-wrap justify-center text-sm text-muted-foreground">
            <Link to="/login" className="hover:text-foreground transition-colors">
              Login
            </Link>
            <Link to="/outline" className="hover:text-foreground transition-colors">
              Build Outline
            </Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link to="/security" className="hover:text-foreground transition-colors">
              Security
            </Link>
            <a href="mailto:hi@fabric59.com" className="hover:text-foreground transition-colors">
              Contact
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
