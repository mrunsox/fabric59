import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Fabric59Logo } from "@/components/brand/Fabric59Logo";
import { Fabric59Icon } from "@/components/brand/Fabric59Icon";
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
} from "lucide-react";

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

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <Fabric59Logo iconSize="md" />
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
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

      {/* Hero */}
      <section className="max-w-4xl mx-auto text-center px-6 pt-24 pb-16">
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
      <section className="max-w-5xl mx-auto px-6 pb-20">
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
                    <card.icon className="h-6 w-6 text-primary" />
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
      <section id="features" className="max-w-5xl mx-auto px-6 pb-24">
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
                    <f.icon className="h-5 w-5 text-primary" />
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

      {/* Footer */}
      <footer className="border-t border-border/40 py-10">
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
              >
                <Heart
                  className="h-4 w-4 text-orange-500 animate-pulse group-hover/heart:animate-heart-pop"
                  fill="currentColor"
                />
              </a>
            </span>
          </div>
          <nav className="flex items-center gap-5 flex-wrap justify-center text-sm text-muted-foreground">
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
