import { Link } from "react-router-dom";
import { ArrowRight, Calendar, Phone, Workflow, ShieldCheck } from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";
import { MegaMenuHeader } from "@/components/marketing/MegaMenuHeader";
import { MegaFooter } from "@/components/marketing/MegaFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const agenda = [
  {
    icon: Calendar,
    title: "1. Quick scoping (15 min)",
    desc: "We learn about your Five9 footprint, CRMs (MyCase / Clio / other), and intake workflows.",
  },
  {
    icon: Phone,
    title: "2. Live walkthrough (30 min)",
    desc: "We show the real Fabric59 platform: Five9 SOAP integration, field mapping with Test runner, decision-tree scripting, multi-tenant ops, and the Five9 → CRM bridge.",
  },
  {
    icon: Workflow,
    title: "3. Tailored next steps",
    desc: "If it's a fit, we propose a rollout plan and scope. If it's not, we'll tell you straight.",
  },
];

export default function DemoSandboxPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="Live Demo | Fabric59"
        description="A live guided demo of Fabric59 — the real platform, walked through with you. Not a fake sandbox."
        canonical="https://fabric59.com/demo"
      />

      <MegaMenuHeader />

      <main className="max-w-4xl mx-auto px-6 py-20">
        <header className="text-center mb-12">
          <Badge variant="secondary" className="mb-4 border border-primary/30 bg-primary/10 text-primary">
            Live demo
          </Badge>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            We don't do fake sandboxes
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl mx-auto">
            Fabric59 demos are a live, founder-led walkthrough of the real product against real Five9 and CRM behaviour. About 45 minutes, on Zoom.
          </p>
        </header>

        <div className="space-y-4 mb-12">
          {agenda.map((step) => (
            <Card key={step.title} className="border-border/50">
              <CardContent className="p-6 flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <step.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold mb-1">{step.title}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-border/50 bg-muted/30 mb-10">
          <CardContent className="p-6 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              We will only show you what is shipped today. Anything in progress will be clearly labeled <strong>Coming soon</strong>.
            </p>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button size="lg" className="gap-2" asChild>
            <Link to="/contact">
              Request a walkthrough <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </main>

      <MegaFooter />
    </div>
  );
}
