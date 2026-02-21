import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Fabric59Logo } from "@/components/brand/Fabric59Logo";
import { Fabric59Icon } from "@/components/brand/Fabric59Icon";
import {
  Phone,
  Users,
  UserCog,
  GitBranch,
  Plug,
  BarChart3,
  ArrowRight,
  ChevronRight,
} from "lucide-react";

const featureCards = [
  {
    icon: Phone,
    title: "Launch Your Call Center",
    description:
      "We build your entire Five9 environment from scratch — IVR trees, skills, campaigns, dispositions, and agent provisioning — so you're live in days, not months.",
  },
  {
    icon: Users,
    title: "Scale Your Client Onboarding",
    description:
      "For BPOs and outsourcers adding new clients fast. We configure dedicated domains, map CRM fields, and automate agent lifecycle — all through one platform.",
  },
];

const platformFeatures = [
  {
    icon: UserCog,
    title: "Agent Lifecycle Management",
    description:
      "Provision and deprovision agents across Five9, Google Workspace, and Slack with one click.",
  },
  {
    icon: GitBranch,
    title: "Field Mapping Builder",
    description:
      "Visual drag-and-drop canvas to map Five9 contact fields to any CRM with transformation logic.",
  },
  {
    icon: Plug,
    title: "Integrations Library",
    description:
      "55+ pre-built connectors for CRMs, helpdesks, communication tools, and automation platforms.",
  },
  {
    icon: BarChart3,
    title: "Monitoring & Logs",
    description:
      "Real-time API logs, error alerting, and a test console for every inbound and outbound request.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <Fabric59Logo iconSize="sm" />
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
        <Badge
          variant="secondary"
          className="mb-6 px-4 py-1.5 text-xs tracking-wide uppercase border border-primary/30 bg-primary/10 text-primary"
        >
          Five9 Build &amp; Managed Services
        </Badge>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6">
          Your Five9.{" "}
          <span className="text-primary">Built Right.</span>
          <br />
          Delivered Fast.
        </h1>

        <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Full-service Five9 implementation, CRM integration, and agent
          lifecycle management — from first IVR to production launch.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
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
        </div>
      </section>

      {/* Feature Cards */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid md:grid-cols-2 gap-6">
          {featureCards.map((card) => (
            <Card
              key={card.title}
              className="group border-border/60 bg-card hover:border-primary/40 transition-colors"
            >
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
          ))}
        </div>
      </section>

      {/* Trust bar */}
      <section className="text-center pb-16">
        <p className="text-sm text-muted-foreground tracking-wide">
          Trusted by <span className="text-foreground font-medium">50+</span>{" "}
          contact centers and BPOs nationwide
        </p>
      </section>

      {/* Platform Features */}
      <section id="features" className="max-w-5xl mx-auto px-6 pb-24">
        <h2 className="text-2xl font-bold text-center mb-12">
          Everything you need to run Five9 at scale
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {platformFeatures.map((f) => (
            <Card key={f.title} className="border-border/40 bg-card/50">
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
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Fabric59Icon size="sm" />
            <span className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Fabric59
            </span>
          </div>
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/login" className="hover:text-foreground transition-colors">
              Login
            </Link>
            <Link to="/outline" className="hover:text-foreground transition-colors">
              Build Outline
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
