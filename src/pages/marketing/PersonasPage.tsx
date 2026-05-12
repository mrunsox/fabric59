import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { ArrowRight, Scale, Headphones, ShieldCheck, Building2 } from "lucide-react";

const PERSONAS = [
  {
    icon: Scale,
    title: "Law firms running intake on Five9",
    pitch:
      "Five9 + canonical Fabric59 workspace + MyCase / Clio adapters. Intake agents work from one console; outcomes flow into the right matter automatically.",
    bullets: [
      "Per-disposition routing into MyCase / Clio",
      "Decision-tree intake guides with version history",
      "Dispositions, callbacks and ANI block lists managed in one place",
    ],
    cta: "/contact",
  },
  {
    icon: Headphones,
    title: "BPOs and call centers on Five9",
    pitch:
      "One workspace per client, shared Five9 domain, tenant-scoped guides, QA, and analytics. No more spreadsheet-driven client management.",
    bullets: [
      "Workspace-per-client isolation with RLS",
      "Supervisor live ops + QA review queue",
      "Workspace analytics + honest billing shell",
    ],
    cta: "/contact",
  },
  {
    icon: ShieldCheck,
    title: "Design partners and pilots",
    pitch:
      "Hands-on rollout with a concierge onboarding checklist, workspace bootstrap, pilot guardrails, feedback drawer, and What's New release notes.",
    bullets: [
      "Per-tenant rate limits and tenant health view",
      "Pilot readiness state + safe-mode toggle",
      "Direct feedback channel into the Fabric59 team",
    ],
    cta: "/contact",
  },
  {
    icon: Building2,
    title: "Platform / superadmins",
    pitch:
      "Multi-org governance, vault, source exports, advanced routes, design-partner ops, and the canonical build doc — all under /superadmin.",
    bullets: [
      "Master-admin gated /superadmin shell",
      "Feature vault + source exports",
      "Canonical build doc at /outline (master only)",
    ],
    cta: "/login",
  },
];

export default function PersonasPage() {
  return (
    <MarketingLayout
      title="Who Fabric59 is for | Personas"
      description="Fabric59 is built for law firms, BPOs, and design partners running intake and operations on Five9 with canonical CRM integration."
    >
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto text-center mb-14">
          <Badge variant="outline" className="border-primary/40 text-primary mb-4">
            Personas
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Built for the teams running Five9 in the real world
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            Fabric59 is opinionated. It is not a generic SaaS shell — it is the canonical operating
            layer for legal intake, BPO call operations, and design-partner pilots on Five9.
          </p>
        </div>

        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-6">
          {PERSONAS.map((p) => (
            <Card key={p.title} className="h-full">
              <CardContent className="p-6 space-y-4">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                  <p.icon className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-lg font-semibold">{p.title}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{p.pitch}</p>
                <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
                  {p.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
                <Button asChild size="sm" variant="outline" className="gap-1.5">
                  <Link to={p.cta}>
                    Talk to us <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="max-w-3xl mx-auto mt-14 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Not sure which fits? See solutions by use case.
          </p>
          <div className="flex justify-center gap-3">
            <Button asChild variant="outline">
              <Link to="/solutions">Solutions</Link>
            </Button>
            <Button asChild>
              <Link to="/pricing">See pricing</Link>
            </Button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
